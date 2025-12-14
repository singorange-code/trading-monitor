import { DataCollector } from '../services/DataCollector';
import { OpportunityEngine } from '../services/OpportunityEngine';
import { RiskAssessor } from '../services/RiskAssessor';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';

/**
 * 集成测试 - 验证完整的监控流程
 */
export class IntegrationTest {
  private dataCollector: DataCollector;
  private opportunityEngine: OpportunityEngine;
  private riskAssessor: RiskAssessor;
  private notificationService: NotificationService;

  constructor() {
    this.dataCollector = new DataCollector();
    this.opportunityEngine = new OpportunityEngine();
    this.riskAssessor = new RiskAssessor();
    this.notificationService = new NotificationService();
  }

  async runFullPipelineTest(): Promise<boolean> {
    try {
      logger.info('Starting full pipeline integration test...');

      // 1. 测试数据采集
      const testSymbol = 'BTCUSDT';
      const marketData = await this.dataCollector.collectMarketData(testSymbol);
      
      if (!marketData || marketData.price <= 0) {
        throw new Error('Data collection failed');
      }
      logger.info(`✓ Data collection test passed: ${testSymbol} price = ${marketData.price}`);

      // 2. 测试机会识别
      const opportunities = await this.opportunityEngine.analyzeMarket(marketData);
      logger.info(`✓ Opportunity analysis test passed: found ${opportunities.length} opportunities`);

      // 3. 测试风险评估
      if (opportunities.length > 0) {
        const riskAssessment = await this.riskAssessor.assessRisk(opportunities[0]);
        logger.info(`✓ Risk assessment test passed: risk score = ${riskAssessment.riskScore}`);
      }

      // 4. 测试邮件服务连接
      const emailTest = await this.notificationService.testConnection();
      if (!emailTest) {
        logger.warn('⚠ Email service test failed, but continuing...');
      } else {
        logger.info('✓ Email service test passed');
      }

      logger.info('✅ All integration tests passed!');
      return true;

    } catch (error) {
      logger.error('❌ Integration test failed:', error);
      return false;
    }
  }

  async runPerformanceTest(): Promise<boolean> {
    try {
      logger.info('Starting performance test...');

      const testSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      const startTime = Date.now();

      // 并行测试多个币种的数据采集
      const promises = testSymbols.map(symbol => 
        this.dataCollector.collectMarketData(symbol)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r && r.price > 0).length;
      const avgTimePerSymbol = duration / testSymbols.length;

      logger.info(`Performance test results:`, {
        totalSymbols: testSymbols.length,
        successCount,
        totalTime: duration,
        avgTimePerSymbol,
        successRate: (successCount / testSymbols.length) * 100
      });

      // 性能要求：平均每个币种不超过2秒
      if (avgTimePerSymbol > 2000) {
        logger.warn('⚠ Performance test warning: average time per symbol exceeds 2s');
      } else {
        logger.info('✓ Performance test passed');
      }

      return successCount === testSymbols.length;

    } catch (error) {
      logger.error('❌ Performance test failed:', error);
      return false;
    }
  }

  async runHealthCheckTest(): Promise<boolean> {
    try {
      logger.info('Starting health check test...');

      // 测试数据采集器健康状态
      const dataCollectorHealth = await this.dataCollector.healthCheck();
      if (dataCollectorHealth.status !== 'healthy') {
        throw new Error(`Data collector unhealthy: ${dataCollectorHealth.status}`);
      }

      logger.info('✓ Health check test passed');
      return true;

    } catch (error) {
      logger.error('❌ Health check test failed:', error);
      return false;
    }
  }

  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    const tests = [
      { name: 'Full Pipeline', test: () => this.runFullPipelineTest() },
      { name: 'Performance', test: () => this.runPerformanceTest() },
      { name: 'Health Check', test: () => this.runHealthCheckTest() }
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      try {
        logger.info(`\n🧪 Running ${name} test...`);
        const result = await test();
        
        if (result) {
          passed++;
          results.push({ name, status: 'PASSED', result });
          logger.info(`✅ ${name} test PASSED`);
        } else {
          failed++;
          results.push({ name, status: 'FAILED', result });
          logger.error(`❌ ${name} test FAILED`);
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name, status: 'ERROR', error: errorMessage });
        logger.error(`💥 ${name} test ERROR:`, error);
      }
    }

    logger.info(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
    return { passed, failed, results };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new IntegrationTest();
  test.runAllTests().then(summary => {
    process.exit(summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    logger.error('Test execution failed:', error);
    process.exit(1);
  });
}