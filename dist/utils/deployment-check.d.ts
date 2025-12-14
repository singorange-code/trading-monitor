/**
 * 部署前检查 - 验证系统配置和依赖
 */
export declare class DeploymentCheck {
    runPreDeploymentChecks(): Promise<boolean>;
    private checkEnvironmentVariables;
    private checkConfiguration;
    private checkNetworkConnectivity;
    private checkDependencies;
    private checkPortAvailability;
    generateDeploymentReport(): any;
}
//# sourceMappingURL=deployment-check.d.ts.map