import { Router } from 'express';
import { logger } from '../utils/logger';
import config from '../config';

const router = Router();

// 获取配置信息（敏感信息已过滤）
router.get('/', (_req, res) => {
  try {
    const safeConfig = {
      server: {
        port: config.server.port,
        baseUrl: config.server.baseUrl
      },
      monitoring: {
        symbols: config.monitoring.symbols,
        interval: config.monitoring.interval,
        strategies: config.monitoring.strategies
      },
      risk: {
        minNetRR: config.risk.minNetRR,
        maxAlertsPerHour: config.risk.maxAlertsPerHour
      },
      alerts: {
        cooldownPeriod: config.alerts.cooldownPeriod,
        levels: config.alerts.levels
      }
    };
    
    res.json(safeConfig);
  } catch (error) {
    logger.error('Failed to get config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新监控符号列表
router.put('/symbols', (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }
    
    // 验证符号格式
    const validSymbols = symbols.filter(s => 
      typeof s === 'string' && s.match(/^[A-Z]+USDT$/)
    );
    
    if (validSymbols.length !== symbols.length) {
      return res.status(400).json({ 
        error: 'Invalid symbol format. Use format like BTCUSDT' 
      });
    }
    
    config.monitoring.symbols = validSymbols;
    logger.info(`Updated monitoring symbols: ${validSymbols.join(', ')}`);
    
    return res.json({ 
      message: 'Symbols updated successfully',
      symbols: validSymbols 
    });
  } catch (error) {
    logger.error('Failed to update symbols:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新监控间隔
router.put('/interval', (req, res) => {
  try {
    const { interval } = req.body;
    
    if (typeof interval !== 'number' || interval < 10 || interval > 300) {
      return res.status(400).json({ 
        error: 'Interval must be between 10 and 300 seconds' 
      });
    }
    
    config.monitoring.interval = interval;
    logger.info(`Updated monitoring interval: ${interval}s`);
    
    return res.json({ 
      message: 'Interval updated successfully',
      interval 
    });
  } catch (error) {
    logger.error('Failed to update interval:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取推荐的热门交易对
router.get('/popular-symbols', (_req, res) => {
  try {
    const popularSymbols = [
      // 主流币种
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT',
      // 热门 Layer 1
      'SOLUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'ATOMUSDT',
      // DeFi 代币
      'LINKUSDT', 'UNIUSDT', 'AAVEUSDT', 'SUSHIUSDT',
      // 支付币种
      'XRPUSDT', 'LTCUSDT', 'XLMUSDT',
      // 存储和基础设施
      'FILUSDT', 'STORJUSDT',
      // Layer 2
      'MATICUSDT', 'OPUSDT', 'ARBUSDT',
      // Meme 币
      'DOGEUSDT', 'SHIBUSDT',
      // 新兴项目
      'APTUSDT', 'SUIUSDT', 'INJUSDT'
    ];
    
    res.json({
      symbols: popularSymbols,
      categories: {
        'Major Coins': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
        'Layer 1': ['SOLUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'ATOMUSDT'],
        'DeFi': ['LINKUSDT', 'UNIUSDT', 'AAVEUSDT', 'SUSHIUSDT'],
        'Payments': ['XRPUSDT', 'LTCUSDT', 'XLMUSDT'],
        'Storage': ['FILUSDT', 'STORJUSDT'],
        'Layer 2': ['MATICUSDT', 'OPUSDT', 'ARBUSDT'],
        'Meme': ['DOGEUSDT', 'SHIBUSDT'],
        'Emerging': ['APTUSDT', 'SUIUSDT', 'INJUSDT']
      }
    });
  } catch (error) {
    logger.error('Failed to get popular symbols:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 测试符号是否可用
router.post('/test-symbols', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }
    
    const results = [];
    
    for (const symbol of symbols) {
      try {
        // 简单的价格检查来验证符号是否存在
        const response = await fetch(`${config.binance.baseUrl}/fapi/v1/ticker/price?symbol=${symbol}`);
        const data = await response.json() as any;
        
        if (response.ok && data.price) {
          results.push({
            symbol,
            available: true,
            price: parseFloat(data.price),
            message: 'Symbol is available'
          });
        } else {
          results.push({
            symbol,
            available: false,
            message: data.msg || 'Symbol not found'
          });
        }
      } catch (error) {
        results.push({
          symbol,
          available: false,
          message: 'Failed to check symbol'
        });
      }
    }
    
    return res.json({ results });
  } catch (error) {
    logger.error('Failed to test symbols:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;