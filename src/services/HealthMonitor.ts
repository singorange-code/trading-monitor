import { logger } from '../utils/logger';


interface HealthMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  lastDataUpdate: Date | null;
  errorCount: number;
  alertsSent: number;
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetrics;
  issues: string[];
  timestamp: Date;
}

export class HealthMonitor {
  private startTime: Date;
  private errorCount: number = 0;
  private alertsSent: number = 0;
  private lastDataUpdate: Date | null = null;
  private activeConnections: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = new Date();
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    // 每分钟进行一次健康检查
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const status = await this.getSystemStatus();
      
      if (status.status === 'critical') {
        logger.error('System health critical:', status.issues);
        // 这里可以添加紧急通知逻辑
      } else if (status.status === 'warning') {
        logger.warn('System health warning:', status.issues);
      }
    } catch (error) {
      logger.error('Health check failed:', error);
      this.incrementErrorCount();
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const metrics = await this.collectMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查内存使用
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      issues.push('High memory usage');
      status = 'critical';
    } else if (memoryUsagePercent > 75) {
      issues.push('Elevated memory usage');
      if (status === 'healthy') status = 'warning';
    }

    // 检查数据更新时间
    if (this.lastDataUpdate) {
      const timeSinceUpdate = Date.now() - this.lastDataUpdate.getTime();
      if (timeSinceUpdate > 5 * 60 * 1000) { // 5分钟
        issues.push('Data update delayed');
        status = 'critical';
      } else if (timeSinceUpdate > 2 * 60 * 1000) { // 2分钟
        issues.push('Data update slow');
        if (status === 'healthy') status = 'warning';
      }
    }

    // 检查错误率
    const errorRate = this.errorCount / Math.max(metrics.uptime / 3600, 1); // 每小时错误数
    if (errorRate > 10) {
      issues.push('High error rate');
      status = 'critical';
    } else if (errorRate > 5) {
      issues.push('Elevated error rate');
      if (status === 'healthy') status = 'warning';
    }

    return {
      status,
      metrics,
      issues,
      timestamp: new Date()
    };
  }
  private async collectMetrics(): Promise<HealthMetrics> {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000; // 秒
    const memoryUsage = process.memoryUsage();
    
    // 简化的CPU使用率计算
    const cpuUsage = await this.getCpuUsage();

    return {
      uptime,
      memoryUsage,
      cpuUsage,
      activeConnections: this.activeConnections,
      lastDataUpdate: this.lastDataUpdate,
      errorCount: this.errorCount,
      alertsSent: this.alertsSent
    };
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000000) / 0.1 * 100; // 100ms采样
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  incrementErrorCount(): void {
    this.errorCount++;
  }

  incrementAlertCount(): void {
    this.alertsSent++;
  }

  updateDataTimestamp(): void {
    this.lastDataUpdate = new Date();
  }

  setActiveConnections(count: number): void {
    this.activeConnections = count;
  }

  async getHealthEndpoint(): Promise<any> {
    const status = await this.getSystemStatus();
    
    return {
      status: status.status,
      timestamp: status.timestamp,
      uptime: status.metrics.uptime,
      memory: {
        used: status.metrics.memoryUsage.heapUsed,
        total: status.metrics.memoryUsage.heapTotal,
        percentage: Math.round((status.metrics.memoryUsage.heapUsed / status.metrics.memoryUsage.heapTotal) * 100)
      },
      cpu: status.metrics.cpuUsage,
      connections: status.metrics.activeConnections,
      stats: {
        errors: status.metrics.errorCount,
        alerts: status.metrics.alertsSent,
        lastDataUpdate: status.metrics.lastDataUpdate
      },
      issues: status.issues
    };
  }

  async restart(): Promise<void> {
    logger.info('Health monitor restart requested');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // 重置计数器
    this.errorCount = 0;
    this.alertsSent = 0;
    this.startTime = new Date();
    
    // 重新启动健康检查
    this.startHealthChecks();
    
    logger.info('Health monitor restarted');
  }

  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Health monitor shutdown');
  }

  // 负载自适应方法
  async adjustMonitoringFrequency(): Promise<void> {
    const status = await this.getSystemStatus();
    
    if (status.status === 'critical') {
      // 降低监控频率以减少系统负载
      logger.warn('Reducing monitoring frequency due to critical system status');
      // 这里可以通知其他服务降低采集频率
    } else if (status.status === 'healthy') {
      // 恢复正常监控频率
      logger.info('Restoring normal monitoring frequency');
    }
  }

  getUptimeString(): string {
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }
}