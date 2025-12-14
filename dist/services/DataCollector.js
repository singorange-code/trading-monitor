"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const logger_1 = require("../utils/logger");
class DataCollector {
    client;
    lastRequestTime = 0;
    requestCount = 0;
    rateLimitDelay = 100; // 100ms between requests
    constructor() {
        this.client = axios_1.default.create({
            baseURL: config_1.default.binance.baseUrl,
            timeout: config_1.default.binance.timeout,
            headers: {
                'X-MBX-APIKEY': config_1.default.binance.apiKey,
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
        this.client.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 429) {
                // Rate limit hit, wait and retry
                const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
                logger_1.logger.warn('Rate limit hit, waiting before retry', { retryAfter });
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.client.request(error.config);
            }
            throw error;
        });
    }
    async collectData(symbol) {
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
            const marketData = {
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
            (0, logger_1.logPerformance)('data_collection', duration, { symbol });
            logger_1.logger.info('Market data collected successfully', {
                symbol,
                price: marketData.price,
                klinesCount: marketData.klines.length,
                duration,
            });
            return marketData;
        }
        catch (error) {
            (0, logger_1.logError)(`Data collection failed for ${symbol}`, error);
            throw error;
        }
    }
    extractValue(settledResult, key, defaultValue) {
        if (settledResult.status === 'fulfilled') {
            return settledResult.value[key] || defaultValue;
        }
        else {
            logger_1.logger.warn(`Failed to collect ${key}`, { reason: settledResult.reason?.message });
            return defaultValue;
        }
    }
    async getKlines(symbol, interval = '1m', limit = 50) {
        try {
            const response = await this.client.get('/fapi/v1/klines', {
                params: { symbol, interval, limit },
                timeout: 5000, // 5秒超时
            });
            const klines = response.data.map((k) => ({
                openTime: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
            }));
            return { klines };
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to get klines for ${symbol}`, error);
            // 返回空数组而不是抛出错误
            return { klines: [] };
        }
    }
    async getDepth(symbol, limit = 20) {
        try {
            const response = await this.client.get('/fapi/v1/depth', {
                params: { symbol, limit },
            });
            const depth = {
                bids: response.data.bids.map((b) => [parseFloat(b[0]), parseFloat(b[1])]),
                asks: response.data.asks.map((a) => [parseFloat(a[0]), parseFloat(a[1])]),
                timestamp: Date.now(),
            };
            return { depth };
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to get depth for ${symbol}`, error);
            throw error;
        }
    }
    async getTicker(symbol) {
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
            }
            catch (volumeError) {
                logger_1.logger.warn(`Failed to get volume for ${symbol}, using 0`);
            }
            return {
                price: parseFloat(response.data.price || '0'),
                volume,
            };
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to get ticker for ${symbol}`, error);
            // 返回默认值而不是抛出错误
            return {
                price: 0,
                volume: 0,
            };
        }
    }
    async getFundingRate(symbol) {
        try {
            const response = await this.client.get('/fapi/v1/premiumIndex', {
                params: { symbol },
            });
            return {
                funding: parseFloat(response.data.lastFundingRate || '0'),
            };
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to get funding rate for ${symbol}`, error);
            return { funding: 0 };
        }
    }
    async getOpenInterest(symbol) {
        try {
            const response = await this.client.get('/fapi/v1/openInterest', {
                params: { symbol },
            });
            return {
                openInterest: parseFloat(response.data.openInterest || '0'),
            };
        }
        catch (error) {
            (0, logger_1.logError)(`Failed to get open interest for ${symbol}`, error);
            return { openInterest: 0 };
        }
    }
    // Health check method
    async healthCheck() {
        const startTime = Date.now();
        try {
            await this.client.get('/fapi/v1/ping');
            const latency = Date.now() - startTime;
            return {
                status: 'healthy',
                latency,
            };
        }
        catch (error) {
            (0, logger_1.logError)('Data collector health check failed', error);
            return {
                status: 'unhealthy',
                latency: Date.now() - startTime,
            };
        }
    }
    // Get request statistics
    getStats() {
        return {
            requestCount: this.requestCount,
            lastRequestTime: this.lastRequestTime,
        };
    }
    async collectMarketData(symbol) {
        try {
            logger_1.logger.info(`Collecting market data for ${symbol}`);
            // 首先尝试快速获取基本数据
            const basicData = await this.getBasicMarketData(symbol);
            if (basicData.price > 0) {
                // 如果基本数据获取成功，尝试获取完整数据
                try {
                    return await this.collectData(symbol);
                }
                catch (fullDataError) {
                    logger_1.logger.warn(`Full data collection failed for ${symbol}, using basic data`);
                    return basicData;
                }
            }
            else {
                // 基本数据获取失败，使用完整方法
                return await this.collectData(symbol);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to collect market data for ${symbol}:`, error);
            // 如果所有API调用都失败，返回模拟数据作为备用
            logger_1.logger.warn(`Falling back to mock data for ${symbol}`);
            return this.getMockData(symbol);
        }
    }
    async getBasicMarketData(symbol) {
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
        }
        catch (error) {
            throw error;
        }
    }
    getMockData(symbol) {
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
exports.DataCollector = DataCollector;
//# sourceMappingURL=DataCollector.js.map