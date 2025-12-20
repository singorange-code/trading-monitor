import { logger } from '../utils/logger';
import { TradingOpportunity, RiskAssessment } from '../types';
import config from '../config';


export class RiskAssessor {
  private readonly minNetRR: number = config.risk.minNetRR;
  private readonly maxVolatilityThreshold: number = 0.05; // 5%
  private readonly minLiquidityThreshold: number = 1000000; // $1M

  async assessRisk(opportunity: TradingOpportunity): Promise<RiskAssessment> {
    try {
      logger.info(`Assessing risk for ${opportunity.symbol} ${opportunity.strategy}`);

      const riskFactors = await this.calculateRiskFactors(opportunity);
      const riskScore = this.calculateRiskScore(riskFactors);
      const isAcceptable = this.isRiskAcceptable(riskFactors);

      return {
        opportunityId: opportunity.id,
        riskScore,
        isAcceptable,
        factors: riskFactors,
        assessedAt: new Date()
      };
    } catch (error) {
      logger.error('Risk assessment failed:', error);
      throw error;
    }
  }

  private async calculateRiskFactors(opportunity: TradingOpportunity) {
    const netRR = opportunity.riskRewardRatio || 0;
    const volatility = await this.calculateVolatility(opportunity.symbol);
    const liquidity = await this.calculateLiquidity(opportunity.symbol);
    const marketCondition = await this.assessMarketCondition();

    return {
      netRR,
      volatility,
      liquidity,
      marketCondition,
      priceDistance: opportunity.distanceToEntry || 0
    };
  }

  private calculateRiskScore(factors: any): number {
    let score = 0;
    
    // Net RR factor (40% weight)
    if (factors.netRR >= this.minNetRR) {
      score += 40 * Math.min(factors.netRR / 3.0, 1);
    }

    // Volatility factor (25% weight)
    if (factors.volatility <= this.maxVolatilityThreshold) {
      score += 25 * (1 - factors.volatility / this.maxVolatilityThreshold);
    }

    // Liquidity factor (20% weight)
    if (factors.liquidity >= this.minLiquidityThreshold) {
      score += 20 * Math.min(factors.liquidity / (this.minLiquidityThreshold * 5), 1);
    }

    // Market condition factor (15% weight)
    score += 15 * factors.marketCondition;

    return Math.round(score);
  }

  private isRiskAcceptable(factors: any): boolean {
    return factors.netRR >= this.minNetRR &&
           factors.volatility <= this.maxVolatilityThreshold &&
           factors.liquidity >= this.minLiquidityThreshold &&
           factors.marketCondition >= 0.5;
  }

  private async calculateVolatility(_symbol: string): Promise<number> {
    // 简化实现，实际应该计算ATR或标准差
    return Math.random() * 0.03 + 0.01; // 1-4%
  }

  private async calculateLiquidity(_symbol: string): Promise<number> {
    // 简化实现，实际应该获取24h交易量
    return Math.random() * 5000000 + 1000000; // $1M-$6M
  }

  private async assessMarketCondition(): Promise<number> {
    // 简化实现，实际应该分析市场整体状况
    return Math.random() * 0.4 + 0.6; // 0.6-1.0
  }

  async detectAbnormalMarket(): Promise<boolean> {
    try {
      const volatility = await this.calculateVolatility('BTCUSDT');
      const marketCondition = await this.assessMarketCondition();
      
      return volatility > this.maxVolatilityThreshold * 2 || marketCondition < 0.3;
    } catch (error) {
      logger.error('Abnormal market detection failed:', error);
      return true; // 保守处理，检测失败时认为市场异常
    }
  }
}
