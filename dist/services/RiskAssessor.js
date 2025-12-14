"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessor = void 0;
const logger_1 = require("../utils/logger");
class RiskAssessor {
    minNetRR = 2.0;
    maxVolatilityThreshold = 0.05; // 5%
    minLiquidityThreshold = 1000000; // $1M
    async assessRisk(opportunity) {
        try {
            logger_1.logger.info(`Assessing risk for ${opportunity.symbol} ${opportunity.strategy}`);
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
        }
        catch (error) {
            logger_1.logger.error('Risk assessment failed:', error);
            throw error;
        }
    }
    async calculateRiskFactors(opportunity) {
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
    calculateRiskScore(factors) {
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
    isRiskAcceptable(factors) {
        return factors.netRR >= this.minNetRR &&
            factors.volatility <= this.maxVolatilityThreshold &&
            factors.liquidity >= this.minLiquidityThreshold &&
            factors.marketCondition >= 0.5;
    }
    async calculateVolatility(_symbol) {
        // 简化实现，实际应该计算ATR或标准差
        return Math.random() * 0.03 + 0.01; // 1-4%
    }
    async calculateLiquidity(_symbol) {
        // 简化实现，实际应该获取24h交易量
        return Math.random() * 5000000 + 1000000; // $1M-$6M
    }
    async assessMarketCondition() {
        // 简化实现，实际应该分析市场整体状况
        return Math.random() * 0.4 + 0.6; // 0.6-1.0
    }
    async detectAbnormalMarket() {
        try {
            const volatility = await this.calculateVolatility('BTCUSDT');
            const marketCondition = await this.assessMarketCondition();
            return volatility > this.maxVolatilityThreshold * 2 || marketCondition < 0.3;
        }
        catch (error) {
            logger_1.logger.error('Abnormal market detection failed:', error);
            return true; // 保守处理，检测失败时认为市场异常
        }
    }
}
exports.RiskAssessor = RiskAssessor;
//# sourceMappingURL=RiskAssessor.js.map