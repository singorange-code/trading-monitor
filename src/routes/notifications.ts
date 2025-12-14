import { Router } from 'express';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';

const router = Router();
const notificationService = new NotificationService();

// 发送测试邮件
router.post('/test', async (_req, res) => {
  try {
    logger.info('Sending test email...');
    const result = await notificationService.sendTestEmail();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Test email endpoint failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 检查邮件服务状态
router.get('/status', async (_req, res) => {
  try {
    const isConnected = await notificationService.testConnection();
    const queueStatus = notificationService.getQueueStatus();
    
    res.json({
      connected: isConnected,
      queue: queueStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Notification status check failed:', error);
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 创建测试账户
router.post('/create-test-account', async (_req, res) => {
  try {
    const testAccount = await notificationService.createTestAccount();
    
    if (testAccount) {
      res.json({
        success: true,
        account: testAccount,
        instructions: 'Use these credentials in your .env file for testing'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create test account'
      });
    }
  } catch (error) {
    logger.error('Create test account failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;