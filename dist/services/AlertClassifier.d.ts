import { TradingOpportunity, ClassifiedAlert } from '../types';
export declare class AlertClassifier {
    private readonly atrMultiplier;
    private readonly watchThreshold;
    private readonly readyThreshold;
    classifyAlert(opportunity: TradingOpportunity): Promise<ClassifiedAlert>;
    private determineAlertLevel;
    private calculateATR;
    private estimateTimeToTrigger;
    trackStateChange(previousAlert: ClassifiedAlert | null, currentAlert: ClassifiedAlert): Promise<boolean>;
    private isLevelUpgrade;
    getAlertHistory(_opportunityId: string): Promise<ClassifiedAlert[]>;
}
//# sourceMappingURL=AlertClassifier.d.ts.map