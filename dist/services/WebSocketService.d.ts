import WebSocket from 'ws';
import { TradingOpportunity, AlertLevel } from '../types';
export interface WebSocketMessage {
    type: 'OPPORTUNITY' | 'STATUS' | 'HEARTBEAT' | 'ERROR' | 'WELCOME' | 'PONG';
    data?: any;
    timestamp: number;
}
export declare class WebSocketService {
    private wss;
    private clients;
    private heartbeatInterval;
    constructor(wss: WebSocket.Server);
    private setupWebSocketServer;
    private handleClientMessage;
    private handleSubscription;
    private handleUnsubscription;
    private startHeartbeat;
    private sendToClient;
    private sendError;
    broadcast(message: WebSocketMessage): void;
    broadcastOpportunity(opportunity: TradingOpportunity, alertLevel: AlertLevel): void;
    broadcastStatus(status: any): void;
    getConnectionStats(): {
        connectedClients: number;
        totalConnections: number;
    };
    shutdown(): void;
}
//# sourceMappingURL=WebSocketService.d.ts.map