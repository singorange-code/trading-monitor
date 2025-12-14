import { MarketData, TradingOpportunity, KlineData } from '../types';
import { logger } from '../utils/logger';

export class OpportunityEngine {
  private readonly minNetRR = 1.5;

  // 交易成本配置
  private readonly TRADING_COSTS = {
    makerFee: 0.0002,
    takerFee: 0.0004,
    slippage: 0.0003,
    getRoundTripCost(entryIsMarket = true, exitIsMarket = true, entrySlipOn = true, exitSlipOn = true) {
      const entryFee = entryIsMarket ? this.takerFee : this.makerFee;
      const exitFee = exitIsMarket ? this.takerFee : this.makerFee;
      const entrySlip = (entryIsMarket && entrySlipOn) ? this.slippage : 0;
      const exitSlip = (exitIsMarket && exitSlipOn) ? this.slippage : 0;
      return entryFee + exitFee + entrySlip + exitSlip;
    }
  };

  async analyzeMarket(marketData: MarketData): Promise<TradingOpportunity[]> {
    try {
      logger.info(`Analyzing market for ${marketData.symbol}`);
      
      // 执行全维分析
      const analysis = this.performFullAnalysis(marketData);
      
      // 生成候选策略
      const candidates = this.generateCandidateStrategies(analysis, marketData);
      
      // 过滤和排序
      const validCandidates = candidates
        .filter(c => c.netRR >= this.minNetRR)
        .sort((a, b) => {
          const confOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const cd = (confOrder[b.confidence] || 0) - (confOrder[a.confidence] || 0);
          if (cd !== 0) return cd;
          return (b.netRR || 0) - (a.netRR || 0);
        });

      logger.info(`Generated ${candidates.length} candidates, ${validCandidates.length} valid (netRR >= ${this.minNetRR})`);
      
      return validCandidates;
    } catch (error) {
      logger.error('Market analysis failed:', error);
      return [];
    }
  }

  private performFullAnalysis(marketData: MarketData) {
    const price = marketData.price;
    const klines = marketData.klines;
    
    logger.info(`Performing analysis for ${marketData.symbol}: price=${price}, klines=${klines.length}`);
    
    // 计算技术指标
    const atr20 = this.calculateATR(klines, 20);
    const tfSummary = this.analyzeTechnicalFramework(klines);
    
    // 计算关键价位
    const { hi: swingHigh, lo: swingLow } = this.getHiLo(klines, 50);
    
    // 计算振幅分位
    const ampPct = this.calculateAmplitudePercentile(klines);
    
    // 市场状态
    let regime = 'NORMAL';
    if (ampPct != null) {
      if (ampPct < 0.3) regime = 'LOW_VOL';
      else if (ampPct > 0.75) regime = 'HIGH_VOL';
    }

    logger.info(`Analysis results for ${marketData.symbol}: atr20=${atr20}, trend=${tfSummary.trend}, signal=${tfSummary.signal}, volZ=${tfSummary.volZ}, regime=${regime}`);

    return {
      price,
      atr20,
      tfSummary,
      swingHigh,
      swingLow,
      ampPct,
      regime,
      klines
    };
  }

