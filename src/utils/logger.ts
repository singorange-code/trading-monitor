import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config';

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'cloud-trading-monitor' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    }),
  ],
});

// Add console transport in development
if (config.nodeEnv === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  }));
}

// Utility functions for structured logging
export const logError = (message: string, error: Error, context?: Record<string, any>) => {
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

  logger.error(message, {
    error: safeError,
    context: safeContext,
  });
};

export const logOpportunity = (symbol: string, opportunity: any) => {
  logger.info('Trading opportunity detected', {
    symbol,
    strategy: opportunity.strategy,
    direction: opportunity.direction,
    netRR: opportunity.netRR,
    alertLevel: opportunity.alertLevel,
    timestamp: opportunity.timestamp,
  });
};

export const logAlert = (type: string, symbol: string, details: Record<string, any>) => {
  logger.info('Alert triggered', {
    type,
    symbol,
    ...details,
  });
};

export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) => {
  logger.info('Performance metric', {
    operation,
    duration,
    context,
  });
};

export const logSystemHealth = (metrics: Record<string, any>) => {
  logger.info('System health check', metrics);
};

export default logger;