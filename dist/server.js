"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudTradingMonitor = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const ws_1 = __importDefault(require("ws"));
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("./utils/logger");
const config_1 = __importDefault(require("./config"));
const DataCollector_1 = require("./services/DataCollector");
const OpportunityEngine_1 = require("./services/OpportunityEngine");
const RiskAssessor_1 = require("./services/RiskAssessor");
const AlertClassifier_1 = require("./services/AlertClassifier");
const DeduplicationCooler_1 = require("./services/DeduplicationCooler");
const NotificationService_1 = require("./services/NotificationService");
const SnapshotStorage_1 = require("./services/SnapshotStorage");
const HealthMonitor_1 = require("./services/HealthMonitor");
const WebSocketService_1 = require("./services/WebSocketService");
// Routes
const snapshots_1 = __importDefault(require("./routes/snapshots"));
const config_2 = __importDefault(require("./routes/config"));
const health_1 = __importDefault(require("./routes/health"));
const notifications_1 = __importDefault(require("./routes/notifications"));
class CloudTradingMonitor {
    app;
    server;
    wss;
    monitoringInterval = null;
    // Services
    dataCollector;
    opportunityEngine;
    riskAssessor;
    alertClassifier;
    deduplicationCooler;
    notificationService;
    snapshotStorage;
    healthMonitor;
    webSocketService;
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.wss = new ws_1.default.Server({ server: this.server });
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }
    initializeServices() {
        this.dataCollector = new DataCollector_1.DataCollector();
        this.opportunityEngine = new OpportunityEngine_1.OpportunityEngine();
        this.riskAssessor = new RiskAssessor_1.RiskAssessor();
        this.alertClassifier = new AlertClassifier_1.AlertClassifier();
        this.deduplicationCooler = new DeduplicationCooler_1.DeduplicationCooler();
        this.notificationService = new NotificationService_1.NotificationService();
        this.snapshotStorage = new SnapshotStorage_1.SnapshotStorage();
        this.healthMonitor = new HealthMonitor_1.HealthMonitor();
        this.webSocketService = new WebSocketService_1.WebSocketService(this.wss);
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)());
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        this.app.use((_req, _res, next) => {
            next();
        });
    }
    setupRoutes() {
        // API routes
        this.app.use('/api/snapshots', snapshots_1.default);
        this.app.use('/api/config', config_2.default);
        this.app.use('/api/health', health_1.default);
        this.app.use('/api/notifications', notifications_1.default);
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
    setupErrorHandling() {
        this.app.use((err, _req, res, _next) => {
            logger_1.logger.error('Unhandled error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: err.message
            });
        });
    }
    setupWebSocket() {
        // WebSocket服务现在由WebSocketService处理
        logger_1.logger.info('WebSocket service initialized');
    }
    async startMonitoring() {
        try {
            logger_1.logger.info('Starting market monitoring...');
            // 立即执行一次监控
            await this.performMonitoringCycle();
            // 设置定时监控
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.performMonitoringCycle();
                }
                catch (error) {
                    logger_1.logger.error('Monitoring cycle failed:', error);
                    this.healthMonitor.incrementErrorCount();
                }
            }, config_1.default.monitoring.interval * 1000);
            logger_1.logger.info(`Monitoring started with ${config_1.default.monitoring.interval}s interval`);
        }
        catch (error) {
            logger_1.logger.error('Failed to start monitoring:', error);
            throw error;
        }
    }
    async performMonitoringCycle() {
        const startTime = Date.now();
        try {
            logger_1.logger.info(`Starting monitoring cycle for ${config_1.default.monitoring.symbols.length} symbols...`);
            // 收集市场数据 - 并行处理但限制并发数
            const marketDataMap = new Map();
            const batchSize = 5; // 每批处理5个符号，避免API限制
            for (let i = 0; i < config_1.default.monitoring.symbols.length; i += batchSize) {
                const batch = config_1.default.monitoring.symbols.slice(i, i + batchSize);
                const batchPromises = batch.map(async (symbol) => {
                    try {
                        const marketData = await this.dataCollector.collectMarketData(symbol);
                        return { symbol, marketData, success: true };
                    }
                    catch (error) {
                        logger_1.logger.error(`Failed to collect data for ${symbol}:`, error);
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
                if (i + batchSize < config_1.default.monitoring.symbols.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            // 分析机会
            const allOpportunities = [];
            for (const [symbol, marketData] of marketDataMap) {
                try {
                    const opportunities = await this.opportunityEngine.analyzeMarket(marketData);
                    allOpportunities.push(...opportunities);
                }
                catch (error) {
                    logger_1.logger.error(`Analysis failed for ${symbol}:`, error);
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
                }
                catch (error) {
                    logger_1.logger.error('Risk assessment failed:', error);
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
                }
                catch (error) {
                    logger_1.logger.error('Alert processing failed:', error);
                }
            }
            // 发送通知
            for (const alert of processedAlerts) {
                try {
                    await this.sendNotification(alert);
                }
                catch (error) {
                    logger_1.logger.error('Notification failed:', error);
                }
            }
            const duration = Date.now() - startTime;
            const successfulSymbols = marketDataMap.size;
            const totalSymbols = config_1.default.monitoring.symbols.length;
            logger_1.logger.info(`Monitoring cycle completed in ${duration}ms`, {
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
        }
        catch (error) {
            logger_1.logger.error('Monitoring cycle failed:', error);
            this.healthMonitor.incrementErrorCount();
        }
    }
    async sendNotification(alert) {
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
            logger_1.logger.info(`Notification sent for ${alert.opportunity.symbol} ${alert.level}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to send notification:', error);
            throw error;
        }
    }
    async start() {
        try {
            logger_1.logger.info('Starting Cloud Trading Monitor...');
            // 验证配置
            const configErrors = require('./config').validateConfig();
            if (configErrors.length > 0) {
                throw new Error(`Configuration errors: ${configErrors.join(', ')}`);
            }
            // 测试邮件服务
            const emailTest = await this.notificationService.testConnection();
            if (!emailTest) {
                logger_1.logger.warn('Email service test failed, notifications may not work');
            }
            // 启动HTTP服务器 - 绑定到 0.0.0.0 以便 Render 检测端口
            await new Promise((resolve, reject) => {
                this.server.listen(config_1.default.server.port, '0.0.0.0', () => {
                    logger_1.logger.info(`Server started on 0.0.0.0:${config_1.default.server.port}`);
                    resolve();
                }).on('error', (err) => {
                    reject(err);
                });
            });
            // 启动监控
            await this.startMonitoring();
            // 设置清理任务
            node_cron_1.default.schedule('0 */6 * * *', async () => {
                await this.deduplicationCooler.cleanupExpiredEntries();
                await this.snapshotStorage.cleanupOldSnapshots();
            });
            logger_1.logger.info('Cloud Trading Monitor started successfully');
            logger_1.logger.info(`Monitoring symbols: ${config_1.default.monitoring.symbols.join(', ')}`);
            logger_1.logger.info(`Monitoring interval: ${config_1.default.monitoring.interval}s`);
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            throw error;
        }
    }
    async stop() {
        try {
            logger_1.logger.info('Stopping Cloud Trading Monitor...');
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            this.wss.close();
            await new Promise((resolve) => {
                this.server.close(() => {
                    logger_1.logger.info('Server stopped');
                    resolve();
                });
            });
            this.healthMonitor.shutdown();
            this.webSocketService.shutdown();
            logger_1.logger.info('Cloud Trading Monitor stopped');
        }
        catch (error) {
            logger_1.logger.error('Error stopping server:', error);
            throw error;
        }
    }
}
exports.CloudTradingMonitor = CloudTradingMonitor;
// 启动服务器
if (require.main === module) {
    const monitor = new CloudTradingMonitor();
    monitor.start().catch((error) => {
        logger_1.logger.error('Failed to start monitor:', error);
        process.exit(1);
    });
    // 优雅关闭
    process.on('SIGINT', async () => {
        logger_1.logger.info('Received SIGINT, shutting down gracefully...');
        try {
            await monitor.stop();
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
    process.on('SIGTERM', async () => {
        logger_1.logger.info('Received SIGTERM, shutting down gracefully...');
        try {
            await monitor.stop();
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
}
exports.default = CloudTradingMonitor;
//# sourceMappingURL=server.js.map