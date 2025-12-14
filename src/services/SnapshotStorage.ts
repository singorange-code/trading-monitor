import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { TradingOpportunity, DataSnapshot } from '../types';


export class SnapshotStorage {
  private readonly storageDir: string;
  private readonly maxSnapshots: number = 100;
  private readonly retentionHours: number = 24;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'snapshots');
    this.ensureStorageDir();
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
    }
  }

  async saveSnapshot(opportunity: TradingOpportunity, marketData: any): Promise<string> {
    try {
      const snapshotId = uuidv4();
      const snapshot: DataSnapshot = {
        id: snapshotId,
        timestamp: new Date(),
        symbol: opportunity.symbol,
        marketData,
        analysis: {
          symbol: opportunity.symbol,
          timestamp: opportunity.timestamp,
          price: opportunity.entryPrice,
          indicators: {
            sma20: 0, sma50: 0,
            bollinger: { upper: 0, middle: 0, lower: 0 },
            rsi: 50, macd: { macd: 0, signal: 0, histogram: 0 },
            atr: 0.01
          },
          strategies: [],
          riskMetrics: { volatility: 0, liquidity: 0, marketCap: 0, volume24h: 0 },
          marketCondition: { trend: 'BULLISH', volatility: 'MEDIUM', volume: 'MEDIUM' }
        },
        opportunities: [opportunity],
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };

      const filePath = path.join(this.storageDir, `${snapshotId}.json`);
      await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
      
      logger.info(`Snapshot saved: ${snapshotId}`);
      
      // 异步清理旧快照
      this.cleanupOldSnapshots().catch(error => 
        logger.error('Cleanup failed:', error)
      );

      return snapshotId;
    } catch (error) {
      logger.error('Failed to save snapshot:', error);
      throw error;
    }
  }

  async getSnapshot(snapshotId: string): Promise<DataSnapshot | null> {
    try {
      const filePath = path.join(this.storageDir, `${snapshotId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to read snapshot ${snapshotId}:`, error);
      }
      return null;
    }
  }
  async listSnapshots(limit: number = 50): Promise<DataSnapshot[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      // 按修改时间排序
      const fileStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          return { file, mtime: stats.mtime };
        })
      );

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      const recentFiles = fileStats.slice(0, limit);
      const snapshots: DataSnapshot[] = [];

      for (const { file } of recentFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          snapshots.push(JSON.parse(data));
        } catch (error) {
          logger.warn(`Failed to read snapshot file ${file}:`, error);
        }
      }

      return snapshots;
    } catch (error) {
      logger.error('Failed to list snapshots:', error);
      return [];
    }
  }

  async cleanupOldSnapshots(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      if (jsonFiles.length <= this.maxSnapshots) {
        return; // 未超过限制
      }

      // 获取文件信息并排序
      const fileStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
      );

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 删除超出限制的文件
      const filesToDelete = fileStats.slice(this.maxSnapshots);
      let deletedCount = 0;

      for (const { filePath } of filesToDelete) {
        try {
          await fs.unlink(filePath);
          deletedCount++;
        } catch (error) {
          logger.warn(`Failed to delete snapshot ${filePath}:`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old snapshots`);
      }
    } catch (error) {
      logger.error('Cleanup operation failed:', error);
    }
  }

  async cleanupExpiredSnapshots(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      let deletedCount = 0;

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to process snapshot ${file}:`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired snapshots`);
      }
    } catch (error) {
      logger.error('Expired cleanup operation failed:', error);
    }
  }

  async getStorageStats(): Promise<{
    totalSnapshots: number;
    totalSize: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  }> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      let totalSize = 0;
      let oldestTime: Date | null = null;
      let newestTime: Date | null = null;

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const stats = await fs.stat(filePath);
          
          totalSize += stats.size;
          
          if (!oldestTime || stats.mtime < oldestTime) {
            oldestTime = stats.mtime;
          }
          
          if (!newestTime || stats.mtime > newestTime) {
            newestTime = stats.mtime;
          }
        } catch (error) {
          logger.warn(`Failed to get stats for ${file}:`, error);
        }
      }

      return {
        totalSnapshots: jsonFiles.length,
        totalSize,
        oldestSnapshot: oldestTime,
        newestSnapshot: newestTime
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return {
        totalSnapshots: 0,
        totalSize: 0,
        oldestSnapshot: null,
        newestSnapshot: null
      };
    }
  }
}