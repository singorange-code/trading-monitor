import { ClassifiedAlert } from '../types';
export declare class NotificationService {
    private transporter;
    private resend;
    private useResend;
    private notificationQueue;
    private isProcessing;
    constructor();
    private initializeTransporter;
    sendAlert(alert: ClassifiedAlert): Promise<boolean>;
    private generateSubject;
    private getLevelEmoji;
    private generateEmailContent;
    private generateAIPrompt;
    addToQueue(alert: ClassifiedAlert): Promise<void>;
    private processQueue;
    testConnection(): Promise<boolean>;
    getQueueStatus(): {
        pending: number;
        processing: boolean;
    };
    sendTestEmail(): Promise<{
        success: boolean;
        error?: string;
    }>;
    createTestAccount(): Promise<{
        user: string;
        pass: string;
        smtp: any;
    } | null>;
}
//# sourceMappingURL=NotificationService.d.ts.map