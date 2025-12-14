"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
exports.config = {
    // Server Configuration
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    },
    nodeEnv: process.env.NODE_ENV || 'development',
    // Binance API Configuration
    binance: {
        apiKey: process.env.BINANCE_API_KEY || '',
        secretKey: process.env.BINANCE_SECRET_KEY || '',
        baseUrl: process.env.BINANCE_BASE_URL || 'https://fapi.binance.com',
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
    },
    // Email Configuration
    email: {
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASS || '',
        recipients: (process.env.TO_EMAIL || '').split(',').filter(email => email.trim()),
        // SendGrid configuration
        sendgridApiKey: process.env.SENDGRID_API_KEY || '',
        // SMTP configuration
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
        },
        fromEmail: process.env.FROM_EMAIL || 'monitor@tradingmonitor.com',
    },
    // Database Configuration
    database: {
        path: process.env.DATABASE_PATH || './data/monitor.db',
    },
    // Risk Management
    risk: {
        minNetRR: parseFloat(process.env.MIN_NET_RR || '2.0'),
        maxAlertsPerHour: parseInt(process.env.MAX_ALERTS_PER_HOUR || '3', 10),
        maxVolatility: 0.1, // 10% max volatility
        minLiquidity: 1000000, // $1M minimum liquidity
    },
    // Monitoring Configuration
    monitoring: {
        interval: parseInt(process.env.MONITOR_INTERVAL_SECONDS || '30', 10),
        symbols: (process.env.SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,ADAUSDT,DOGEUSDT,XRPUSDT,AVAXUSDT,DOTUSDT,MATICUSDT,LINKUSDT,LTCUSDT,UNIUSDT,ATOMUSDT,FILUSDT').split(','),
        strategies: ['BREAKOUT', 'PULLBACK', 'TREND_FOLLOW'],
        snapshotRetentionHours: 24,
        maxSnapshots: 100,
    },
    // Alert Configuration
    alerts: {
        cooldownPeriod: parseInt(process.env.ALERT_COOLDOWN_MINUTES || '30', 10) * 60 * 1000,
        levels: ['WATCH', 'READY', 'FIRED'],
        maxAlertsPerHour: parseInt(process.env.MAX_ALERTS_PER_HOUR || '3', 10),
    },
    // WebSocket Configuration
    websocket: {
        port: parseInt(process.env.WS_PORT || '3001', 10),
        heartbeatInterval: 30000, // 30 seconds
    },
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/monitor.log',
    },
    // Railway Configuration
    railway: {
        staticUrl: process.env.RAILWAY_STATIC_URL || '',
        publicUrl: process.env.RAILWAY_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,
    },
};
// Validation
function validateConfig() {
    const errors = [];
    if (exports.config.email.recipients.length === 0) {
        errors.push('TO_EMAIL is required for notifications');
    }
    // 邮件配置是可选的，如果没有配置会使用测试邮件服务
    // if (!config.email.sendgridApiKey && !config.email.user) {
    //   errors.push('Either SENDGRID_API_KEY or SMTP configuration is required');
    // }
    if (exports.config.monitoring.symbols.length === 0) {
        errors.push('At least one symbol must be configured for monitoring');
    }
    if (exports.config.risk.minNetRR < 1.0) {
        errors.push('MIN_NET_RR must be at least 1.0');
    }
    return errors;
}
exports.default = exports.config;
//# sourceMappingURL=index.js.map