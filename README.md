# 云端交易监控系统

24/7 云端交易机会监控系统，基于Node.js + Express构建，支持实时市场数据分析、风险评估、智能提醒分级和邮件通知。

## 🚀 功能特性

### 核心功能
- **实时市场监控**: 30秒间隔监控多个交易对
- **智能机会识别**: 突破、回调、趋势跟随策略
- **风险评估**: 基于风险收益比(≥2.0)的智能过滤
- **分级提醒**: WATCH/READY/FIRED三档提醒系统
- **去重冷却**: 30分钟冷却期，避免重复通知
- **邮件通知**: 结构化邮件模板，包含详细交易信息
- **数据快照**: 自动保存交易机会的完整市场数据
- **健康监控**: 系统状态监控和自动恢复

### API功能
- **RESTful API**: 完整的配置和数据查询接口
- **WebSocket**: 实时推送交易机会和系统状态
- **健康检查**: 系统运行状态和性能指标
- **配置管理**: 动态调整监控参数

## 📦 项目结构

```
cloud-monitor/
├── src/
│   ├── config/           # 配置管理
│   ├── services/         # 核心服务
│   │   ├── DataCollector.ts      # 数据采集器
│   │   ├── OpportunityEngine.ts  # 机会识别引擎
│   │   ├── RiskAssessor.ts       # 风险评估器
│   │   ├── AlertClassifier.ts    # 提醒分级器
│   │   ├── DeduplicationCooler.ts # 去重冷却器
│   │   ├── NotificationService.ts # 通知服务
│   │   ├── SnapshotStorage.ts    # 快照存储
│   │   └── HealthMonitor.ts      # 健康监控
│   ├── routes/           # API路由
│   ├── types/            # TypeScript类型定义
│   ├── utils/            # 工具函数
│   └── server.ts         # 主服务器
├── dist/                 # 编译输出
├── snapshots/            # 数据快照存储
└── logs/                 # 日志文件
```

## 🛠️ 安装和配置

### 1. 安装依赖
```bash
cd cloud-monitor
npm install
```

### 2. 环境配置
复制环境配置模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要参数：
```env
# 服务器配置
PORT=3000
BASE_URL=http://localhost:3000

# 邮件配置 (必需)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
TO_EMAIL=recipient@example.com

# 监控配置
SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT
MONITOR_INTERVAL_SECONDS=30
MIN_NET_RR=2.0
```

### 3. 编译和启动
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📊 API接口

### 基础信息
- `GET /` - 服务状态
- `GET /api/health` - 健康检查
- `GET /api/config` - 获取配置

### 配置管理
- `PUT /api/config/symbols` - 更新监控符号
- `PUT /api/config/interval` - 更新监控间隔

### 数据查询
- `GET /api/snapshots` - 获取快照列表
- `GET /api/snapshots/:id` - 获取特定快照
- `GET /api/snapshots/stats/storage` - 存储统计

### WebSocket
连接到 `ws://localhost:3000` 接收实时更新：
- `OPPORTUNITY` - 新的交易机会
- `STATUS` - 系统状态更新
- `HEARTBEAT` - 心跳检测

## 🔧 核心服务说明

### DataCollector (数据采集器)
- 负责从币安API获取市场数据
- 支持K线、深度、持仓量等数据
- 内置限流和重试机制

### OpportunityEngine (机会识别引擎)
- 实现突破、回调、趋势跟随策略
- 计算技术指标(SMA、BOLL、RSI、MACD)
- 生成交易机会候选

### RiskAssessor (风险评估器)
- 基于风险收益比过滤机会
- 评估市场流动性和波动率
- 异常市场检测和保护

### AlertClassifier (提醒分级器)
- WATCH: 观察阶段，距离入场较远
- READY: 准备阶段，接近入场点
- FIRED: 触发阶段，已达到入场条件

### DeduplicationCooler (去重冷却器)
- 30分钟冷却期避免重复通知
- 自适应门槛调整
- 相似信号合并

### NotificationService (通知服务)
- 结构化邮件模板
- 包含完整交易信息和风险提醒
- 支持SMTP和SendGrid

## 📈 监控指标

系统提供丰富的监控指标：
- **运行时间**: 系统持续运行时间
- **内存使用**: 堆内存使用情况
- **CPU使用率**: 处理器负载
- **错误计数**: 系统错误统计
- **通知统计**: 发送的提醒数量
- **数据更新**: 最后数据更新时间

## 🚀 部署指南

### Railway部署
1. 连接GitHub仓库到Railway
2. 设置环境变量
3. 自动部署

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 🔒 安全考虑

- 使用Helmet.js增强安全性
- 环境变量管理敏感信息
- API限流和错误处理
- 输入验证和清理

## 📝 开发指南

### 添加新策略
1. 在 `OpportunityEngine` 中实现策略逻辑
2. 更新类型定义
3. 添加相应测试

### 自定义通知
1. 修改 `NotificationService` 中的邮件模板
2. 添加新的通知渠道(如Webhook)
3. 配置通知规则

## 🐛 故障排查

### 常见问题
1. **邮件发送失败**: 检查SMTP配置和应用密码
2. **数据采集错误**: 验证币安API配置
3. **内存使用过高**: 调整监控间隔和快照保留策略

### 日志查看
```bash
# 实时日志
npm run dev

# 日志文件
tail -f logs/monitor.log
```

## 📊 性能优化

- 数据采集延迟 < 5秒
- 快照检索响应 < 5秒
- 支持10+币种并发监控
- 内存使用优化和垃圾回收

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**注意**: 这是一个交易监控工具，不构成投资建议。请谨慎使用，风险自负。