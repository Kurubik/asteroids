import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ClientConnection, ServerConfig, MessageHandler } from '../types.js';
import { ClientMessage, ServerMessage, JoinData, InputData, PingData, generateId } from '@asteroid-storm/shared';
import { RoomManager } from '../room/RoomManager.js';
import { Logger } from '../utils/Logger.js';

export class WebSocketServer {
  private wss: WSServer;
  private clients = new Map<string, ClientConnection>();
  private roomManager: RoomManager;
  private messageHandlers = new Map<string, MessageHandler['handler']>();
  private logger: Logger;
  private heartbeatInterval: NodeJS.Timer;

  constructor(private config: ServerConfig) {
    this.logger = new Logger('WebSocketServer');
    this.roomManager = new RoomManager(config);
    
    this.wss = new WSServer({
      port: config.wsPort,
      host: config.host,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          chunkSize: 4 * 1024,
        },
        threshold: 512,
      },
      maxPayload: 16 * 1024, // 16KB max message size
    });

    this.setupMessageHandlers();
    this.setupEventHandlers();
    this.startHeartbeat();

    this.logger.info(`WebSocket server listening on ${config.host}:${config.wsPort}`);
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('join', this.handleJoin.bind(this));
    this.messageHandlers.set('input', this.handleInput.bind(this));
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('leave', this.handleLeave.bind(this));
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error: Error) => {
      this.logger.error('WebSocket server error:', error);
    });
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = generateId();
    const client: ClientConnection = {
      id: clientId,
      socket,
      lastPing: Date.now(),
      inputBuffer: [],
      acknowledged: 0,
    };

    this.clients.set(clientId, client);
    
    const clientIP = request.socket.remoteAddress || 'unknown';
    this.logger.info(`Client connected: ${clientId} (${clientIP})`);

    socket.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(client, code, reason.toString());
    });

    socket.on('error', (error: Error) => {
      this.logger.error(`Client ${clientId} error:`, error);
      this.handleDisconnection(client, 1006, 'error');
    });

    socket.on('pong', () => {
      client.lastPing = Date.now();
    });

    // Send initial ping
    this.sendPing(client);
  }

  private handleMessage(client: ClientConnection, data: Buffer): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      
      if (!message.type || !this.messageHandlers.has(message.type)) {
        this.logger.warn(`Unknown message type: ${message.type}`);
        return;
      }

      const handler = this.messageHandlers.get(message.type)!;
      handler(client, message.data);

    } catch (error) {
      this.logger.error(`Failed to parse message from client ${client.id}:`, error);
      this.sendError(client, 'Invalid message format');
    }
  }

  private handleJoin(client: ClientConnection, data: JoinData): void {
    if (!data.name || typeof data.name !== 'string') {
      this.sendError(client, 'Invalid player name');
      return;
    }

    const success = this.roomManager.joinRoom(client, data.name, data.roomId);
    if (!success) {
      this.sendError(client, 'Failed to join room');
    }
  }

  private handleInput(client: ClientConnection, data: InputData): void {
    if (!client.roomId) {
      return; // Client not in a room
    }

    if (typeof data.sequence !== 'number' || 
        typeof data.timestamp !== 'number' || 
        !data.input) {
      this.logger.warn(`Invalid input data from client ${client.id}`);
      return;
    }

    this.roomManager.processInput(client, data);
  }

  private handlePing(client: ClientConnection, data: PingData): void {
    this.sendMessage(client, {
      type: 'pong',
      data: { timestamp: data.timestamp },
    });
  }

  private handleLeave(client: ClientConnection, _data: any): void {
    this.roomManager.leaveRoom(client);
  }

  private handleDisconnection(client: ClientConnection, code: number, reason: string): void {
    this.logger.info(`Client disconnected: ${client.id} (code: ${code}, reason: ${reason})`);
    
    // Remove from room
    this.roomManager.leaveRoom(client);
    
    // Remove from clients
    this.clients.delete(client.id);
  }

  private sendMessage(client: ClientConnection, message: ServerMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error(`Failed to send message to client ${client.id}:`, error);
      }
    }
  }

  private sendError(client: ClientConnection, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      data: { message: error },
    });
  }

  private sendPing(client: ClientConnection): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.ping();
      } catch (error) {
        this.logger.error(`Failed to ping client ${client.id}:`, error);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          this.logger.warn(`Client ${clientId} timed out`);
          client.socket.terminate();
          this.clients.delete(clientId);
        } else {
          this.sendPing(client);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      ...this.roomManager.getStats(),
    };
  }

  getRoomList() {
    return this.roomManager.getRoomList();
  }

  broadcast(message: ServerMessage, excludeClientId?: string): void {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients) {
      if (excludeClientId && clientId === excludeClientId) continue;
      
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          this.logger.error(`Failed to broadcast to client ${clientId}:`, error);
        }
      }
    }
  }

  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info('Shutting down WebSocket server...');

      // Clear heartbeat
      clearInterval(this.heartbeatInterval);

      // Shutdown room manager
      this.roomManager.shutdown();

      // Close all client connections
      for (const [_, client] of this.clients) {
        client.socket.close(1001, 'Server shutting down');
      }

      // Close server
      this.wss.close(() => {
        this.logger.info('WebSocket server shut down');
        resolve();
      });
    });
  }
}