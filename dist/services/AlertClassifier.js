"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertClassifier = void 0;
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
class AlertClassifier {
    atrMultiplier = 1.5;
    watchThreshold = 0.02; // 2%
    readyThreshold = 0.005; // 0.5%
    async classifyAlert(opportunity) {
        try {
            logger_1.logger.info(`Classifying alert for ${opportunity.symbol} ${opportunity.strategy}`);
            const distanceToEntry = opportunity.distanceToEntry || 0;
            const atr = await this.calculateATR(opportunity.symbol);
            const alertLevel = this.determineAlertLevel(distanceToEntry, atr);
            return {
                opportunityId: opportunity.id,
                level: alertLevel,
                distanceToEntry,
                atr,
                estimatedTimeToTrigger: this.estimateTimeToTrigger(distanceToEntry, alertLevel),
                classifiedAt: new Date(),
                opportunity
            };
        }
        catch (error) {
            logger_1.logger.error('Alert classification failed:', error);
            throw error;
        }
    }
    determineAlertLevel(distance, atr) {
        const normalizedDistance = Math.abs(distance);
        if (normalizedDistance <= this.readyThreshold) {
            return types_1.AlertLevel.FIRED;
        }
        else if (normalizedDistance <= atr * this.atrMultiplier) {
            return types_1.AlertLevel.READY;
        }
        else if (normalizedDistance <= this.watchThreshold) {
            return types_1.AlertLevel.WATCH;
        }
        else {
            return types_1.AlertLevel.WATCH; // 默认为WATCH级别
        }
    }
    async calculateATR(_symbol, _period = 14) {
        try {
            // 简化实现，实际应该获取历史K线数据计算真实ATR
            // 这里使用模拟数据
            const baseATR = 0.001; // 0.1%
            const volatilityFactor = Math.random() * 2 + 0.5; // 0.5-2.5倍
            return baseATR * volatilityFactor;
        }
        catch (error) {
            logger_1.logger.error(`ATR calculation failed for ${_symbol}:`, error);
            return 0.001; // 默认ATR
        }
    }
    estimateTimeToTrigger(distance, level) {
        // 估算触发时间（分钟）
        const normalizedDistance = Math.abs(distance);
        switch (level) {
            case types_1.AlertLevel.FIRED:
                return 0; // 已触发
            case types_1.AlertLevel.READY:
                return Math.round(normalizedDistance * 1000); // 距离越近时间越短
            case types_1.AlertLevel.WATCH:
                return Math.round(normalizedDistance * 2000);
            default:
                return 999; // 未知
        }
    }
    async trackStateChange(previousAlert, currentAlert) {
        if (!previousAlert) {
            return true; // 新信号，需要通知
        }
        // 检查是否有级别提升
        const levelUpgrade = this.isLevelUpgrade(previousAlert.level, currentAlert.level);
        if (levelUpgrade) {
            logger_1.logger.info(`Alert level upgraded: ${previousAlert.level} -> ${currentAlert.level} ` +
                `for ${currentAlert.opportunity.symbol}`);
            return true;
        }
        return false;
    }
    isLevelUpgrade(previousLevel, currentLevel) {
        const levelOrder = {
            [types_1.AlertLevel.WATCH]: 1,
            [types_1.AlertLevel.READY]: 2,
            [types_1.AlertLevel.FIRED]: 3
        };
        return levelOrder[currentLevel] > levelOrder[previousLevel];
    }
    async getAlertHistory(_opportunityId) {
        // 简化实现，实际应该从数据库获取历史记录
        return [];
    }
}
exports.AlertClassifier = AlertClassifier;
//# sourceMappingURL=AlertClassifier.js.map