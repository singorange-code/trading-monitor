import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import WebSocket from 'ws';
import cron from 'node-cron';

import { logger } from './utils/logger';
import config from './config';
import { DataCollector } from './services/DataCollector';
import { OpportunityEngine } from './services/OpportunityEngine';
import { RiskAssessor } from './services/RiskAssessor';
import { AlertClassifier } from './services/AlertClassifier';
import { DeduplicationCooler } from './services/DeduplicationCooler';
import { NotificationService } from './services/NotificationService';
import { SnapshotStorage } from './services/SnapshotStorage';
import { HealthMonitor } from './services/HealthMonitor';
import { WebSocketService } from './services/WebSocketService';

// Routes
import snapshotsRouter from './routes/snapshots';
import configRouter from './routes/config';
import healthRouter from './routes/health';
import notificationsRouter from './routes/notifications';

export class CloudTradingMonitor {
  private app: express.Application;
  private server: any;
  private wss: WebSocket.Server;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Services
  private dataCollector!: DataCollector;
  private opportunityEngine!: OpportunityEngine;
  private riskAssessor!: RiskAssessor;
  private alertClassifier!: AlertClassifier;
  private deduplicationCooler!: DeduplicationCooler;
  private notificationService!: NotificationService;
  private snapshotStorage!: SnapshotStorage;
  private healthMonitor!: HealthMonitor;
  private webSocketService!: WebSocketService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private initializeServices(): void {
    this.dataCollector = new DataCollector();
    this.opportunityEngine = new OpportunityEngine();
    this.riskAssessor = new RiskAssessor();
    this.alertClassifier = new AlertClassifier();
    this.deduplicationCooler = new DeduplicationCooler();
    this.notificationService = new NotificationService();
    this.snapshotStorage = new SnapshotStorage();
    this.healthMonitor = new HealthMonitor();
    this.webSocketService = new WebSocketService(this.wss);
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((_req, _res, next) => {
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/snapshots', snapshotsRouter);
    this.app.use('/api/config', configRouter);
    this.app.use('/api/health', healthRouter);
    this.app.use('/api/notifications', notificationsRouter);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'Cloud Trading Monitor',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });
  }
  private setupErrorHandling(): void {
    this.app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  private setupWebSocket(): void {
    // WebSocket服务现在由WebSocketService处理
    logger.info('WebSocket service initialized');
  }

  async startMonitoring(): Promise<void> {
    try {
      logger.info('Starting market monitoring...');
      
      // 立即执行一次监控
      await this.performMonitoringCycle();
      
      // 设置定时监控
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performMonitoringCycle();
        } catch (error) {
          logger.error('Monitoring cycle failed:', error);
          this.healthMonitor.incrementErrorCount();
        }
      }, config.monitoring.interval * 1000);

