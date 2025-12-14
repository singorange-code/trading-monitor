import { ClassifiedAlert } from '../types';
export declare class DeduplicationCooler {
    private cooldownMap;
    private readonly cooldownPeriod;
    private notificationStats;
    private adaptiveThresholds;
    shouldNotify(alert: ClassifiedAlert): Promise<boolean>;
    private generateKey;
    private isLevelUpgrade;
    private updateCooldownEntry;
    private isAboveAdaptiveThreshold;
    private getBaseThreshold;
    private updateNotificationStats;
    private adjustAdaptiveThreshold;
    mergeSimilarSignals(alerts: ClassifiedAlert[]): Promise<ClassifiedAlert[]>;
    private compareLevels;
    cleanupExpiredEntries(): Promise<void>;
    getCooldownStatus(): {
        active: number;
        total: number;
    };
}
//# sourceMappingURL=DeduplicationCooler.d.ts.map