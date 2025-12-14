import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { ClassifiedAlert } from '../types';
import config from '../config';

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private notificationQueue: ClassifiedAlert[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.transporter = this.initializeTransporter();
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
      const mailOptions = {
        from: config.email.user,
        to: config.email.recipients,
        subject: this.generateSubject(alert),
        html: emailContent
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Alert sent for ${alert.opportunity.symbol} ${alert.level}`);
      return true;
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
    const snapshotUrl = `${config.server.baseUrl}/snapshots/${alert.opportunityId}`;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">交易机会提醒 - ${alert.level}</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #34495e;">${opportunity.symbol} - ${opportunity.strategy}</h3>
          
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
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>止盈价格:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.takeProfit}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>风险收益比:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${opportunity.riskRewardRatio?.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>距离入场:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${(alert.distanceToEntry * 100).toFixed(2)}%</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h4 style="margin-top: 0; color: #856404;">风险提醒</h4>
          <p style="margin-bottom: 0; color: #856404;">
            请注意风险管理，严格按照止损止盈执行。市场有风险，投资需谨慎。
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${snapshotUrl}" 
             style="background: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            查看详细数据快照
          </a>
        </div>

        <div style="font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px;">
          <p>此邮件由云端交易监控系统自动发送</p>
          <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      </div>
    `;
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
      // 添加超时处理
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      
      await Promise.race([this.transporter.verify(), timeoutPromise]);
      logger.info('Email service connection verified');
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
        user: config.email.user ? 'set' : 'not set',
        recipients: config.email.recipients,
        host: config.email.smtp.host
      });
      
      // 添加发送超时
      const sendWithTimeout = async () => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Send timeout after 15s')), 15000);
        });
        
        const testMailOptions = {
        from: config.email.fromEmail || config.email.user,
        to: config.email.recipients.length > 0 ? config.email.recipients[0] : 'test@example.com',
        subject: '🧪 云端交易监控系统 - 测试邮件',
        html: `
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
                <li>监控币种: BTCUSDT, ETHUSDT</li>
                <li>监控间隔: 30秒</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6c757d;">
                如果您收到此邮件，说明交易提醒功能已准备就绪！
              </p>
            </div>
          </div>
        `
      };

        const sendPromise = this.transporter.sendMail(testMailOptions);
        return Promise.race([sendPromise, timeoutPromise]);
      };

      const info = await sendWithTimeout();
      logger.info('Test email sent successfully', { messageId: info.messageId });
      
      // 如果是Ethereal测试账户，记录预览URL
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`Test email preview: ${previewUrl}`);
      }
      
      return { success: true };
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