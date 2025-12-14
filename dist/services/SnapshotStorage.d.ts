import { TradingOpportunity, DataSnapshot } from '../types';
export declare class SnapshotStorage {
    private readonly storageDir;
    private readonly maxSnapshots;
    private readonly retentionHours;
    constructor();
    private ensureStorageDir;
    saveSnapshot(opportunity: TradingOpportunity, marketData: any): Promise<string>;
    getSnapshot(snapshotId: string): Promise<DataSnapshot | null>;
    listSnapshots(limit?: number): Promise<DataSnapshot[]>;
    cleanupOldSnapshots(): Promise<void>;
    cleanupExpiredSnapshots(): Promise<void>;
    getStorageStats(): Promise<{
        totalSnapshots: number;
        totalSize: number;
        oldestSnapshot: Date | null;
        newestSnapshot: Date | null;
    }>;
}
//# sourceMappingURL=SnapshotStorage.d.ts.map