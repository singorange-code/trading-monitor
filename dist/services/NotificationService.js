"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const resend_1 = require("resend");
const logger_1 = require("../utils/logger");
const config_1 = __importDefault(require("../config"));
class NotificationService {
    transporter = null;
    resend = null;
    useResend = false;
    notificationQueue = [];
    isProcessing = false;
    constructor() {
        // 优先使用 Resend
        if (process.env.RESEND_API_KEY) {
            this.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
            this.useResend = true;
            logger_1.logger.info('Using Resend for email service');
        }
        else {
            this.transporter = this.initializeTransporter();
        }
    }
    initializeTransporter() {
        // 如果有SendGrid API Key，优先使用SendGrid
        if (config_1.default.email.sendgridApiKey) {
            logger_1.logger.info('Using SendGrid for email service');
            return nodemailer_1.default.createTransport({
                service: 'SendGrid',
                auth: {
                    user: 'apikey',
                    pass: config_1.default.email.sendgridApiKey
                }
            });
        }
        // 否则使用SMTP配置
        if (config_1.default.email.user && config_1.default.email.password) {
            logger_1.logger.info('Using SMTP for email service', { host: config_1.default.email.smtp.host });
            return nodemailer_1.default.createTransport({
                host: config_1.default.email.smtp.host,
                port: config_1.default.email.smtp.port,
                secure: config_1.default.email.smtp.port === 465,
                auth: {
                    user: config_1.default.email.user,
                    pass: config_1.default.email.password
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 10000, // 10秒连接超时
                greetingTimeout: 10000,
                socketTimeout: 15000
            });
        }
        // 开发环境使用Ethereal测试邮箱
        logger_1.logger.warn('No email configuration found, using test account');
        return nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'ethereal.user@ethereal.email',
                pass: 'ethereal.pass'
            }
        });
    }
    async sendAlert(alert) {
        try {
            const emailContent = this.generateEmailContent(alert);
            const subject = this.generateSubject(alert);
            const toEmail = config_1.default.email.recipients.length > 0 ? config_1.default.email.recipients[0] : '';
            // 使用 Resend
            if (this.useResend && this.resend && toEmail) {
                const { error } = await this.resend.emails.send({
                    from: 'Trading Monitor <onboarding@resend.dev>',
                    to: [toEmail],
                    subject: subject,
                    html: emailContent
                });
                if (error) {
                    logger_1.logger.error('Resend alert error:', error);
                    return false;
                }
                logger_1.logger.info(`Alert sent via Resend for ${alert.opportunity.symbol} ${alert.level}`);
                return true;
            }
            // 使用 SMTP
            if (this.transporter) {
                await this.transporter.sendMail({
                    from: config_1.default.email.user,
                    to: config_1.default.email.recipients,
                    subject: subject,
                    html: emailContent
                });
                logger_1.logger.info(`Alert sent via SMTP for ${alert.opportunity.symbol} ${alert.level}`);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('Failed to send alert:', error);
            return false;
        }
    }
    generateSubject(alert) {
        const { symbol, strategy } = alert.opportunity;
        const levelEmoji = this.getLevelEmoji(alert.level);
        return `${levelEmoji} ${symbol} ${strategy} - ${alert.level}`;
    }
    getLevelEmoji(level) {
        switch (level) {
            case 'FIRED': return '🔥';
            case 'READY': return '⚡';
            case 'WATCH': return '👀';
            default: return '📊';
        }
    }
    generateEmailContent(alert) {
        const { opportunity } = alert;
        // 生成 AI Prompt（可直接复制）
        const aiPrompt = this.generateAIPrompt(alert);
        return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">🎯 交易机会提醒 - ${alert.level}</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #34495e;">${opportunity.symbol} - ${opportunity.strategy} - ${opportunity.direction}</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>入场价格:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.entryPrice}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>止损价格:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.stopLoss}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>止盈1:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.takeProfit1 || opportunity.takeProfit}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>止盈2:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.takeProfit2 || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>净风险收益比:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.netRR}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>触发条件:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.trigger}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>距离入场:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${(alert.distanceToEntry * 100).toFixed(2)}%</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">⚠️ 风险提醒</h4>
          <p style="margin-bottom: 0; color: #856404;">
            请注意风险管理，严格按照止损止盈执行。市场有风险，投资需谨慎。
          </p>
        </div>

        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0056b3;">🤖 AI Prompt（可直接复制给AI）</h4>
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; font-size: 12px; line-height: 1.5;">${aiPrompt}</pre>
        </div>

        <div style="font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px;">
          <p>此邮件由云端交易监控系统自动发送</p>
          <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      </div>
    `;
    }
    generateAIPrompt(alert) {
        const { opportunity } = alert;
        const stopDist = Math.abs(opportunity.entryPrice - opportunity.stopLoss);
        const stopPct = ((stopDist / opportunity.entryPrice) * 100).toFixed(2);
        const tp1 = opportunity.takeProfit1 || opportunity.takeProfit;
        const tp2 = opportunity.takeProfit2 || 'N/A';
        const tp1Pct = ((Math.abs(Number(tp1) - opportunity.entryPrice) / opportunity.entryPrice) * 100).toFixed(2);
        return `云端监控检测到交易信号，请打开全维数据确认后再决策。

