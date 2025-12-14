import { MarketData, TradingOpportunity } from '../types';
export declare class OpportunityEngine {
    private readonly minNetRR;
    private readonly TRADING_COSTS;
    analyzeMarket(marketData: MarketData): Promise<TradingOpportunity[]>;
    private performFullAnalysis;
    private generateCandidateStrategies;
    private calculateATR;
    private analyzeTechnicalFramework;
    private calculateEMA;
    private getHiLo;
    private calculateAmplitudePercentile;
    private buildBreakoutStrategy;
    private buildPullbackStrategy;
    private buildTrendFollowStrategy;
    private calculateBaseStopDist;
    private isNum;
}
//# sourceMappingURL=OpportunityEngine.d.ts.map