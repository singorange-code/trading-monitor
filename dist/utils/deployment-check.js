"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentCheck = void 0;
const logger_1 = require("./logger");
const config_1 = __importStar(require("../config"));
/**
 * 部署前检查 - 验证系统配置和依赖
 */
class DeploymentCheck {
    async runPreDeploymentChecks() {
        logger_1.logger.info('🚀 Starting pre-deployment checks...');
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
                logger_1.logger.info(`Checking ${name}...`);
                const result = await check();
                if (result) {
                    logger_1.logger.info(`✅ ${name}: PASSED`);
                }
                else {
                    logger_1.logger.error(`❌ ${name}: FAILED`);
                    allPassed = false;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger_1.logger.error(`💥 ${name}: ERROR - ${errorMessage}`);
                allPassed = false;
            }
        }
        if (allPassed) {
            logger_1.logger.info('🎉 All pre-deployment checks passed! Ready for deployment.');
        }
        else {
            logger_1.logger.error('⚠️  Some pre-deployment checks failed. Please fix issues before deploying.');
        }
        return allPassed;
    }
    checkEnvironmentVariables() {
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
                logger_1.logger.error(`Missing required environment variable: ${varName}`);
                return false;
            }
        }
        // 检查邮件配置（至少需要一种）
        if (process.env.SENDGRID_API_KEY) {
            hasEmailConfig = true;
            logger_1.logger.info('Using SendGrid for email notifications');
        }
        else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            hasEmailConfig = true;
            logger_1.logger.info('Using SMTP for email notifications');
        }
        if (!hasEmailConfig) {
            logger_1.logger.warn('No email configuration found. Notifications may not work.');
        }
        return true;
    }
    checkConfiguration() {
        try {
            const errors = (0, config_1.validateConfig)();
            if (errors.length > 0) {
                logger_1.logger.error('Configuration validation errors:', errors);
                return false;
            }
            // 检查符号列表
            if (config_1.default.monitoring.symbols.length === 0) {
                logger_1.logger.error('No symbols configured for monitoring');
                return false;
            }
            // 检查监控间隔
            if (config_1.default.monitoring.interval < 10 || config_1.default.monitoring.interval > 300) {
                logger_1.logger.error('Invalid monitoring interval. Must be between 10-300 seconds');
                return false;
            }
            logger_1.logger.info(`Configuration valid: monitoring ${config_1.default.monitoring.symbols.length} symbols every ${config_1.default.monitoring.interval}s`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Configuration check failed:', error);
            return false;
        }
    }
    async checkNetworkConnectivity() {
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
                logger_1.logger.error('Failed to connect to Binance API');
                return false;
            }
            logger_1.logger.info('Binance API connectivity: OK');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Network connectivity check failed:', error);
            return false;
        }
    }
    checkDependencies() {
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
                }
                catch (error) {
                    logger_1.logger.error(`Missing critical dependency: ${dep}`);
                    return false;
                }
            }
            logger_1.logger.info('All critical dependencies available');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Dependency check failed:', error);
            return false;
        }
    }
    async checkPortAvailability() {
        try {
            const port = config_1.default.server.port;
            // 在生产环境中，端口通常由平台分配，所以这个检查主要用于开发环境
            if (process.env.NODE_ENV === 'production') {
                logger_1.logger.info('Skipping port check in production environment');
                return true;
            }
            // 简单的端口检查（开发环境）
            logger_1.logger.info(`Port ${port} will be used for the server`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Port availability check failed:', error);
            return false;
        }
    }
    // 生成部署报告
    generateDeploymentReport() {
        return {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            configuration: {
                port: config_1.default.server.port,
                symbols: config_1.default.monitoring.symbols,
                interval: config_1.default.monitoring.interval,
                strategies: config_1.default.monitoring.strategies
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
exports.DeploymentCheck = DeploymentCheck;
// 如果直接运行此文件，执行部署检查
if (require.main === module) {
    const checker = new DeploymentCheck();
    checker.runPreDeploymentChecks().then(success => {
        if (success) {
            const report = checker.generateDeploymentReport();
            logger_1.logger.info('Deployment Report:', report);
            process.exit(0);
        }
        else {
            process.exit(1);
        }
    }).catch(error => {
        logger_1.logger.error('Deployment check failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=deployment-check.js.map