  private generateCandidateStrategies(analysis: any, marketData: MarketData): TradingOpportunity[] {
    const candidates: TradingOpportunity[] = [];
    const price = analysis.price;
    
    if (!price || !analysis.atr20) {
      logger.warn(`Insufficient data for strategy generation: price=${price}, atr20=${analysis.atr20}`);
      return candidates;
    }

    logger.info(`Evaluating strategies for ${marketData.symbol}: signal=${analysis.tfSummary.signal}, trend=${analysis.tfSummary.trend}, volZ=${analysis.tfSummary.volZ}`);

    // 策略1: BREAKOUT - 基于高波动率突破
    if (analysis.tfSummary.signal?.startsWith('BREAKOUT_') && analysis.tfSummary.volZ > 1.5) {
      logger.info(`BREAKOUT signal detected: ${analysis.tfSummary.signal}, volZ=${analysis.tfSummary.volZ}`);
      const direction = analysis.tfSummary.signal === 'BREAKOUT_UP' ? 'LONG' : 'SHORT';
      const candidate = this.buildBreakoutStrategy(direction, price, analysis, marketData);
      if (candidate) {
        logger.info(`BREAKOUT candidate created: ${direction}, netRR=${candidate.netRR}`);
        candidates.push(candidate);
      }
    }

    // 策略2: PULLBACK - 基于趋势回调
    if (analysis.tfSummary.signal?.startsWith('PULLBACK_')) {
      logger.info(`PULLBACK signal detected: ${analysis.tfSummary.signal}`);
      const direction = analysis.tfSummary.signal === 'PULLBACK_LONG' ? 'LONG' : 'SHORT';
      const candidate = this.buildPullbackStrategy(direction, price, analysis, marketData);
      if (candidate) {
        logger.info(`PULLBACK candidate created: ${direction}, netRR=${candidate.netRR}`);
        candidates.push(candidate);
      }
    }

    // 策略3: TREND_FOLLOW - 基于趋势一致性
    if (analysis.tfSummary.trend !== 'RANGE') {
      logger.info(`TREND_FOLLOW signal detected: trend=${analysis.tfSummary.trend}`);
      const direction = analysis.tfSummary.trend === 'UP' ? 'LONG' : 'SHORT';
      const candidate = this.buildTrendFollowStrategy(direction, price, analysis, marketData);
      if (candidate) {
        logger.info(`TREND_FOLLOW candidate created: ${direction}, netRR=${candidate.netRR}`);
        candidates.push(candidate);
      }
    }

    logger.info(`Generated ${candidates.length} candidates for ${marketData.symbol}`);
    return candidates;
  }
  // ==================== 技术指标计算 ====================
  
