import { 
  ClientMessage, 
  ServerMessage, 
  InputState, 
  WelcomeData, 
  SnapshotData,
  InputData,
  JoinData,
  PingData,
  NETWORK_CONFIG 
} from '@shared/index.js';

export class NetworkManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private lastPingTime = 0;
  private ping = 0;
  private inputSequence = 0;
  
  // Event handlers
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onReconnecting?: () => void;
  public onWelcome?: (data: WelcomeData) => void;
  public onSnapshot?: (data: SnapshotData) => void;
  public onPlayerJoined?: (data: any) => void;
  public onPlayerLeft?: (data: any) => void;
  public onError?: (error: string) => void;

  async connect(playerName: string, roomCode?: string): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3011';
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('Connected to server');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
          this.onConnect?.();
          
          // Send join message
          this.sendJoin(playerName, roomCode);
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          console.log('Disconnected from server:', event.code, event.reason);
          this.handleDisconnection();
          
          if (this.isConnecting) {
            reject(new Error('Failed to connect to server'));
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.handleDisconnection();
          
          if (this.isConnecting) {
            reject(new Error('Connection error'));
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: ServerMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'welcome':
          this.onWelcome?.(message.data as WelcomeData);
          break;
        
        case 'snapshot':
          this.onSnapshot?.(message.data as SnapshotData);
          break;
        
        case 'playerJoined':
          this.onPlayerJoined?.(message.data);
          break;
        
        case 'playerLeft':
          this.onPlayerLeft?.(message.data);
          break;
        
        case 'pong':
          this.handlePong(message.data);
          break;
        
        case 'ack':
          // Handle input acknowledgment
          break;
        
        case 'error':
          console.error('Server error:', message.data.message);
          this.onError?.(message.data.message);
          break;
        
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleDisconnection(): void {
    this.isConnecting = false;
    this.onDisconnect?.();
    
    // Attempt reconnection
    if (this.reconnectAttempts < NETWORK_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.attemptReconnection();
    }
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    this.onReconnecting?.();
    
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${NETWORK_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      // This would need to store the original connection parameters
      // For now, just indicate that reconnection is needed
      console.log('Reconnection attempt failed - manual reconnection required');
    }, NETWORK_CONFIG.RECONNECT_DELAY);
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.sendPing();
      }
    }, NETWORK_CONFIG.HEARTBEAT_INTERVAL);
  }

  sendJoin(playerName: string, roomCode?: string): void {
    const joinData: JoinData = {
      name: playerName,
      roomId: roomCode,
    };

    this.sendMessage({
      type: 'join',
      data: joinData,
    });
  }

  sendInput(inputState: InputState): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.inputSequence++;

    const inputData: InputData = {
      sequence: this.inputSequence,
      timestamp: Date.now(),
      input: inputState,
    };

    this.sendMessage({
      type: 'input',
      data: inputData,
    });
  }

  sendPing(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.lastPingTime = Date.now();

    const pingData: PingData = {
      timestamp: this.lastPingTime,
    };

    this.sendMessage({
      type: 'ping',
      data: pingData,
    });
  }

  private handlePong(data: PingData): void {
    const now = Date.now();
    this.ping = now - data.timestamp;
  }

  sendLeave(): void {
    this.sendMessage({
      type: 'leave',
      data: {},
    });
  }

  private sendMessage(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      // Send leave message before closing
      if (this.socket.readyState === WebSocket.OPEN) {
        this.sendLeave();
      }
      
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
    }
    
    this.reconnectAttempts = NETWORK_CONFIG.MAX_RECONNECT_ATTEMPTS; // Stop reconnection attempts
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getPing(): number {
    return this.ping;
  }

  getDebugInfo() {
    return {
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      ping: this.ping,
      inputSequence: this.inputSequence,
      socketState: this.socket?.readyState,
    };
  }
}