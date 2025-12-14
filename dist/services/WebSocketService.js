"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
class WebSocketService {
    wss;
    clients = new Set();
    heartbeatInterval = null;
    constructor(wss) {
        this.wss = wss;
        this.setupWebSocketServer();
        this.startHeartbeat();
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
            logger_1.logger.info('WebSocket client connected');
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
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(ws, data);
                }
                catch (error) {
                    logger_1.logger.error('Invalid WebSocket message:', error);
                    this.sendError(ws, 'Invalid message format');
                }
            });
            // 处理连接关闭
            ws.on('close', () => {
                logger_1.logger.info('WebSocket client disconnected');
                this.clients.delete(ws);
            });
            // 处理连接错误
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket client error:', error);
                this.clients.delete(ws);
            });
        });
    }
    handleClientMessage(ws, message) {
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
                logger_1.logger.warn('Unknown WebSocket message type:', message.type);
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }
    handleSubscription(ws, data) {
        // 简化实现，实际可以支持按币种或策略订阅
        logger_1.logger.info('Client subscribed to updates', data);
        this.sendToClient(ws, {
            type: 'STATUS',
            data: { message: 'Subscription confirmed', subscription: data },
            timestamp: Date.now()
        });
    }
    handleUnsubscription(ws, data) {
        logger_1.logger.info('Client unsubscribed from updates', data);
        this.sendToClient(ws, {
            type: 'STATUS',
            data: { message: 'Unsubscription confirmed', subscription: data },
            timestamp: Date.now()
        });
    }
    startHeartbeat() {
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
    sendToClient(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                logger_1.logger.error('Failed to send message to client:', error);
            }
        }
    }
    sendError(ws, errorMessage) {
        this.sendToClient(ws, {
            type: 'ERROR',
            data: { error: errorMessage },
            timestamp: Date.now()
        });
    }
    // 广播消息给所有连接的客户端
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        let successCount = 0;
        let failCount = 0;
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.default.OPEN) {
                try {
                    client.send(messageStr);
                    successCount++;
                }
                catch (error) {
                    logger_1.logger.error('Failed to broadcast to client:', error);
                    failCount++;
                    this.clients.delete(client);
                }
            }
            else {
                this.clients.delete(client);
                failCount++;
            }
        });
        if (failCount > 0) {
            logger_1.logger.warn(`Broadcast completed: ${successCount} success, ${failCount} failed`);
        }
    }
    // 发送交易机会通知
    broadcastOpportunity(opportunity, alertLevel) {
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
    broadcastStatus(status) {
        this.broadcast({
            type: 'STATUS',
            data: status,
            timestamp: Date.now()
        });
    }
    // 获取连接统计
    getConnectionStats() {
        return {
            connectedClients: this.clients.size,
            totalConnections: this.clients.size // 简化实现
        };
    }
    // 关闭WebSocket服务
    shutdown() {
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
            if (client.readyState === ws_1.default.OPEN) {
                client.close(1000, 'Server shutdown');
            }
        });
        this.clients.clear();
        logger_1.logger.info('WebSocket service shutdown completed');
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map