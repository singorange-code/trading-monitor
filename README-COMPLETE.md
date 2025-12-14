# Cloud Trading Monitor - 完整功能版本

24/7 云端交易机会监控系统 - 基于"风险优先 + 人在回路确认"理念设计

## 🎯 核心功能

### 📊 实时市场监控
- **多币种支持**: 同时监控15+主流加密货币交易对
- **高频数据采集**: 每30秒采集K线、深度、持仓量等完整市场数据
- **智能批处理**: 优化API调用，避免速率限制

### 🔍 智能机会识别
- **全维分析算法**: 移植V12.6.4版本完整交易策略
- **多策略支持**: BREAKOUT、PULLBACK、TREND_FOLLOW三大策略
- **技术指标**: ATR、EMA、布林带等专业指标计算

### ⚠️ 三档提醒机制
- **WATCH**: 价格接近触发条件时预警
- **READY**: 满足全部条件但未成交时准备
- **FIRED**: 检测到实际触发时立即通知

### 🛡️ 风险优先控制
- **严格门槛**: 要求净风险收益比 ≥ 2.0
- **流动性检查**: 确保足够的市场深度
- **异常检测**: 自动识别极端市场条件并暂停通知

### 📧 智能通知系统
- **结构化邮件**: 包含完整交易信息和风险提示
- **去重冷却**: 30分钟内避免重复通知
- **快照链接**: 一键获取触发时刻的完整市场数据

### 🔄 实时数据推送
- **WebSocket支持**: 实时推送给本地应用
- **状态同步**: 监控状态和配置实时同步
- **离线恢复**: 网络恢复后自动重连

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装和配置

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置邮件服务和监控参数

# 3. 构建项目
npm run build

# 4. 运行部署前检查
npm run deploy

# 5. 启动服务
npm start
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev

# 运行集成测试
npm run test:integration

# 代码格式化
npm run format
```

## 📡 API 接口

### 基础接口
- `GET /` - 服务状态和版本信息
- `GET /api/health` - 系统健康检查
- `GET /api/health/status` - 详细系统状态

### 配置管理
- `GET /api/config` - 获取当前配置
- `PUT /api/config/symbols` - 更新监控币种列表
- `PUT /api/config/interval` - 更新监控间隔
- `GET /api/config/popular-symbols` - 获取推荐币种列表
- `POST /api/config/test-symbols` - 测试币种可用性

### 数据快照
- `GET /api/snapshots/:id` - 获取指定快照数据
- `GET /api/snapshots` - 获取快照列表

### 通知测试
- `POST /api/notifications/test` - 发送测试邮件
- `GET /api/notifications/status` - 邮件服务状态

## 🌐 WebSocket 接口

连接地址: `ws://localhost:3002` (开发环境)

### 消息类型
```javascript
// 客户端发送
{
  "type": "PING",
  "timestamp": 1640995200000
}

{
  "type": "SUBSCRIBE",
  "data": { "symbols": ["BTCUSDT", "ETHUSDT"] }
}

// 服务端推送
{
  "type": "OPPORTUNITY",
  "data": {
    "opportunity": { /* 交易机会详情 */ },
    "alertLevel": "FIRED"
  },
  "timestamp": 1640995200000
}

{
  "type": "STATUS",
  "data": {
    "cycleTime": 1500,
    "opportunities": 5,
    "alerts": 2,
    "symbols": 15
  },
  "timestamp": 1640995200000
}
```

## 🔧 配置说明

### 环境变量

```bash
# 服务器配置
PORT=3002
NODE_ENV=production
BASE_URL=https://your-app.railway.app

# 监控配置
SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,ADAUSDT,DOGEUSDT,XRPUSDT,AVAXUSDT,DOTUSDT,MATICUSDT,LINKUSDT,LTCUSDT,UNIUSDT,ATOMUSDT,FILUSDT
MONITOR_INTERVAL_SECONDS=30
MIN_NET_RR=2.0

# 邮件配置 (选择一种)
# SendGrid (推荐)
SENDGRID_API_KEY=your_sendgrid_key

# 或 SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
TO_EMAIL=recipient1@example.com,recipient2@example.com
```

### 支持的币种类别

- **主流币**: BTC, ETH, BNB
- **Layer 1**: SOL, ADA, AVAX, DOT, ATOM
- **DeFi**: LINK, UNI, AAVE
- **支付币**: XRP, LTC
- **Layer 2**: MATIC, OP, ARB
- **Meme币**: DOGE, SHIB
- **新兴项目**: APT, SUI, INJ

## 🚀 部署指南

### Railway 部署

1. 连接 GitHub 仓库到 Railway
2. 设置环境变量
3. 自动部署完成

### 手动部署

```bash
# 1. 构建项目
npm run build

# 2. 运行部署检查
npm run deploy

# 3. 启动生产服务
NODE_ENV=production npm start
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3002
CMD ["npm", "start"]
```

## 📊 监控指标

### 性能指标
- 数据采集延迟: < 5秒
- 快照检索时间: < 5秒
- 监控周期完成时间: < 30秒
- API响应时间: < 1秒

### 可靠性指标
- 系统可用性: > 99.5%
- 数据采集成功率: > 95%
- 邮件发送成功率: > 98%
- 自动恢复时间: < 5分钟

## 🔍 故障排查

### 常见问题

1. **邮件发送失败**
   - 检查SMTP配置或SendGrid API密钥
   - 验证收件人邮箱地址

2. **数据采集异常**
   - 检查网络连接
   - 验证币安API可访问性

3. **内存使用过高**
   - 检查快照清理机制
   - 调整监控间隔

### 日志查看

```bash
# 查看实时日志
tail -f logs/monitor.log

# 查看错误日志
grep "ERROR" logs/monitor.log
```

## 🧪 测试

### 运行测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 性能测试
npm run test:performance
```

### 测试覆盖

- ✅ 数据采集器测试
- ✅ 机会识别引擎测试
- ✅ 风险评估模块测试
- ✅ 通知系统测试
- ✅ WebSocket服务测试
- ✅ 完整流程集成测试

## 📈 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Collector │────│ Opportunity     │────│ Risk Assessor   │
│   (Binance API) │    │ Engine          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Alert Classifier│────│ Deduplication   │────│ Notification    │
│                 │    │ Cooler          │    │ Service         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Snapshot Storage│    │ WebSocket       │    │ Health Monitor  │
│                 │    │ Service         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 支持

如有问题或建议，请创建 Issue 或联系开发团队。

---

**⚠️ 风险提示**: 本系统仅提供市场机会提醒，不构成投资建议。交易有风险，投资需谨慎。