import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { TradingOpportunity, AlertLevel } from '../types';

export interface WebSocketMessage {
  type: 'OPPORTUNITY' | 'STATUS' | 'HEARTBEAT' | 'ERROR' | 'WELCOME' | 'PONG';
  data?: any;
  timestamp: number;
}

export class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(wss: WebSocket.Server) {
    this.wss = wss;
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');
      this.clients.add(ws);

      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'WELCOME',
        data: { 
          message: 'Connected to Cloud Trading Monitor',
          serverTime: new Date().toISOString()
        },
        timestamp: Date.now()
      });

      // 处理客户端消息
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // 处理连接关闭
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // 处理连接错误
      ws.on('error', (error: Error) => {
        logger.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'PING':
        this.sendToClient(ws, {
          type: 'PONG',
          timestamp: Date.now()
        });
        break;

      case 'SUBSCRIBE':
        // 处理订阅逻辑
        this.handleSubscription(ws, message.data);
        break;

      case 'UNSUBSCRIBE':
        // 处理取消订阅逻辑
        this.handleUnsubscription(ws, message.data);
        break;

      default:
        logger.warn('Unknown WebSocket message type:', message.type);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleSubscription(ws: WebSocket, data: any): void {
    // 简化实现，实际可以支持按币种或策略订阅
    logger.info('Client subscribed to updates', data);
    this.sendToClient(ws, {
      type: 'STATUS',
      data: { message: 'Subscription confirmed', subscription: data },
      timestamp: Date.now()
    });
  }

  private handleUnsubscription(ws: WebSocket, data: any): void {
    logger.info('Client unsubscribed from updates', data);
    this.sendToClient(ws, {
      type: 'STATUS',
      data: { message: 'Unsubscription confirmed', subscription: data },
      timestamp: Date.now()
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'HEARTBEAT',
        data: { 
          serverTime: new Date().toISOString(),
          connectedClients: this.clients.size
        },
        timestamp: Date.now()
      });
    }, 30000); // 每30秒发送心跳
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message to client:', error);
      }
    }
  }

  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendToClient(ws, {
      type: 'ERROR',
      data: { error: errorMessage },
      timestamp: Date.now()
    });
  }

  // 广播消息给所有连接的客户端
  public broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          successCount++;
        } catch (error) {
          logger.error('Failed to broadcast to client:', error);
          failCount++;
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
        failCount++;
      }
    });

    if (failCount > 0) {
      logger.warn(`Broadcast completed: ${successCount} success, ${failCount} failed`);
    }
  }

  // 发送交易机会通知
  public broadcastOpportunity(opportunity: TradingOpportunity, alertLevel: AlertLevel): void {
    this.broadcast({
      type: 'OPPORTUNITY',
      data: {
        opportunity,
        alertLevel,
        message: `New ${alertLevel} alert for ${opportunity.symbol}`
      },
      timestamp: Date.now()
    });
  }

  // 发送系统状态更新
  public broadcastStatus(status: any): void {
    this.broadcast({
      type: 'STATUS',
      data: status,
      timestamp: Date.now()
    });
  }

  // 获取连接统计
  public getConnectionStats(): { connectedClients: number; totalConnections: number } {
    return {
      connectedClients: this.clients.size,
      totalConnections: this.clients.size // 简化实现
    };
  }

  // 关闭WebSocket服务
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // 通知所有客户端服务即将关闭
    this.broadcast({
      type: 'STATUS',
      data: { message: 'Server shutting down' },
      timestamp: Date.now()
    });

    // 关闭所有连接
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });

    this.clients.clear();
    logger.info('WebSocket service shutdown completed');
  }
}