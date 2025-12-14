import { logger } from '../utils/logger';
import { TradingOpportunity, AlertLevel, ClassifiedAlert } from '../types';

export class AlertClassifier {
  private readonly atrMultiplier: number = 1.5;
  private readonly watchThreshold: number = 0.02; // 2%
  private readonly readyThreshold: number = 0.005; // 0.5%

  async classifyAlert(opportunity: TradingOpportunity): Promise<ClassifiedAlert> {
    try {
      logger.info(`Classifying alert for ${opportunity.symbol} ${opportunity.strategy}`);

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
    } catch (error) {
      logger.error('Alert classification failed:', error);
      throw error;
    }
  }

  private determineAlertLevel(distance: number, atr: number): AlertLevel {
    const normalizedDistance = Math.abs(distance);
    
    if (normalizedDistance <= this.readyThreshold) {
      return AlertLevel.FIRED;
    } else if (normalizedDistance <= atr * this.atrMultiplier) {
      return AlertLevel.READY;
    } else if (normalizedDistance <= this.watchThreshold) {
      return AlertLevel.WATCH;
    } else {
      return AlertLevel.WATCH; // 默认为WATCH级别
    }
  }

  private async calculateATR(_symbol: string, _period: number = 14): Promise<number> {
    try {
      // 简化实现，实际应该获取历史K线数据计算真实ATR
      // 这里使用模拟数据
      const baseATR = 0.001; // 0.1%
      const volatilityFactor = Math.random() * 2 + 0.5; // 0.5-2.5倍
      return baseATR * volatilityFactor;
    } catch (error) {
      logger.error(`ATR calculation failed for ${_symbol}:`, error);
      return 0.001; // 默认ATR
    }
  }

  private estimateTimeToTrigger(distance: number, level: AlertLevel): number {
    // 估算触发时间（分钟）
    const normalizedDistance = Math.abs(distance);
    
    switch (level) {
      case AlertLevel.FIRED:
        return 0; // 已触发
      case AlertLevel.READY:
        return Math.round(normalizedDistance * 1000); // 距离越近时间越短
      case AlertLevel.WATCH:
        return Math.round(normalizedDistance * 2000);
      default:
        return 999; // 未知
    }
  }

  async trackStateChange(
    previousAlert: ClassifiedAlert | null, 
    currentAlert: ClassifiedAlert
  ): Promise<boolean> {
    if (!previousAlert) {
      return true; // 新信号，需要通知
    }

    // 检查是否有级别提升
    const levelUpgrade = this.isLevelUpgrade(previousAlert.level, currentAlert.level);
    
    if (levelUpgrade) {
      logger.info(
        `Alert level upgraded: ${previousAlert.level} -> ${currentAlert.level} ` +
        `for ${currentAlert.opportunity.symbol}`
      );
      return true;
    }

    return false;
  }

  private isLevelUpgrade(previousLevel: AlertLevel, currentLevel: AlertLevel): boolean {
    const levelOrder = {
      [AlertLevel.WATCH]: 1,
      [AlertLevel.READY]: 2,
      [AlertLevel.FIRED]: 3
    };

    return levelOrder[currentLevel] > levelOrder[previousLevel];
  }

  async getAlertHistory(_opportunityId: string): Promise<ClassifiedAlert[]> {
    // 简化实现，实际应该从数据库获取历史记录
    return [];
  }
}