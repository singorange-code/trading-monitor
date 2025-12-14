/**
 * 集成测试 - 验证完整的监控流程
 */
export declare class IntegrationTest {
    private dataCollector;
    private opportunityEngine;
    private riskAssessor;
    private notificationService;
    constructor();
    runFullPipelineTest(): Promise<boolean>;
    runPerformanceTest(): Promise<boolean>;
    runHealthCheckTest(): Promise<boolean>;
    runAllTests(): Promise<{
        passed: number;
        failed: number;
        results: any[];
    }>;
}
//# sourceMappingURL=integration.test.d.ts.map