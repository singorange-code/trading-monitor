import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logError: (message: string, error: Error, context?: Record<string, any>) => void;
export declare const logOpportunity: (symbol: string, opportunity: any) => void;
export declare const logAlert: (type: string, symbol: string, details: Record<string, any>) => void;
export declare const logPerformance: (operation: string, duration: number, context?: Record<string, any>) => void;
export declare const logSystemHealth: (metrics: Record<string, any>) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map