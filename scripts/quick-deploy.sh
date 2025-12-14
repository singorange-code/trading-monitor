#!/bin/bash

# 云端交易监控系统 - 快速部署脚本

echo "🚀 开始部署云端交易监控系统..."

# 1. 检查 Node.js 版本
echo "📋 检查环境..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ 错误: 需要 Node.js 18 或更高版本"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# 2. 安装依赖
echo "📦 安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 3. 构建项目
echo "🔨 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

# 4. 运行测试
echo "🧪 运行测试..."
npm run test:integration
if [ $? -ne 0 ]; then
    echo "❌ 测试失败"
    exit 1
fi

# 5. 部署前检查
echo "🔍 部署前检查..."
node dist/utils/deployment-check.js
if [ $? -ne 0 ]; then
    echo "❌ 部署前检查失败"
    exit 1
fi

echo "✅ 所有检查通过！"
echo ""
echo "🎉 系统已准备好部署！"
echo ""
echo "下一步："
echo "1. 将代码推送到 GitHub"
echo "2. 在 Railway 创建新项目"
echo "3. 连接 GitHub 仓库"
echo "4. 配置环境变量"
echo "5. 部署完成！"
echo ""
echo "详细部署指南请查看: DEPLOYMENT.md"