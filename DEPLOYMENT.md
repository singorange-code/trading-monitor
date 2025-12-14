# 🚀 云端交易监控系统部署指南

## Railway 部署步骤

### 1. 准备工作

确保你有以下账号：
- GitHub 账号
- Railway 账号 (https://railway.app)
- 邮件服务账号 (SendGrid 或 Gmail)

### 2. 代码准备

```bash
# 1. 确保代码已提交到 GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. 运行部署前检查
npm run deploy
```

### 3. Railway 部署

#### 步骤 1: 创建项目
1. 登录 Railway (https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库和 `cloud-monitor` 目录

#### 步骤 2: 配置环境变量
在 Railway 项目设置中添加以下环境变量：

**必需变量:**
```
NODE_ENV=production
SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,ADAUSDT,DOGEUSDT,XRPUSDT,AVAXUSDT,DOTUSDT,MATICUSDT,LINKUSDT,LTCUSDT,UNIUSDT,ATOMUSDT,FILUSDT
MONITOR_INTERVAL_SECONDS=30
MIN_NET_RR=2.0
```

**邮件配置 (选择一种):**

选项A - SendGrid (推荐):
```
SENDGRID_API_KEY=your_sendgrid_api_key
TO_EMAIL=your_email@example.com
```

选项B - Gmail SMTP:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
TO_EMAIL=your_email@example.com
```

#### 步骤 3: 部署设置
Railway 会自动检测到 `package.json` 并使用以下配置：
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check: `/api/health`

### 4. 邮件服务配置

#### SendGrid 配置 (推荐)
1. 注册 SendGrid 账号: https://sendgrid.com
2. 创建 API Key:
   - 进入 Settings > API Keys
   - 点击 "Create API Key"
   - 选择 "Full Access" 或 "Mail Send" 权限
   - 复制 API Key 到 Railway 环境变量

#### Gmail SMTP 配置
1. 启用 2FA: Google 账号 > 安全性 > 两步验证
2. 生成应用专用密码:
   - Google 账号 > 安全性 > 应用专用密码
   - 选择 "邮件" 和设备
   - 复制生成的密码到 Railway 环境变量

### 5. 部署验证

部署完成后，访问以下端点验证：

```bash
# 基础健康检查
curl https://your-app.railway.app/api/health

# 系统配置
curl https://your-app.railway.app/api/config

# 测试邮件 (POST 请求)
curl -X POST https://your-app.railway.app/api/notifications/test
```

### 6. 监控和维护

#### 查看日志
```bash
# Railway CLI
railway logs

# 或在 Railway 控制台查看实时日志
```

#### 性能监控
- CPU 使用率: < 50%
- 内存使用: < 512MB
- 响应时间: < 2秒
- 错误率: < 1%

#### 定期检查
- 每日检查系统健康状态
- 每周检查邮件发送统计
- 每月检查存储使用情况

## 🔧 故障排查

### 常见问题

#### 1. 部署失败
```bash
# 检查构建日志
railway logs --deployment

# 常见原因：
# - Node.js 版本不兼容 (需要 18+)
# - 依赖安装失败
# - TypeScript 编译错误
```

#### 2. 邮件发送失败
```bash
# 检查邮件配置
curl -X POST https://your-app.railway.app/api/notifications/test

# 常见原因：
# - SendGrid API Key 无效
# - Gmail 应用密码错误
# - 收件人邮箱地址错误
```

#### 3. 数据采集异常
```bash
# 检查网络连接
curl https://your-app.railway.app/api/health

# 常见原因：
# - 币安API限流
# - 网络连接问题
# - 符号配置错误
```

#### 4. 内存使用过高
```bash
# 调整监控间隔
curl -X PUT https://your-app.railway.app/api/config/interval \
  -H "Content-Type: application/json" \
  -d '{"interval": 60}'

# 减少监控符号
curl -X PUT https://your-app.railway.app/api/config/symbols \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"]}'
```

## 📊 生产环境优化

### 性能优化
1. **监控间隔调整**: 根据需要调整为 30-60 秒
2. **符号数量控制**: 建议不超过 20 个符号
3. **内存管理**: 定期清理快照和日志

### 安全配置
1. **环境变量**: 所有敏感信息使用环境变量
2. **HTTPS**: Railway 自动提供 HTTPS
3. **API限流**: 内置限流机制

### 监控告警
1. **健康检查**: Railway 自动监控 `/api/health`
2. **错误告警**: 配置邮件错误通知
3. **性能监控**: 使用 Railway 内置监控

## 🔄 更新部署

### 代码更新
```bash
# 1. 更新代码
git add .
git commit -m "Update: description"
git push origin main

# 2. Railway 自动重新部署
# 或手动触发重新部署
```

### 配置更新
```bash
# 动态更新监控配置 (无需重启)
curl -X PUT https://your-app.railway.app/api/config/symbols \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["BTCUSDT", "ETHUSDT", "NEWUSDT"]}'
```

## 📞 支持

如遇到部署问题：
1. 检查 Railway 部署日志
2. 运行本地测试: `npm run deploy`
3. 查看系统健康状态: `/api/health`
4. 联系技术支持

---

**🎉 部署成功后，你将拥有一个24/7运行的云端交易监控系统！**