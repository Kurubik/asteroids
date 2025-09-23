import { WebSocket } from 'ws';
import { 
  GameWorld,
  GameState,
  InputState,
  ServerMessage,
  WelcomeData,
  SnapshotData,
  GAME_CONFIG,
  generateId,
  validatePlayerName
} from '@asteroid-storm/shared';
import { ClientConnection, ClientInputEntry } from '../types.js';
import { Logger } from '../utils/Logger.js';

export class Room {
  public id: string;
  public clients = new Map<string, ClientConnection>();
  public gameWorld: GameWorld;
  public lastTick = 0;
  public isActive = false;
  public createdAt = Date.now();
  
  private tickInterval: NodeJS.Timer | null = null;
  private snapshotInterval: NodeJS.Timer | null = null;
  private logger: Logger;

  constructor(id: string) {
    this.id = id;
    this.gameWorld = new GameWorld();
    this.logger = new Logger(`Room:${id}`);
    this.logger.info('Room created');
  }

  addClient(client: ClientConnection, playerName: string): boolean {
    if (this.clients.size >= GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
      return false;
    }

    const nameError = validatePlayerName(playerName);
    if (nameError) {
      this.sendError(client, nameError);
      return false;
    }

    // Check if name is already taken
    for (const [_, existingClient] of this.clients) {
      if (existingClient.player && existingClient.player.name === playerName) {
        this.sendError(client, 'Name already taken');
        return false;
      }
    }

    // Add player to game world
    const player = this.gameWorld.addPlayer(client.id, playerName);
    client.player = player;
    client.roomId = this.id;

    this.clients.set(client.id, client);
    
    // Send welcome message
    const welcomeData: WelcomeData = {
      playerId: client.id,
      roomId: this.id,
      gameState: this.gameWorld.getGameState(),
    };

    this.sendMessage(client, {
      type: 'welcome',
      data: welcomeData,
    });

    // Start game loop if this is the first player
    if (this.clients.size === 1) {
      this.start();
    }

    // Notify other players
    this.broadcastToOthers(client.id, {
      type: 'playerJoined',
      data: { player },
    });

    this.logger.info(`Player ${playerName} joined (${this.clients.size}/${GAME_CONFIG.MAX_PLAYERS_PER_ROOM})`);
    return true;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const playerName = client.player?.name || 'Unknown';
    
    // Remove from game world
    this.gameWorld.removePlayer(clientId);
    
    // Remove from clients
    this.clients.delete(clientId);

    // Notify other players
    this.broadcast({
      type: 'playerLeft',
      data: { playerId: clientId, playerName },
    });

    this.logger.info(`Player ${playerName} left (${this.clients.size}/${GAME_CONFIG.MAX_PLAYERS_PER_ROOM})`);

    // Stop game loop if no players left
    if (this.clients.size === 0) {
      this.stop();
    }
  }

  processInput(clientId: string, inputData: { sequence: number; timestamp: number; input: InputState }): void {
    const client = this.clients.get(clientId);
    if (!client || !client.player) return;

    // Add to input buffer
    const inputEntry: ClientInputEntry = {
      ...inputData,
      processed: false,
    };

    client.inputBuffer.push(inputEntry);
    
    // Keep buffer size manageable
    if (client.inputBuffer.length > 60) {
      client.inputBuffer.shift();
    }

    // Update last acknowledged sequence
    if (inputData.sequence > client.acknowledged) {
      client.acknowledged = inputData.sequence;
    }
  }

  private start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastTick = Date.now();

    // Start game loop
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000 / GAME_CONFIG.TICK_RATE);

    // Start snapshot broadcasting
    this.snapshotInterval = setInterval(() => {
      this.broadcastSnapshot();
    }, 1000 / GAME_CONFIG.SNAPSHOT_RATE);

    this.logger.info('Game loop started');
  }

  private stop(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.logger.info('Game loop stopped');
  }

  private tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Process input buffers
    for (const [clientId, client] of this.clients) {
      this.processClientInput(client, deltaTime);
    }

    // Update game world
    this.gameWorld.update(deltaTime, now);

    // Send acknowledgments
    for (const [_, client] of this.clients) {
      if (client.acknowledged > 0) {
        this.sendMessage(client, {
          type: 'ack',
          data: { sequence: client.acknowledged },
        });
      }
    }
  }

  private processClientInput(client: ClientConnection, deltaTime: number): void {
    if (!client.player || !client.player.isAlive) return;

    // Process unprocessed inputs
    for (const inputEntry of client.inputBuffer) {
      if (!inputEntry.processed) {
        // Process input in game world
        this.gameWorld.processInput(client.id, inputEntry.input, inputEntry.timestamp);
        this.gameWorld.updatePlayerMovement(client.id, inputEntry.input, deltaTime);
        
        inputEntry.processed = true;
      }
    }

    // Clean up old processed inputs
    const cutoff = Date.now() - 1000; // Keep 1 second of history
    client.inputBuffer = client.inputBuffer.filter(input => input.timestamp > cutoff);
  }

  private broadcastSnapshot(): void {
    if (this.clients.size === 0) return;

    const gameState = this.gameWorld.getGameState();
    
    const snapshotData: SnapshotData = {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      players: gameState.players,
      asteroids: gameState.asteroids,
      bullets: gameState.bullets,
      particles: gameState.particles,
      events: [], // TODO: Implement game events
    };

    this.broadcast({
      type: 'snapshot',
      data: snapshotData,
    });
  }

  private broadcast(message: ServerMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [_, client] of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          this.logger.error(`Failed to send message to client ${client.id}:`, error);
        }
      }
    }
  }

  private broadcastToOthers(excludeClientId: string, message: ServerMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageStr);
        } catch (error) {
          this.logger.error(`Failed to send message to client ${clientId}:`, error);
        }
      }
    }
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

  isEmpty(): boolean {
    return this.clients.size === 0;
  }

  getPlayerCount(): number {
    return this.clients.size;
  }

  getInfo() {
    return {
      id: this.id,
      playerCount: this.clients.size,
      maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_ROOM,
      isActive: this.isActive,
      createdAt: this.createdAt,
      tick: this.gameWorld.tick,
    };
  }

  cleanup(): void {
    this.stop();
    
    // Close all client connections
    for (const [_, client] of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1000, 'Room closing');
      }
    }
    
    this.clients.clear();
    this.logger.info('Room cleaned up');
  }
}