═══ 信号摘要 ═══
币种: ${opportunity.symbol}
策略: ${opportunity.strategy}
方向: ${opportunity.direction}
置信度: ${opportunity.confidence}

═══ 价格参数 ═══
Entry: ${opportunity.entryPrice}
SL: ${opportunity.stopLoss} (-${stopPct}%)
TP1: ${tp1} (+${tp1Pct}%)
TP2: ${tp2}
netRR: ${opportunity.netRR}

═══ 触发条件 ═══
${opportunity.trigger}

═══ 下一步 ═══
1. 打开本地全维数据面板
2. 确认多周期趋势一致性
3. 检查 Taker 买卖比、OI 变化等实时数据
4. 确认账户状态和仓位大小
5. 决策是否执行

⚠️ 云端数据有限，仅作提醒，请以本地全维数据为准！`;
    }
    async addToQueue(alert) {
        this.notificationQueue.push(alert);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    async processQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        try {
            while (this.notificationQueue.length > 0) {
                const alert = this.notificationQueue.shift();
                if (alert) {
                    await this.sendAlert(alert);
                    // 添加延迟避免邮件服务限流
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Queue processing failed:', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async testConnection() {
        try {
            if (this.useResend) {
                // Resend 不需要验证连接
                return true;
            }
            if (this.transporter) {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), 10000);
                });
                await Promise.race([this.transporter.verify(), timeoutPromise]);
                logger_1.logger.info('Email service connection verified');
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Email service connection failed:', error);
            return false;
        }
    }
    getQueueStatus() {
        return {
            pending: this.notificationQueue.length,
            processing: this.isProcessing
        };
    }
    async sendTestEmail() {
        try {
            logger_1.logger.info('sendTestEmail called', {
                useResend: this.useResend,
                recipients: config_1.default.email.recipients
            });
            const toEmail = config_1.default.email.recipients.length > 0 ? config_1.default.email.recipients[0] : 'test@example.com';
            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ 邮件服务测试成功</h2>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #155724;">系统状态正常</h3>
            <p style="color: #155724; margin-bottom: 0;">
              云端交易监控系统邮件服务已成功配置并可以正常发送通知。
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0;">系统信息</h4>
            <ul style="margin-bottom: 0;">
              <li>发送时间: ${new Date().toLocaleString('zh-CN')}</li>
              <li>服务状态: 运行中</li>
              <li>监控币种: ${config_1.default.monitoring.symbols.slice(0, 5).join(', ')}...</li>
              <li>监控间隔: ${config_1.default.monitoring.interval}秒</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6c757d;">
              如果您收到此邮件，说明交易提醒功能已准备就绪！
            </p>
          </div>
        </div>
      `;
            // 使用 Resend
            if (this.useResend && this.resend) {
                const { data, error } = await this.resend.emails.send({
                    from: 'Trading Monitor <onboarding@resend.dev>',
                    to: [toEmail],
                    subject: '🧪 云端交易监控系统 - 测试邮件',
                    html: htmlContent
                });
                if (error) {
                    logger_1.logger.error('Resend error:', error);
                    return { success: false, error: error.message };
                }
                logger_1.logger.info('Test email sent via Resend', { id: data?.id });
                return { success: true };
            }
            // 使用 SMTP
            if (this.transporter) {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Send timeout after 15s')), 15000);
                });
                const sendPromise = this.transporter.sendMail({
                    from: config_1.default.email.fromEmail || config_1.default.email.user,
                    to: toEmail,
                    subject: '🧪 云端交易监控系统 - 测试邮件',
                    html: htmlContent
                });
                const info = await Promise.race([sendPromise, timeoutPromise]);
                logger_1.logger.info('Test email sent via SMTP', { messageId: info.messageId });
                return { success: true };
            }
            return { success: false, error: 'No email service configured' };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Failed to send test email:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }
    // 创建Ethereal测试账户
    async createTestAccount() {
        try {
            const testAccount = await nodemailer_1.default.createTestAccount();
            logger_1.logger.info('Created Ethereal test account', {
                user: testAccount.user,
                smtp: testAccount.smtp
            });
            return {
                user: testAccount.user,
                pass: testAccount.pass,
                smtp: testAccount.smtp
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create test account:', error);
            return null;
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map