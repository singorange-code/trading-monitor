export declare class CloudTradingMonitor {
    private app;
    private server;
    private wss;
    private monitoringInterval;
    private dataCollector;
    private opportunityEngine;
    private riskAssessor;
    private alertClassifier;
    private deduplicationCooler;
    private notificationService;
    private snapshotStorage;
    private healthMonitor;
    private webSocketService;
    constructor();
    private initializeServices;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    private setupWebSocket;
    startMonitoring(): Promise<void>;
    private performMonitoringCycle;
    private sendNotification;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export default CloudTradingMonitor;
//# sourceMappingURL=server.d.ts.map