"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSystemHealth = exports.logPerformance = exports.logAlert = exports.logOpportunity = exports.logError = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../config"));
// Ensure logs directory exists
const logsDir = path_1.default.dirname(config_1.default.logging.file);
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Custom format for structured logging
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
    });
}));
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: config_1.default.logging.level,
    format: logFormat,
    defaultMeta: { service: 'cloud-trading-monitor' },
    transports: [
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: config_1.default.logging.file,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true,
        }),
        // Separate file for errors
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3,
        }),
    ],
});
// Add console transport in development
if (config_1.default.nodeEnv === 'development') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })),
    }));
}
// Utility functions for structured logging
const logError = (message, error, context) => {
    // 安全地序列化错误对象，避免循环引用
    const safeError = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // 只包含基本属性，避免循环引用
    };
    // 安全地序列化上下文，移除可能的循环引用
    const safeContext = context ? JSON.parse(JSON.stringify(context, (key, value) => {
        // 过滤掉可能导致循环引用的属性
        if (key === 'request' || key === 'response' || key === 'agent' || key === 'socket') {
            return '[Circular]';
        }
        return value;
    })) : undefined;
    exports.logger.error(message, {
        error: safeError,
        context: safeContext,
    });
};
exports.logError = logError;
const logOpportunity = (symbol, opportunity) => {
    exports.logger.info('Trading opportunity detected', {
        symbol,
        strategy: opportunity.strategy,
        direction: opportunity.direction,
        netRR: opportunity.netRR,
        alertLevel: opportunity.alertLevel,
        timestamp: opportunity.timestamp,
    });
};
exports.logOpportunity = logOpportunity;
const logAlert = (type, symbol, details) => {
    exports.logger.info('Alert triggered', {
        type,
        symbol,
        ...details,
    });
};
exports.logAlert = logAlert;
const logPerformance = (operation, duration, context) => {
    exports.logger.info('Performance metric', {
        operation,
        duration,
        context,
    });
};
exports.logPerformance = logPerformance;
const logSystemHealth = (metrics) => {
    exports.logger.info('System health check', metrics);
};
exports.logSystemHealth = logSystemHealth;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map