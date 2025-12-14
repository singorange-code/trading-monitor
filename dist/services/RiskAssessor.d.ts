import { TradingOpportunity, RiskAssessment } from '../types';
export declare class RiskAssessor {
    private readonly minNetRR;
    private readonly maxVolatilityThreshold;
    private readonly minLiquidityThreshold;
    assessRisk(opportunity: TradingOpportunity): Promise<RiskAssessment>;
    private calculateRiskFactors;
    private calculateRiskScore;
    private isRiskAcceptable;
    private calculateVolatility;
    private calculateLiquidity;
    private assessMarketCondition;
    detectAbnormalMarket(): Promise<boolean>;
}
//# sourceMappingURL=RiskAssessor.d.ts.map