      logger.info(`Monitoring started with ${config.monitoring.interval}s interval`);
    } catch (error) {
      logger.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  private async performMonitoringCycle(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting monitoring cycle for ${config.monitoring.symbols.length} symbols...`);
      
      // 收集市场数据 - 并行处理但限制并发数
      const marketDataMap = new Map();
      const batchSize = 5; // 每批处理5个符号，避免API限制
      
      for (let i = 0; i < config.monitoring.symbols.length; i += batchSize) {
        const batch = config.monitoring.symbols.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const marketData = await this.dataCollector.collectMarketData(symbol);
            return { symbol, marketData, success: true };
          } catch (error) {
            logger.error(`Failed to collect data for ${symbol}:`, error);
            this.healthMonitor.incrementErrorCount();
            return { symbol, marketData: null, success: false };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // 处理批次结果
        for (const result of batchResults) {
          if (result.success && result.marketData) {
            marketDataMap.set(result.symbol, result.marketData);
            this.healthMonitor.updateDataTimestamp();
          }
        }
        
        // 批次间短暂延迟，避免API限制
        if (i + batchSize < config.monitoring.symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 分析机会
      const allOpportunities = [];
      for (const [symbol, marketData] of marketDataMap) {
        try {
          const opportunities = await this.opportunityEngine.analyzeMarket(marketData);
          allOpportunities.push(...opportunities);
        } catch (error) {
          logger.error(`Analysis failed for ${symbol}:`, error);
        }
      }

      // 风险评估
      const validOpportunities = [];
      for (const opportunity of allOpportunities) {
        try {
          const riskAssessment = await this.riskAssessor.assessRisk(opportunity);
          if (riskAssessment.isAcceptable) {
            validOpportunities.push(opportunity);
          }
        } catch (error) {
          logger.error('Risk assessment failed:', error);
        }
      }

      // 分级和去重
      const processedAlerts = [];
      for (const opportunity of validOpportunities) {
        try {
          const classifiedAlert = await this.alertClassifier.classifyAlert(opportunity);
          const shouldNotify = await this.deduplicationCooler.shouldNotify(classifiedAlert);
          
          if (shouldNotify) {
            processedAlerts.push(classifiedAlert);
          }
        } catch (error) {
          logger.error('Alert processing failed:', error);
        }
      }

      // 发送通知
      for (const alert of processedAlerts) {
        try {
          await this.sendNotification(alert);
        } catch (error) {
          logger.error('Notification failed:', error);
        }
      }

      const duration = Date.now() - startTime;
      const successfulSymbols = marketDataMap.size;
      const totalSymbols = config.monitoring.symbols.length;
      
      logger.info(`Monitoring cycle completed in ${duration}ms`, {
        duration,
        symbolsProcessed: `${successfulSymbols}/${totalSymbols}`,
        opportunities: allOpportunities.length,
        alerts: processedAlerts.length,
        avgTimePerSymbol: Math.round(duration / totalSymbols)
      });
      
      // 广播状态更新
      this.webSocketService.broadcastStatus({
        cycleTime: duration,
        opportunities: allOpportunities.length,
        alerts: processedAlerts.length,
        symbols: successfulSymbols,
        totalSymbols: totalSymbols,
        successRate: Math.round((successfulSymbols / totalSymbols) * 100),
        avgTimePerSymbol: Math.round(duration / totalSymbols)
      });

    } catch (error) {
      logger.error('Monitoring cycle failed:', error);
      this.healthMonitor.incrementErrorCount();
    }
  }

  private async sendNotification(alert: any): Promise<void> {
    try {
      // 保存快照
      const marketData = {}; // 简化实现
      const snapshotId = await this.snapshotStorage.saveSnapshot(alert.opportunity, marketData);
      alert.opportunity.snapshotId = snapshotId;

      // 发送邮件通知
      await this.notificationService.sendAlert(alert);
      this.healthMonitor.incrementAlertCount();

      // 广播给WebSocket客户端
      this.webSocketService.broadcastOpportunity(alert.opportunity, alert.level);

      logger.info(`Notification sent for ${alert.opportunity.symbol} ${alert.level}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Cloud Trading Monitor...');

      // 验证配置
      const configErrors = require('./config').validateConfig();
      if (configErrors.length > 0) {
        throw new Error(`Configuration errors: ${configErrors.join(', ')}`);
      }

      // 测试邮件服务
      const emailTest = await this.notificationService.testConnection();
      if (!emailTest) {
        logger.warn('Email service test failed, notifications may not work');
      }

      // 启动HTTP服务器 - 绑定到 0.0.0.0 以便 Render 检测端口
      await new Promise<void>((resolve, reject) => {
        this.server.listen(config.server.port, '0.0.0.0', () => {
          logger.info(`Server started on 0.0.0.0:${config.server.port}`);
          resolve();
        }).on('error', (err: Error) => {
          reject(err);
        });
      });

      // 启动监控
      await this.startMonitoring();

      // 设置清理任务
      cron.schedule('0 */6 * * *', async () => {
        await this.deduplicationCooler.cleanupExpiredEntries();
        await this.snapshotStorage.cleanupOldSnapshots();
      });

      logger.info('Cloud Trading Monitor started successfully');
      logger.info(`Monitoring symbols: ${config.monitoring.symbols.join(', ')}`);
      logger.info(`Monitoring interval: ${config.monitoring.interval}s`);

    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping Cloud Trading Monitor...');

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      this.wss.close();
      
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          logger.info('Server stopped');
          resolve();
        });
      });

      this.healthMonitor.shutdown();
      this.webSocketService.shutdown();
      
      logger.info('Cloud Trading Monitor stopped');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }
}

// 启动服务器
if (require.main === module) {
  const monitor = new CloudTradingMonitor();
  
  monitor.start().catch((error) => {
    logger.error('Failed to start monitor:', error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    try {
      await monitor.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    try {
      await monitor.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
}

export default CloudTradingMonitor;