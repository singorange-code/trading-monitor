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
export declare class HealthMonitor {
    private startTime;
    private errorCount;
    private alertsSent;
    private lastDataUpdate;
    private activeConnections;
    private healthCheckInterval;
    constructor();
    private startHealthChecks;
    private performHealthCheck;
    getSystemStatus(): Promise<SystemStatus>;
    private collectMetrics;
    private getCpuUsage;
    incrementErrorCount(): void;
    incrementAlertCount(): void;
    updateDataTimestamp(): void;
    setActiveConnections(count: number): void;
    getHealthEndpoint(): Promise<any>;
    restart(): Promise<void>;
    shutdown(): void;
    adjustMonitoringFrequency(): Promise<void>;
    getUptimeString(): string;
}
export {};
//# sourceMappingURL=HealthMonitor.d.ts.map