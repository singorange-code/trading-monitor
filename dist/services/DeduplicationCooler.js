"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeduplicationCooler = void 0;
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
class DeduplicationCooler {
    cooldownMap = new Map();
    cooldownPeriod = 30 * 60 * 1000; // 30分钟
    notificationStats = new Map();
    adaptiveThresholds = new Map();
    async shouldNotify(alert) {
        try {
            const key = this.generateKey(alert);
            const existing = this.cooldownMap.get(key);
            const now = new Date();
            // 检查是否在冷却期内
            if (existing && now < existing.cooldownUntil) {
                // 检查是否有级别提升
                if (this.isLevelUpgrade(existing.level, alert.level)) {
                    logger_1.logger.info(`Level upgrade detected, bypassing cooldown for ${key}`);
                    this.updateCooldownEntry(key, alert, now);
                    return true;
                }
                logger_1.logger.debug(`Alert ${key} is in cooldown until ${existing.cooldownUntil}`);
                return false;
            }
            // 检查自适应门槛
            if (await this.isAboveAdaptiveThreshold(alert)) {
                this.updateCooldownEntry(key, alert, now);
                this.updateNotificationStats(alert.opportunity.symbol);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('Deduplication check failed:', error);
            return false; // 保守处理
        }
    }
    generateKey(alert) {
        return `${alert.opportunity.symbol}_${alert.opportunity.strategy}_${alert.level}`;
    }
    isLevelUpgrade(existingLevel, newLevel) {
        const levelOrder = {
            [types_1.AlertLevel.WATCH]: 1,
            [types_1.AlertLevel.READY]: 2,
            [types_1.AlertLevel.FIRED]: 3
        };
        return levelOrder[newLevel] > levelOrder[existingLevel];
    }
    updateCooldownEntry(key, alert, now) {
        const cooldownUntil = new Date(now.getTime() + this.cooldownPeriod);
        this.cooldownMap.set(key, {
            alertId: alert.opportunityId,
            symbol: alert.opportunity.symbol,
            strategy: alert.opportunity.strategy,
            level: alert.level,
            lastNotified: now,
            cooldownUntil
        });
        logger_1.logger.debug(`Updated cooldown for ${key} until ${cooldownUntil}`);
    }
    async isAboveAdaptiveThreshold(alert) {
        const symbol = alert.opportunity.symbol;
        const baseThreshold = this.getBaseThreshold(alert.level);
        const adaptiveThreshold = this.adaptiveThresholds.get(symbol) || baseThreshold;
        // 简化实现：基于风险收益比判断
        const riskReward = alert.opportunity.riskRewardRatio || 0;
        return riskReward >= adaptiveThreshold;
    }
    getBaseThreshold(level) {
        switch (level) {
            case types_1.AlertLevel.FIRED:
                return 2.0;
            case types_1.AlertLevel.READY:
                return 2.5;
            case types_1.AlertLevel.WATCH:
                return 3.0;
            default:
                return 3.0;
        }
    }
    updateNotificationStats(symbol) {
        const current = this.notificationStats.get(symbol) || 0;
        this.notificationStats.set(symbol, current + 1);
        // 每10次通知后调整门槛
        if ((current + 1) % 10 === 0) {
            this.adjustAdaptiveThreshold(symbol);
        }
    }
    adjustAdaptiveThreshold(symbol) {
        const currentThreshold = this.adaptiveThresholds.get(symbol) || 2.0;
        const notificationCount = this.notificationStats.get(symbol) || 0;
        // 如果通知频率过高，提升门槛
        if (notificationCount > 50) {
            const newThreshold = Math.min(currentThreshold * 1.1, 5.0);
            this.adaptiveThresholds.set(symbol, newThreshold);
            logger_1.logger.info(`Adaptive threshold increased for ${symbol}: ${newThreshold}`);
        }
    }
    async mergeSimilarSignals(alerts) {
        if (alerts.length <= 1)
            return alerts;
        const merged = [];
        const processed = new Set();
        for (const alert of alerts) {
            if (processed.has(alert.opportunityId))
                continue;
            const similar = alerts.filter(a => !processed.has(a.opportunityId) &&
                a.opportunity.symbol === alert.opportunity.symbol &&
                Math.abs(a.distanceToEntry - alert.distanceToEntry) < 0.001 // 0.1%以内
            );
            if (similar.length > 1) {
                // 选择最高级别的信号
                const bestAlert = similar.reduce((best, current) => this.compareLevels(current.level, best.level) > 0 ? current : best);
                merged.push(bestAlert);
                similar.forEach(s => processed.add(s.opportunityId));
            }
            else {
                merged.push(alert);
                processed.add(alert.opportunityId);
            }
        }
        return merged;
    }
    compareLevels(level1, level2) {
        const levelOrder = {
            [types_1.AlertLevel.WATCH]: 1,
            [types_1.AlertLevel.READY]: 2,
            [types_1.AlertLevel.FIRED]: 3
        };
        return levelOrder[level1] - levelOrder[level2];
    }
    async cleanupExpiredEntries() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [key, entry] of this.cooldownMap.entries()) {
            if (now > entry.cooldownUntil) {
                this.cooldownMap.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.debug(`Cleaned up ${cleanedCount} expired cooldown entries`);
        }
    }
    getCooldownStatus() {
        const now = new Date();
        const active = Array.from(this.cooldownMap.values())
            .filter(entry => now < entry.cooldownUntil).length;
        return {
            active,
            total: this.cooldownMap.size
        };
    }
}
exports.DeduplicationCooler = DeduplicationCooler;
//# sourceMappingURL=DeduplicationCooler.js.map