  private calculateATR(klines: KlineData[], period = 20): number | null {
    if (!Array.isArray(klines) || klines.length < period + 2) return null;
    
    const trs: number[] = [];
    for (let i = 1; i < klines.length; i++) {
      const high = klines[i].high;
      const low = klines[i].low;
      const prevClose = klines[i - 1].close;
      
      if (high == null || low == null || prevClose == null) continue;
      
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

  private analyzeTechnicalFramework(klines: KlineData[]) {
    if (!Array.isArray(klines) || klines.length < 50) {
      return { valid: false, trend: 'RANGE', signal: 'CHOP' };
    }

    const closes = klines.map(k => k.close).filter(c => this.isNum(c));
    const highs = klines.map(k => k.high).filter(h => this.isNum(h));
    const lows = klines.map(k => k.low).filter(l => this.isNum(l));
    const volumes = klines.map(k => k.volume).filter(v => this.isNum(v));

    if (closes.length < 50) return { valid: false, trend: 'RANGE', signal: 'CHOP' };

    const curClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const ret1 = prevClose > 0 ? (curClose - prevClose) / prevClose : null;

    // EMA计算
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);

    // 趋势判断
    let trend = 'RANGE';
    if (ema20 && ema50) {
      if (ema20 > ema50) trend = 'UP';
      else if (ema20 < ema50) trend = 'DOWN';
    }

    // 价格位置
    const rangeHi = Math.max(...highs.slice(-20));
    const rangeLo = Math.min(...lows.slice(-20));
    const rangePos = rangeHi > rangeLo ? (curClose - rangeLo) / (rangeHi - rangeLo) : 0.5;

    // 成交量Z分数
    let volZ = 0;
    if (volumes.length >= 20) {
      const recentVols = volumes.slice(-20);
      const volMean = recentVols.reduce((a, b) => a + b, 0) / 20;
      const volStd = Math.sqrt(recentVols.reduce((a, b) => a + (b - volMean) ** 2, 0) / 20);
      volZ = volStd > 0 ? (volumes[volumes.length - 1] - volMean) / volStd : 0;
    }

    // 信号生成
    let signal = 'CHOP';
    if (volZ > 1.5 && ret1 != null) {
      signal = ret1 > 0 ? 'BREAKOUT_UP' : 'BREAKOUT_DOWN';
    } else if (rangePos < 0.3 && trend === 'UP') {
      signal = 'PULLBACK_LONG';
    } else if (rangePos > 0.7 && trend === 'DOWN') {
      signal = 'PULLBACK_SHORT';
    }

    return {
      valid: true,
      trend,
      signal,
      rangePos: +rangePos.toFixed(2),
      volZ: +volZ.toFixed(2),
      ret1: ret1 != null ? +(ret1 * 100).toFixed(2) : null,
      ema20_vs_50: ema20 && ema50 ? (ema20 > ema50 ? 'ABOVE' : 'BELOW') : 'NA'
    };
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

  private getHiLo(klines: KlineData[], period = 20): { hi: number | null; lo: number | null } {
    if (!Array.isArray(klines) || klines.length < period) {
      return { hi: null, lo: null };
    }
    
    const recent = klines.slice(-period);
    const highs = recent.map(k => k.high).filter(h => this.isNum(h));
    const lows = recent.map(k => k.low).filter(l => this.isNum(l));
    
    if (!highs.length || !lows.length) return { hi: null, lo: null };
    
    return {
      hi: Math.max(...highs),
      lo: Math.min(...lows)
    };
  }

  private calculateAmplitudePercentile(klines: KlineData[]): number | null {
    if (!Array.isArray(klines) || klines.length < 20) return null;
    
    const amplitudes = klines
      .map(k => {
        const h = k.high, l = k.low, c = k.close;
        if (h == null || l == null || c == null || c <= 0) return null;
        return (h - l) / c;
      })
      .filter(amp => this.isNum(amp)) as number[];
    
    if (amplitudes.length === 0) return null;
    
    const curAmp = amplitudes[amplitudes.length - 1];
    const sorted = [...amplitudes].sort((a, b) => a - b);
    
    return sorted.filter(v => v <= curAmp).length / sorted.length;
  }

  // ==================== 策略构建器 ====================
  
  private buildBreakoutStrategy(direction: 'LONG' | 'SHORT', price: number, analysis: any, marketData: MarketData): TradingOpportunity | null {
    const baseStopDist = this.calculateBaseStopDist(price, analysis.atr20);
    if (!baseStopDist) return null;

    const entry = price;
    const stopLoss = direction === 'LONG' ? 
      entry - baseStopDist : 
      entry + baseStopDist;
    
    const stopDist = Math.abs(entry - stopLoss);
    const takeProfit1 = direction === 'LONG' ? 
      entry + stopDist * 2.5 : 
      entry - stopDist * 2.5;
    const takeProfit2 = direction === 'LONG' ? 
      entry + stopDist * 4 : 
      entry - stopDist * 4;

    const costPct = this.TRADING_COSTS.getRoundTripCost(true, true, false, true); // MARKET entry
    const grossRR = Math.abs(takeProfit1 - entry) / stopDist;
    const costR = (costPct * entry) / stopDist;
    const netRR = grossRR - costR;

    if (netRR < this.minNetRR) return null;

    return {
      id: `BREAKOUT_${direction}_${Date.now()}`,
      symbol: marketData.symbol,
      strategy: 'BREAKOUT',
      direction,
      alertLevel: 'WATCH',
      entry,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit: takeProfit1,
      netRR: +netRR.toFixed(2),
      riskRewardRatio: +netRR.toFixed(2),
      distanceToEntry: 0, // MARKET order
      confidence: 'MEDIUM',
      trigger: `Breakout ${direction} signal, volZ=${analysis.tfSummary.volZ}`,
      timestamp: marketData.timestamp
    };
  }

  private buildPullbackStrategy(direction: 'LONG' | 'SHORT', price: number, analysis: any, marketData: MarketData): TradingOpportunity | null {
    const baseStopDist = this.calculateBaseStopDist(price, analysis.atr20);
    if (!baseStopDist) return null;

    // 回调入场点
    const pullbackOffset = baseStopDist * 0.3;
    const entry = direction === 'LONG' ? 
      price - pullbackOffset : 
      price + pullbackOffset;

    const stopLoss = direction === 'LONG' ? 
      entry - baseStopDist : 
      entry + baseStopDist;
    
    const stopDist = Math.abs(entry - stopLoss);
    const takeProfit1 = direction === 'LONG' ? 
      entry + stopDist * 2.5 : 
      entry - stopDist * 2.5;
    const takeProfit2 = direction === 'LONG' ? 
      entry + stopDist * 4 : 
      entry - stopDist * 4;

    const costPct = this.TRADING_COSTS.getRoundTripCost(false, true, false, true); // LIMIT entry
    const grossRR = Math.abs(takeProfit1 - entry) / stopDist;
    const costR = (costPct * entry) / stopDist;
    const netRR = grossRR - costR;

    if (netRR < this.minNetRR) return null;

    const distanceToEntry = Math.abs(entry - price) / price;

    return {
      id: `PULLBACK_${direction}_${Date.now()}`,
      symbol: marketData.symbol,
      strategy: 'PULLBACK',
      direction,
      alertLevel: 'WATCH',
      entry,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit: takeProfit1,
      netRR: +netRR.toFixed(2),
      riskRewardRatio: +netRR.toFixed(2),
      distanceToEntry: +distanceToEntry.toFixed(4),
      confidence: 'HIGH',
      trigger: `Pullback ${direction} in ${analysis.tfSummary.trend} trend`,
      timestamp: marketData.timestamp
    };
  }

  private buildTrendFollowStrategy(direction: 'LONG' | 'SHORT', price: number, analysis: any, marketData: MarketData): TradingOpportunity | null {
    const baseStopDist = this.calculateBaseStopDist(price, analysis.atr20);
    if (!baseStopDist) {
      logger.warn(`TREND_FOLLOW: baseStopDist calculation failed for ${marketData.symbol}`);
      return null;
    }

    // 趋势跟随使用更宽的止损
    const widerStopDist = baseStopDist * 1.2;
    
    const entry = price;
    const stopLoss = direction === 'LONG' ? 
      entry - widerStopDist : 
      entry + widerStopDist;
    
    const stopDist = Math.abs(entry - stopLoss);
    const takeProfit1 = direction === 'LONG' ? 
      entry + stopDist * 3 : 
      entry - stopDist * 3;
    const takeProfit2 = direction === 'LONG' ? 
      entry + stopDist * 5 : 
      entry - stopDist * 5;

    const costPct = this.TRADING_COSTS.getRoundTripCost(true, true, false, true); // MARKET entry
    const grossRR = Math.abs(takeProfit1 - entry) / stopDist;
    const costR = (costPct * entry) / stopDist;
    const netRR = grossRR - costR;

    logger.info(`TREND_FOLLOW calculation for ${marketData.symbol}: entry=${entry}, stopDist=${stopDist.toFixed(2)}, grossRR=${grossRR.toFixed(2)}, costR=${costR.toFixed(4)}, netRR=${netRR.toFixed(2)}, minNetRR=${this.minNetRR}`);

    if (netRR < this.minNetRR) {
      logger.warn(`TREND_FOLLOW: netRR ${netRR.toFixed(2)} < minNetRR ${this.minNetRR} for ${marketData.symbol}`);
      return null;
    }

    return {
      id: `TREND_FOLLOW_${direction}_${Date.now()}`,
      symbol: marketData.symbol,
      strategy: 'TREND_FOLLOW',
      direction,
      alertLevel: 'WATCH',
      entry,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit: takeProfit1,
      netRR: +netRR.toFixed(2),
      riskRewardRatio: +netRR.toFixed(2),
      distanceToEntry: 0, // MARKET order
      confidence: 'MEDIUM',
      trigger: `Trend follow ${direction}, trend=${analysis.tfSummary.trend}`,
      timestamp: marketData.timestamp
    };
  }

  // ==================== 辅助函数 ====================
  
  private calculateBaseStopDist(price: number, atr: number | null): number | null {
    if (!this.isNum(price) || !this.isNum(atr) || !atr) return null;
    
    const atrStop = atr * 1.5;
    const minPctStop = price * 0.0012; // 0.12%
    const minAbsStop = price * 0.001; // 最小绝对止损
    
    return Math.max(atrStop, minPctStop, minAbsStop);
  }

  private isNum(value: any): value is number {
    if (value === null || value === undefined || value === '') return false;
    const n = +value;
    return Number.isFinite(n);
  }
}