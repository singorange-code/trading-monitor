import { MarketData, TradingOpportunity, KlineData } from '../types';
import { logger } from '../utils/logger';

/**
 * OpportunityEngine - 同步自 App.jsx V12.6.6+ 的核心判断逻辑
 * 
 * 云端版本简化说明：
 * - 只做信号检测和提醒，不做实际下单
 * - 无法获取账户数据，所以不计算仓位大小
 * - 无法获取 Taker Buy/Sell Ratio，跳过假突破过滤
 * - netRR 门槛设为 1.5，与本地一致
 */
export class OpportunityEngine {
  private readonly minNetRR = 1.5;

  // 交易成本配置 (与 App.jsx 一致)
  private readonly TRADING_COSTS = {
    makerFee: 0.0002,
    takerFee: 0.0004,
    slippage: 0.0003,
    getMarketCost() {
      return this.takerFee * 2 + this.slippage; // 市价双边 + 滑点
    },
    getLimitCost() {
      return this.makerFee + this.takerFee + this.slippage * 0.5; // 限价入场
    }
  };

  async analyzeMarket(marketData: MarketData): Promise<TradingOpportunity[]> {
    try {
      const { symbol, price, klines } = marketData;
      
      if (!price || !klines || klines.length < 50) {
        logger.warn(`Insufficient data for ${symbol}: price=${price}, klines=${klines?.length || 0}`);
        return [];
      }

      logger.info(`Analyzing ${symbol}: price=${price.toFixed(2)}, klines=${klines.length}`);

      // 计算 ATR
      const atr20 = this.calculateATR(klines, 20);
      if (!atr20) {
        logger.warn(`ATR calculation failed for ${symbol}`);
        return [];
      }

      // 多周期分析 (模拟，云端只有15m数据，用不同窗口模拟)
      const tf15m = this.tfSummary(klines, '15m');
      
      // 计算基础止损距离
      const baseStopDist = this.calcBaseStopDist(price, atr20);
      if (!baseStopDist) {
        logger.warn(`BaseStopDist calculation failed for ${symbol}`);
        return [];
      }

      const candidates: TradingOpportunity[] = [];

      // ========== BREAKOUT 策略 ==========
      if (tf15m.valid && tf15m.signal?.startsWith('BREAKOUT_') && tf15m.volZ && tf15m.volZ > 1.5) {
        const direction = tf15m.signal === 'BREAKOUT_UP' ? 'LONG' : 'SHORT';
        const entry = price;
        const stopDist = baseStopDist;
        const stopLoss = direction === 'LONG' ? entry - stopDist : entry + stopDist;
        const tp1 = direction === 'LONG' ? entry + stopDist * 2 : entry - stopDist * 2;
        const tp2 = direction === 'LONG' ? entry + stopDist * 3 : entry - stopDist * 3;

        const netRR = this.calculateNetRR(entry, stopLoss, tp1, 'MARKET');

        if (netRR >= this.minNetRR) {
          candidates.push({
            id: `BREAKOUT_${direction}_${Date.now()}`,
            symbol,
            strategy: 'BREAKOUT',
            direction,
            alertLevel: 'WATCH',
            entry,
            entryPrice: entry,
            stopLoss,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit: tp1,
            netRR: +netRR.toFixed(2),
            riskRewardRatio: +netRR.toFixed(2),
            distanceToEntry: 0,
            confidence: 'MEDIUM',
            trigger: `15m ${tf15m.signal} volZ=${tf15m.volZ}`,
            timestamp: marketData.timestamp
          });
          logger.info(`BREAKOUT candidate: ${symbol} ${direction} netRR=${netRR.toFixed(2)}`);
        }
      }

      // ========== PULLBACK 策略 ==========
      if (tf15m.valid && tf15m.signal?.startsWith('PULLBACK_')) {
        const direction = tf15m.signal === 'PULLBACK_LONG' ? 'LONG' : 'SHORT';
        const pullbackOffset = baseStopDist * 0.3;
        const entry = direction === 'LONG' ? price - pullbackOffset : price + pullbackOffset;
        const stopDist = baseStopDist;
        const stopLoss = direction === 'LONG' ? entry - stopDist : entry + stopDist;
        const tp1 = direction === 'LONG' ? entry + stopDist * 2.5 : entry - stopDist * 2.5;
        const tp2 = direction === 'LONG' ? entry + stopDist * 4 : entry - stopDist * 4;

        const netRR = this.calculateNetRR(entry, stopLoss, tp1, 'LIMIT');
        const distanceToEntry = Math.abs(entry - price) / price;

        if (netRR >= this.minNetRR) {
          candidates.push({
            id: `PULLBACK_${direction}_${Date.now()}`,
            symbol,
            strategy: 'PULLBACK',
            direction,
            alertLevel: 'WATCH',
            entry,
            entryPrice: entry,
            stopLoss,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit: tp1,
            netRR: +netRR.toFixed(2),
            riskRewardRatio: +netRR.toFixed(2),
            distanceToEntry: +distanceToEntry.toFixed(4),
            confidence: 'HIGH',
            trigger: `15m ${tf15m.signal} 回调入场`,
            timestamp: marketData.timestamp
          });
          logger.info(`PULLBACK candidate: ${symbol} ${direction} netRR=${netRR.toFixed(2)}`);
        }
      }

      // ========== TREND_FOLLOW 策略 ==========
      if (tf15m.valid && tf15m.trend !== 'RANGE') {
        const direction = tf15m.trend === 'UP' ? 'LONG' : 'SHORT';
        const entry = price;
        const widerStopDist = baseStopDist * 1.2;
        const stopLoss = direction === 'LONG' ? entry - widerStopDist : entry + widerStopDist;
        const tp1 = direction === 'LONG' ? entry + widerStopDist * 2 : entry - widerStopDist * 2;
        const tp2 = direction === 'LONG' ? entry + widerStopDist * 3.5 : entry - widerStopDist * 3.5;

        const netRR = this.calculateNetRR(entry, stopLoss, tp1, 'MARKET');

        if (netRR >= this.minNetRR) {
          candidates.push({
            id: `TREND_FOLLOW_${direction}_${Date.now()}`,
            symbol,
            strategy: 'TREND_FOLLOW',
            direction,
            alertLevel: 'WATCH',
            entry,
            entryPrice: entry,
            stopLoss,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit: tp1,
            netRR: +netRR.toFixed(2),
            riskRewardRatio: +netRR.toFixed(2),
            distanceToEntry: 0,
            confidence: 'MEDIUM',
            trigger: `趋势跟随 ${direction} trend=${tf15m.trend}`,
            timestamp: marketData.timestamp
          });
          logger.info(`TREND_FOLLOW candidate: ${symbol} ${direction} netRR=${netRR.toFixed(2)}`);
        }
      }

      // 按置信度和 netRR 排序
      candidates.sort((a, b) => {
        const confOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const cd = (confOrder[b.confidence] || 0) - (confOrder[a.confidence] || 0);
        if (cd !== 0) return cd;
        return (b.netRR || 0) - (a.netRR || 0);
      });

      logger.info(`${symbol}: Generated ${candidates.length} valid candidates`);
      return candidates;

    } catch (error) {
      logger.error(`Market analysis failed for ${marketData.symbol}:`, error);
      return [];
    }
  }

