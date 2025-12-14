import { Router } from 'express';
import { HealthMonitor } from '../services/HealthMonitor';
import { logger } from '../utils/logger';

const router = Router();
const healthMonitor = new HealthMonitor();

// 健康检查端点
router.get('/', async (_req, res) => {
  try {
    const health = await healthMonitor.getHealthEndpoint();
    
    // 根据状态设置HTTP状态码
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'critical',
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

// 详细系统状态
router.get('/status', async (_req, res) => {
  try {
    const status = await healthMonitor.getSystemStatus();
    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 重启健康监控
router.post('/restart', async (_req, res) => {
  try {
    await healthMonitor.restart();
    res.json({ message: 'Health monitor restarted' });
  } catch (error) {
    logger.error('Health monitor restart failed:', error);
    res.status(500).json({ error: 'Restart failed' });
  }
});

export default router;