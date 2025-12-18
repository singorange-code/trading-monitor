import { MarketData, TradingOpportunity } from '../types';
/**
 * OpportunityEngine - 同步自 App.jsx V12.6.6+ 的核心判断逻辑
 *
 * 云端版本简化说明：
 * - 只做信号检测和提醒，不做实际下单
 * - 无法获取账户数据，所以不计算仓位大小
 * - 无法获取 Taker Buy/Sell Ratio，跳过假突破过滤
 * - netRR 门槛设为 1.5，与本地一致
 */
export declare class OpportunityEngine {
    private readonly minNetRR;
    private readonly TRADING_COSTS;
    analyzeMarket(marketData: MarketData): Promise<TradingOpportunity[]>;
    private tfSummary;
    private calculateATR;
    private calculateEMA;
    private calcBaseStopDist;
    private calculateNetRR;
    private isNum;
}
//# sourceMappingURL=OpportunityEngine.d.ts.map