  // ==================== 多周期分析 (同步自 App.jsx tfSummary) ====================
  private tfSummary(klines: KlineData[], label: string) {
    if (!Array.isArray(klines) || klines.length < 50) {
      return { tf: label, valid: false, trend: 'RANGE', signal: 'CHOP' };
    }

    const closes = klines.map(k => k.close).filter(c => this.isNum(c));
    const highs = klines.map(k => k.high).filter(h => this.isNum(h));
    const lows = klines.map(k => k.low).filter(l => this.isNum(l));
    const volumes = klines.map(k => k.volume).filter(v => this.isNum(v));

    if (closes.length < 50) {
      return { tf: label, valid: false, trend: 'RANGE', signal: 'CHOP' };
    }

    const curClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const ret1 = prevClose > 0 ? (curClose - prevClose) / prevClose : null;

    // EMA 计算
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);

    // 趋势判断
    let trend = 'RANGE';
    if (ema20 && ema50) {
      if (ema20 > ema50) trend = 'UP';
      else if (ema20 < ema50) trend = 'DOWN';
    }

    // 价格位置 (rangePos)
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    const rangeHi = Math.max(...recentHighs);
    const rangeLo = Math.min(...recentLows);
    const rangePos = rangeHi > rangeLo ? (curClose - rangeLo) / (rangeHi - rangeLo) : 0.5;

