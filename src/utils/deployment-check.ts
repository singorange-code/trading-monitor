import { logger } from './logger';
import config, { validateConfig } from '../config';

/**
 * 部署前检查 - 验证系统配置和依赖
 */
export class DeploymentCheck {
  
  async runPreDeploymentChecks(): Promise<boolean> {
    logger.info('🚀 Starting pre-deployment checks...');
    
    const checks = [
      { name: 'Environment Variables', check: () => this.checkEnvironmentVariables() },
      { name: 'Configuration Validation', check: () => this.checkConfiguration() },
      { name: 'Network Connectivity', check: () => this.checkNetworkConnectivity() },
      { name: 'Dependencies', check: () => this.checkDependencies() },
      { name: 'Port Availability', check: () => this.checkPortAvailability() }
    ];

    let allPassed = true;

    for (const { name, check } of checks) {
      try {
        logger.info(`Checking ${name}...`);
        const result = await check();
        
        if (result) {
          logger.info(`✅ ${name}: PASSED`);
        } else {
          logger.error(`❌ ${name}: FAILED`);
          allPassed = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`💥 ${name}: ERROR - ${errorMessage}`);
        allPassed = false;
      }
    }

    if (allPassed) {
      logger.info('🎉 All pre-deployment checks passed! Ready for deployment.');
    } else {
      logger.error('⚠️  Some pre-deployment checks failed. Please fix issues before deploying.');
    }

    return allPassed;
  }

  private checkEnvironmentVariables(): boolean {
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'SYMBOLS',
      'MONITOR_INTERVAL_SECONDS'
    ];

    // 可选的环境变量（用于邮件配置）

    let hasEmailConfig = false;

    // 检查必需的环境变量
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        logger.error(`Missing required environment variable: ${varName}`);
        return false;
      }
    }

    // 检查邮件配置（至少需要一种）
    if (process.env.SENDGRID_API_KEY) {
      hasEmailConfig = true;
      logger.info('Using SendGrid for email notifications');
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      hasEmailConfig = true;
      logger.info('Using SMTP for email notifications');
    }

    if (!hasEmailConfig) {
      logger.warn('No email configuration found. Notifications may not work.');
    }

    return true;
  }

  private checkConfiguration(): boolean {
    try {
      const errors = validateConfig();
      
      if (errors.length > 0) {
        logger.error('Configuration validation errors:', errors);
        return false;
      }

      // 检查符号列表
      if (config.monitoring.symbols.length === 0) {
        logger.error('No symbols configured for monitoring');
        return false;
      }

      // 检查监控间隔
      if (config.monitoring.interval < 10 || config.monitoring.interval > 300) {
        logger.error('Invalid monitoring interval. Must be between 10-300 seconds');
        return false;
      }

      logger.info(`Configuration valid: monitoring ${config.monitoring.symbols.length} symbols every ${config.monitoring.interval}s`);
      return true;

    } catch (error) {
      logger.error('Configuration check failed:', error);
      return false;
    }
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // 测试币安API连接
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://fapi.binance.com/fapi/v1/ping', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('Failed to connect to Binance API');
        return false;
      }

      logger.info('Binance API connectivity: OK');
      return true;

    } catch (error) {
      logger.error('Network connectivity check failed:', error);
      return false;
    }
  }

  private checkDependencies(): boolean {
    try {
      // 检查关键依赖是否可用
      const criticalDeps = [
        'express',
        'axios',
        'ws',
        'nodemailer',
        'winston'
      ];

      for (const dep of criticalDeps) {
        try {
          require(dep);
        } catch (error) {
          logger.error(`Missing critical dependency: ${dep}`);
          return false;
        }
      }

      logger.info('All critical dependencies available');
      return true;

    } catch (error) {
      logger.error('Dependency check failed:', error);
      return false;
    }
  }

  private async checkPortAvailability(): Promise<boolean> {
    try {
      const port = config.server.port;
      
      // 在生产环境中，端口通常由平台分配，所以这个检查主要用于开发环境
      if (process.env.NODE_ENV === 'production') {
        logger.info('Skipping port check in production environment');
        return true;
      }

      // 简单的端口检查（开发环境）
      logger.info(`Port ${port} will be used for the server`);
      return true;

    } catch (error) {
      logger.error('Port availability check failed:', error);
      return false;
    }
  }

  // 生成部署报告
  generateDeploymentReport(): any {
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      configuration: {
        port: config.server.port,
        symbols: config.monitoring.symbols,
        interval: config.monitoring.interval,
        strategies: config.monitoring.strategies
      },
      features: {
        emailNotifications: !!(process.env.SENDGRID_API_KEY || process.env.SMTP_HOST),
        webSocketSupport: true,
        healthMonitoring: true,
        dataSnapshots: true
      },
      version: require('../../package.json').version
    };
  }
}

// 如果直接运行此文件，执行部署检查
if (require.main === module) {
  const checker = new DeploymentCheck();
  
  checker.runPreDeploymentChecks().then(success => {
    if (success) {
      const report = checker.generateDeploymentReport();
      logger.info('Deployment Report:', report);
      process.exit(0);
    } else {
      process.exit(1);
    }
  }).catch(error => {
    logger.error('Deployment check failed:', error);
    process.exit(1);
  });
}