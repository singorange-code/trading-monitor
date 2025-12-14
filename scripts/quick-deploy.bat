@echo off
echo 🚀 开始部署云端交易监控系统...

REM 1. 检查 Node.js
echo 📋 检查环境...
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
echo ✅ Node.js 版本:
node -v

REM 2. 安装依赖
echo 📦 安装依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 3. 构建项目
echo 🔨 构建项目...
npm run build
if errorlevel 1 (
    echo ❌ 项目构建失败
    pause
    exit /b 1
)

REM 4. 运行测试
echo 🧪 运行测试...
npm run test:integration
if errorlevel 1 (
    echo ❌ 测试失败
    pause
    exit /b 1
)

REM 5. 部署前检查
echo 🔍 部署前检查...
node dist/utils/deployment-check.js
if errorlevel 1 (
    echo ❌ 部署前检查失败
    pause
    exit /b 1
)

echo ✅ 所有检查通过！
echo.
echo 🎉 系统已准备好部署！
echo.
echo 下一步：
echo 1. 将代码推送到 GitHub
echo 2. 在 Railway 创建新项目
echo 3. 连接 GitHub 仓库
echo 4. 配置环境变量
echo 5. 部署完成！
echo.
echo 详细部署指南请查看: DEPLOYMENT.md
pause