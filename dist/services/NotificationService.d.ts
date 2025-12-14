import { ClassifiedAlert } from '../types';
export declare class NotificationService {
    private transporter;
    private notificationQueue;
    private isProcessing;
    constructor();
    private initializeTransporter;
    sendAlert(alert: ClassifiedAlert): Promise<boolean>;
    private generateSubject;
    private getLevelEmoji;
    private generateEmailContent;
    addToQueue(alert: ClassifiedAlert): Promise<void>;
    private processQueue;
    testConnection(): Promise<boolean>;
    getQueueStatus(): {
        pending: number;
        processing: boolean;
    };
    sendTestEmail(): Promise<boolean>;
    createTestAccount(): Promise<{
        user: string;
        pass: string;
        smtp: any;
    } | null>;
}
//# sourceMappingURL=NotificationService.d.ts.map