    // 成交量 Z 分数
    let volZ: number | null = null;
    if (volumes.length >= 20) {
      const recentVols = volumes.slice(-20);
      const volMean = recentVols.reduce((a, b) => a + b, 0) / 20;
      const volStd = Math.sqrt(recentVols.reduce((a, b) => a + (b - volMean) ** 2, 0) / 20);
      volZ = volStd > 0 ? (volumes[volumes.length - 1] - volMean) / volStd : 0;
    }

    // 信号生成 (与 App.jsx 一致)
    let signal = 'CHOP';
    if (volZ !== null && volZ > 1.5 && ret1 !== null) {
      signal = ret1 > 0 ? 'BREAKOUT_UP' : 'BREAKOUT_DOWN';
    } else if (rangePos < 0.3 && trend === 'UP') {
      signal = 'PULLBACK_LONG';
    } else if (rangePos > 0.7 && trend === 'DOWN') {
      signal = 'PULLBACK_SHORT';
    }

    return {
      tf: label,
      valid: true,
      trend,
      signal,
      rangePos: +rangePos.toFixed(2),
      volZ: volZ !== null ? +volZ.toFixed(2) : null
    };
  }

  // ==================== 辅助计算函数 ====================

  private calculateATR(klines: KlineData[], period = 20): number | null {
    if (!Array.isArray(klines) || klines.length < period + 2) return null;

    const trs: number[] = [];
    for (let i = 1; i < klines.length; i++) {
      const high = klines[i].high;
      const low = klines[i].low;
      const prevClose = klines[i - 1].close;

      if (!this.isNum(high) || !this.isNum(low) || !this.isNum(prevClose)) continue;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      if (this.isNum(tr)) trs.push(tr);
    }

    if (trs.length < period) return null;
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;

    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }

    return ema;
  }

  // 基础止损距离 (同步自 App.jsx calcBaseStopDist)
  private calcBaseStopDist(price: number, atr: number | null): number | null {
    if (!this.isNum(price) || !this.isNum(atr) || !atr) return null;

    const atrStop = atr * 1.5;
    const minPctStop = price * 0.0012; // 0.12%
    const minAbsStop = price * 0.001;  // 最小绝对止损

    return Math.max(atrStop, minPctStop, minAbsStop);
  }

  // 计算净风险收益比 (同步自 App.jsx)
  private calculateNetRR(entry: number, stopLoss: number, tp1: number, orderType: 'MARKET' | 'LIMIT'): number {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(tp1 - entry);

    if (risk <= 0) return 0;

    const costRate = orderType === 'MARKET' 
      ? this.TRADING_COSTS.getMarketCost() 
      : this.TRADING_COSTS.getLimitCost();
    
    const cost = costRate * entry;
    return (reward - cost) / risk;
  }

  private isNum(value: any): value is number {
    if (value === null || value === undefined || value === '') return false;
    const n = +value;
    return Number.isFinite(n);
  }
}
