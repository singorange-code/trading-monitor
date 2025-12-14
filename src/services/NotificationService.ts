import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from '../utils/logger';
import { ClassifiedAlert } from '../types';
import config from '../config';

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private useResend: boolean = false;
  private notificationQueue: ClassifiedAlert[] = [];
  private isProcessing: boolean = false;

  constructor() {
    // 优先使用 Resend
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.useResend = true;
      logger.info('Using Resend for email service');
    } else {
      this.transporter = this.initializeTransporter();
    }
  }

  private initializeTransporter(): nodemailer.Transporter {
    // 如果有SendGrid API Key，优先使用SendGrid
    if (config.email.sendgridApiKey) {
      logger.info('Using SendGrid for email service');
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: config.email.sendgridApiKey
        }
      });
    }

    // 否则使用SMTP配置
    if (config.email.user && config.email.password) {
      logger.info('Using SMTP for email service', { host: config.email.smtp.host });
      return nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.password
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
    logger.warn('No email configuration found, using test account');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  async sendAlert(alert: ClassifiedAlert): Promise<boolean> {
    try {
      const emailContent = this.generateEmailContent(alert);
      const subject = this.generateSubject(alert);
      const toEmail = config.email.recipients.length > 0 ? config.email.recipients[0] : '';

      // 使用 Resend
      if (this.useResend && this.resend && toEmail) {
        const { error } = await this.resend.emails.send({
          from: 'Trading Monitor <onboarding@resend.dev>',
          to: [toEmail],
          subject: subject,
          html: emailContent
        });

        if (error) {
          logger.error('Resend alert error:', error);
          return false;
        }
        logger.info(`Alert sent via Resend for ${alert.opportunity.symbol} ${alert.level}`);
        return true;
      }

      // 使用 SMTP
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.email.user,
          to: config.email.recipients,
          subject: subject,
          html: emailContent
        });
        logger.info(`Alert sent via SMTP for ${alert.opportunity.symbol} ${alert.level}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to send alert:', error);
      return false;
    }
  }

  private generateSubject(alert: ClassifiedAlert): string {
    const { symbol, strategy } = alert.opportunity;
    const levelEmoji = this.getLevelEmoji(alert.level);
    return `${levelEmoji} ${symbol} ${strategy} - ${alert.level}`;
  }

  private getLevelEmoji(level: string): string {
    switch (level) {
      case 'FIRED': return '🔥';
      case 'READY': return '⚡';
      case 'WATCH': return '👀';
      default: return '📊';
    }
  }
  private generateEmailContent(alert: ClassifiedAlert): string {
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

  private generateAIPrompt(alert: ClassifiedAlert): string {
    const { opportunity } = alert;
    const stopDist = Math.abs(opportunity.entryPrice - opportunity.stopLoss);
    const tp1 = opportunity.takeProfit1 || opportunity.takeProfit;
    const tp2 = opportunity.takeProfit2 || 'N/A';
    const netRRCheck = opportunity.netRR >= 1.5 ? '✓' : '✗';
    
    return `你是"合约执行官(风险优先)"。你只能使用我提供的【候选策略】做决策，禁止自行编造任何价格/指标。

任务：
1) 分析以下候选策略是否值得执行
2) 若 netRR < 1.5，一律 WAIT
3) 输出必须包含：选择结果 + 下单参数 + 风险检查清单

【候选策略】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] ${opportunity.strategy} ${opportunity.direction} [${opportunity.confidence}]
    Symbol: ${opportunity.symbol}
    Entry: ${opportunity.entryPrice}
    SL: ${opportunity.stopLoss}
    TP1: ${tp1}
    TP2: ${tp2}
    stopDist: ${stopDist.toFixed(2)}
    netRR: ${opportunity.netRR}
    触发条件: ${opportunity.trigger}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

输出格式（严格 JSON）：
{
  "action": "EXECUTE" | "WAIT",
  "pick": "${opportunity.strategy}",
  "orderType": "MARKET" | "LIMIT",
  "direction": "${opportunity.direction}",
  "entry": ${opportunity.entryPrice},
  "sl": ${opportunity.stopLoss},
  "tp1": ${tp1},
  "tp2": ${tp2 === 'N/A' ? 'null' : tp2},
  "reason": "一句话理由（必须引用触发条件）",
  "checklist": [
    "netRR>=1.5: ${netRRCheck}",
    "方向与趋势一致",
    "下单后立刻有保护性SL"
  ]
}`;
  }

  async addToQueue(alert: ClassifiedAlert): Promise<void> {
    this.notificationQueue.push(alert);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
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
    } catch (error) {
      logger.error('Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.useResend) {
        // Resend 不需要验证连接
        return true;
      }
      
      if (this.transporter) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
        
        await Promise.race([this.transporter.verify(), timeoutPromise]);
        logger.info('Email service connection verified');
      }
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }

  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.notificationQueue.length,
      processing: this.isProcessing
    };
  }

  async sendTestEmail(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('sendTestEmail called', {
        useResend: this.useResend,
        recipients: config.email.recipients
      });

      const toEmail = config.email.recipients.length > 0 ? config.email.recipients[0] : 'test@example.com';
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
              <li>监控币种: ${config.monitoring.symbols.slice(0, 5).join(', ')}...</li>
              <li>监控间隔: ${config.monitoring.interval}秒</li>
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
          logger.error('Resend error:', error);
          return { success: false, error: error.message };
        }

        logger.info('Test email sent via Resend', { id: data?.id });
        return { success: true };
      }

      // 使用 SMTP
      if (this.transporter) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Send timeout after 15s')), 15000);
        });

        const sendPromise = this.transporter.sendMail({
          from: config.email.fromEmail || config.email.user,
          to: toEmail,
          subject: '🧪 云端交易监控系统 - 测试邮件',
          html: htmlContent
        });

        const info = await Promise.race([sendPromise, timeoutPromise]);
        logger.info('Test email sent via SMTP', { messageId: info.messageId });
        return { success: true };
      }

      return { success: false, error: 'No email service configured' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send test email:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 创建Ethereal测试账户
  async createTestAccount(): Promise<{ user: string; pass: string; smtp: any } | null> {
    try {
      const testAccount = await nodemailer.createTestAccount();
      logger.info('Created Ethereal test account', {
        user: testAccount.user,
        smtp: testAccount.smtp
      });
      
      return {
        user: testAccount.user,
        pass: testAccount.pass,
        smtp: testAccount.smtp
      };
    } catch (error) {
      logger.error('Failed to create test account:', error);
      return null;
    }
  }
}