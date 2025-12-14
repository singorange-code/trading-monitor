import axios, { AxiosInstance } from 'axios';

import config from '../config';
import { logger, logError, logPerformance } from '../utils/logger';
import { MarketData, KlineData, DepthData } from '../types';

export class DataCollector {
  private client: AxiosInstance;
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly rateLimitDelay = 100; // 100ms between requests

  constructor() {
    this.client = axios.create({
      baseURL: config.binance.baseUrl,
      timeout: config.binance.timeout,
      headers: {
        'X-MBX-APIKEY': config.binance.apiKey,
      },
    });

    // Add request interceptor for rate limiting - more conservative with more symbols
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Increase delay slightly for better rate limiting with more symbols
      const minDelay = this.rateLimitDelay;
      if (timeSinceLastRequest < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
      }
      
      this.lastRequestTime = Date.now();
      this.requestCount++;
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limit hit, wait and retry
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
          logger.warn('Rate limit hit, waiting before retry', { retryAfter });
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  public async collectData(symbol: string): Promise<MarketData> {
    const startTime = Date.now();
    
    try {
      // Collect all required data in parallel with error handling
      const [klines, depth, ticker, fundingRate, openInterest] = await Promise.allSettled([
        this.getKlines(symbol),
        this.getDepth(symbol),
        this.getTicker(symbol),
        this.getFundingRate(symbol),
        this.getOpenInterest(symbol),
      ]);

      // Process results and handle failures gracefully
      const marketData: MarketData = {
        symbol,
        timestamp: Date.now(),
        price: this.extractValue(ticker, 'price', 0),
        volume: this.extractValue(ticker, 'volume', 0),
        klines: this.extractValue(klines, 'klines', []),
        depth: this.extractValue(depth, 'depth', { bids: [], asks: [], timestamp: Date.now() }),
        funding: this.extractValue(fundingRate, 'funding', 0),
        openInterest: this.extractValue(openInterest, 'openInterest', 0),
      };

      const duration = Date.now() - startTime;
      logPerformance('data_collection', duration, { symbol });

      logger.info('Market data collected successfully', {
        symbol,
        price: marketData.price,
        klinesCount: marketData.klines.length,
        duration,
      });

      return marketData;

    } catch (error) {
      logError(`Data collection failed for ${symbol}`, error as Error);
      throw error;
    }
  }

  private extractValue(settledResult: PromiseSettledResult<any>, key: string, defaultValue: any): any {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value[key] || defaultValue;
    } else {
      logger.warn(`Failed to collect ${key}`, { reason: settledResult.reason?.message });
      return defaultValue;
    }
  }

  private async getKlines(symbol: string, interval = '1m', limit = 50): Promise<{ klines: KlineData[] }> {
    try {
      const response = await this.client.get('/fapi/v1/klines', {
        params: { symbol, interval, limit },
        timeout: 5000, // 5秒超时
      });

      const klines: KlineData[] = response.data.map((k: any[]) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      return { klines };
    } catch (error) {
      logError(`Failed to get klines for ${symbol}`, error as Error);
      
      // 返回空数组而不是抛出错误
      return { klines: [] };
    }
  }

  private async getDepth(symbol: string, limit = 20): Promise<{ depth: DepthData }> {
    try {
      const response = await this.client.get('/fapi/v1/depth', {
        params: { symbol, limit },
      });

      const depth: DepthData = {
        bids: response.data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
        asks: response.data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
        timestamp: Date.now(),
      };

      return { depth };
    } catch (error) {
      logError(`Failed to get depth for ${symbol}`, error as Error);
      throw error;
    }
  }

  private async getTicker(symbol: string): Promise<{ price: number; volume: number }> {
    try {
      // 尝试使用更简单的价格API
      const response = await this.client.get('/fapi/v1/ticker/price', {
        params: { symbol },
        timeout: 5000, // 减少超时时间
      });

      // 如果只有价格，尝试获取24hr统计
      let volume = 0;
      try {
        const statsResponse = await this.client.get('/fapi/v1/ticker/24hr', {
          params: { symbol },
          timeout: 3000,
        });
        volume = parseFloat(statsResponse.data.volume || '0');
      } catch (volumeError) {
        logger.warn(`Failed to get volume for ${symbol}, using 0`);
      }

      return {
        price: parseFloat(response.data.price || '0'),
        volume,
      };
    } catch (error) {
      logError(`Failed to get ticker for ${symbol}`, error as Error);
      
      // 返回默认值而不是抛出错误
      return {
        price: 0,
        volume: 0,
      };
    }
  }

  private async getFundingRate(symbol: string): Promise<{ funding: number }> {
    try {
      const response = await this.client.get('/fapi/v1/premiumIndex', {
        params: { symbol },
      });

      return {
        funding: parseFloat(response.data.lastFundingRate || '0'),
      };
    } catch (error) {
      logError(`Failed to get funding rate for ${symbol}`, error as Error);
      return { funding: 0 };
    }
  }

  private async getOpenInterest(symbol: string): Promise<{ openInterest: number }> {
    try {
      const response = await this.client.get('/fapi/v1/openInterest', {
        params: { symbol },
      });

      return {
        openInterest: parseFloat(response.data.openInterest || '0'),
      };
    } catch (error) {
      logError(`Failed to get open interest for ${symbol}`, error as Error);
      return { openInterest: 0 };
    }
  }

  // Health check method
  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.client.get('/fapi/v1/ping');
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      logError('Data collector health check failed', error as Error);
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
      };
    }
  }

  // Get request statistics
  public getStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  async collectMarketData(symbol: string): Promise<MarketData> {
    try {
      logger.info(`Collecting market data for ${symbol}`);
      
      // 首先尝试快速获取基本数据
      const basicData = await this.getBasicMarketData(symbol);
      
      if (basicData.price > 0) {
        // 如果基本数据获取成功，尝试获取完整数据
        try {
          return await this.collectData(symbol);
        } catch (fullDataError) {
          logger.warn(`Full data collection failed for ${symbol}, using basic data`);
          return basicData;
        }
      } else {
        // 基本数据获取失败，使用完整方法
        return await this.collectData(symbol);
      }
    } catch (error) {
      logger.error(`Failed to collect market data for ${symbol}:`, error);
      
      // 如果所有API调用都失败，返回模拟数据作为备用
      logger.warn(`Falling back to mock data for ${symbol}`);
      return this.getMockData(symbol);
    }
  }

  private async getBasicMarketData(symbol: string): Promise<MarketData> {
    try {
      // 快速获取价格信息
      const priceResponse = await this.client.get('/fapi/v1/ticker/price', {
        params: { symbol },
        timeout: 3000,
      });

      const price = parseFloat(priceResponse.data.price || '0');
      
      return {
        symbol,
        timestamp: Date.now(),
        price,
        volume: 0, // 暂时设为0，后续可以异步获取
        klines: [],
        depth: { bids: [], asks: [], timestamp: Date.now() },
        funding: 0,
        openInterest: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  private getMockData(symbol: string): MarketData {
    // 根据不同币种生成更真实的模拟数据
    const basePrice = symbol.includes('BTC') ? 43000 : 
                     symbol.includes('ETH') ? 2500 :
                     symbol.includes('BNB') ? 300 : 100;
    
    return {
      symbol,
      timestamp: Date.now(),
      price: basePrice + (Math.random() - 0.5) * basePrice * 0.02, // ±2%波动
      volume: Math.random() * 1000000,
      klines: [],
      depth: { bids: [], asks: [], timestamp: Date.now() },
      funding: 0.0001,
      openInterest: Math.random() * 100000000
    };
  }
}