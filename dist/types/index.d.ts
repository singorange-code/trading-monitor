export interface MarketData {
    symbol: string;
    timestamp: number;
    price: number;
    volume: number;
    klines: KlineData[];
    depth: DepthData;
    funding: number;
    openInterest: number;
}
export interface KlineData {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface DepthData {
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
}
export interface TradingOpportunity {
    id: string;
    symbol: string;
    strategy: 'BREAKOUT' | 'PULLBACK' | 'TREND_FOLLOW';
    direction: 'LONG' | 'SHORT';
    alertLevel: 'WATCH' | 'READY' | 'FIRED';
    entry: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit: number;
    netRR: number;
    riskRewardRatio: number;
    distanceToEntry: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    trigger: string;
    timestamp: number;
    snapshotId?: string;
}
export interface DataSnapshot {
    id: string;
    timestamp: Date;
    symbol: string;
    marketData: MarketData;
    analysis: FullAnalysis;
    opportunities: TradingOpportunity[];
    expiresAt: number;
}
export interface FullAnalysis {
    symbol: string;
    timestamp: number;
    price: number;
    indicators: TechnicalIndicators;
    strategies: StrategyResult[];
    riskMetrics: RiskMetrics;
    marketCondition: MarketCondition;
}
export interface TechnicalIndicators {
    sma20: number;
    sma50: number;
    bollinger: {
        upper: number;
        middle: number;
        lower: number;
    };
    rsi: number;
    macd: {
        macd: number;
        signal: number;
        histogram: number;
    };
    atr: number;
}
export interface StrategyResult {
    strategy: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: number;
}
export interface RiskMetrics {
    volatility: number;
    liquidity: number;
    marketCap: number;
    volume24h: number;
}
export interface MarketCondition {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface AlertConfig {
    symbols: string[];
    minNetRR: number;
    maxAlertsPerHour: number;
    cooldownMinutes: number;
    enabledStrategies: string[];
}
export interface NotificationSettings {
    email: boolean;
    webhook: boolean;
    websocket: boolean;
    emailTemplate: string;
}
export interface AlertState {
    symbol: string;
    strategy: string;
    level: 'WATCH' | 'READY' | 'FIRED';
    lastTriggered: number;
    cooldownUntil: number;
    triggerCount: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    lastDataUpdate: number;
    activeMonitors: number;
    memoryUsage: number;
    cpuUsage: number;
}
export interface MonitorConfig {
    symbols: string[];
    intervalSeconds: number;
    alertConfig: AlertConfig;
    notificationSettings: NotificationSettings;
    riskSettings: RiskSettings;
}
export interface RiskSettings {
    minNetRR: number;
    maxVolatility: number;
    minLiquidity: number;
    emergencyStop: boolean;
}
export interface MonitorError {
    code: string;
    message: string;
    timestamp: number;
    context?: Record<string, any>;
}
export interface WSMessage {
    type: 'OPPORTUNITY' | 'STATUS' | 'ERROR' | 'HEARTBEAT';
    data: any;
    timestamp: number;
}
export declare enum AlertLevel {
    WATCH = "WATCH",
    READY = "READY",
    FIRED = "FIRED"
}
export interface RiskAssessment {
    opportunityId: string;
    riskScore: number;
    isAcceptable: boolean;
    factors: {
        netRR: number;
        volatility: number;
        liquidity: number;
        marketCondition: number;
        priceDistance: number;
    };
    assessedAt: Date;
}
export interface ClassifiedAlert {
    opportunityId: string;
    level: AlertLevel;
    distanceToEntry: number;
    atr: number;
    estimatedTimeToTrigger: number;
    classifiedAt: Date;
    opportunity: TradingOpportunity;
}
export interface NotificationConfig {
    email: {
        user: string;
        password: string;
        recipients: string[];
    };
    webhook?: {
        url: string;
        secret: string;
    };
}
//# sourceMappingURL=index.d.ts.map