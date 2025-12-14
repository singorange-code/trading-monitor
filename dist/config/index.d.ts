export declare const config: {
    server: {
        port: number;
        baseUrl: string;
    };
    nodeEnv: string;
    binance: {
        apiKey: string;
        secretKey: string;
        baseUrl: string;
        timeout: number;
        retryAttempts: number;
        retryDelay: number;
    };
    email: {
        user: string;
        password: string;
        recipients: string[];
        sendgridApiKey: string;
        smtp: {
            host: string;
            port: number;
        };
        fromEmail: string;
    };
    database: {
        path: string;
    };
    risk: {
        minNetRR: number;
        maxAlertsPerHour: number;
        maxVolatility: number;
        minLiquidity: number;
    };
    monitoring: {
        interval: number;
        symbols: string[];
        strategies: string[];
        snapshotRetentionHours: number;
        maxSnapshots: number;
    };
    alerts: {
        cooldownPeriod: number;
        levels: string[];
        maxAlertsPerHour: number;
    };
    websocket: {
        port: number;
        heartbeatInterval: number;
    };
    logging: {
        level: string;
        file: string;
    };
    railway: {
        staticUrl: string;
        publicUrl: string;
    };
};
export declare function validateConfig(): string[];
export default config;
//# sourceMappingURL=index.d.ts.map