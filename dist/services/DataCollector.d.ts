import { MarketData } from '../types';
export declare class DataCollector {
    private client;
    private lastRequestTime;
    private requestCount;
    private readonly rateLimitDelay;
    constructor();
    collectData(symbol: string): Promise<MarketData>;
    private extractValue;
    private getKlines;
    private getDepth;
    private getTicker;
    private getFundingRate;
    private getOpenInterest;
    healthCheck(): Promise<{
        status: string;
        latency: number;
    }>;
    getStats(): {
        requestCount: number;
        lastRequestTime: number;
    };
    collectMarketData(symbol: string): Promise<MarketData>;
    private getBasicMarketData;
    private getMockData;
}
//# sourceMappingURL=DataCollector.d.ts.map