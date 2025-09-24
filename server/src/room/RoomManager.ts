import { Room } from './Room.js';
import { ClientConnection, ServerConfig } from '../types.js';
import { generateId, generateRoomCode, GAME_CONFIG } from '@asteroid-storm/shared';
import { Logger } from '../utils/Logger.js';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private roomCodes = new Map<string, string>(); // code -> roomId
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: ServerConfig) {
    this.logger = new Logger('RoomManager');
    
    // Cleanup empty rooms every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupEmptyRooms();
    }, 30000);
  }

  createRoom(roomCode?: string): Room {
    if (this.rooms.size >= this.config.maxRooms) {
      throw new Error('Maximum number of rooms reached');
    }

    const roomId = generateId();
    const room = new Room(roomId);
    
    this.rooms.set(roomId, room);

    // Generate or use provided room code
    const code = roomCode || this.generateUniqueRoomCode();
    this.roomCodes.set(code, roomId);

    this.logger.info(`Room created: ${roomId} (code: ${code})`);
    return room;
  }

  findOrCreateRoom(roomCode?: string): Room {
    if (roomCode) {
      // Try to join existing room by code
      const roomId = this.roomCodes.get(roomCode);
      if (roomId) {
        const room = this.rooms.get(roomId);
        if (room && room.getPlayerCount() < GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
          return room;
        }
      }
      
      // Room code doesn't exist or is full, create new room with this code
      return this.createRoom(roomCode);
    } else {
      // Find available room for quickplay
      for (const [_, room] of this.rooms) {
        if (room.getPlayerCount() < GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
          return room;
        }
      }
      
      // No available rooms, create new one
      return this.createRoom();
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove room code mapping
    for (const [code, id] of this.roomCodes) {
      if (id === roomId) {
        this.roomCodes.delete(code);
        break;
      }
    }

    // Cleanup room
    room.cleanup();
    this.rooms.delete(roomId);

    this.logger.info(`Room removed: ${roomId}`);
  }

  joinRoom(client: ClientConnection, playerName: string, roomCode?: string): boolean {
    try {
      const room = this.findOrCreateRoom(roomCode);
      return room.addClient(client, playerName);
    } catch (error) {
      this.logger.error('Failed to join room:', error);
      return false;
    }
  }

  leaveRoom(client: ClientConnection): void {
    if (!client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (room) {
      room.removeClient(client.id);
      
      // Remove room if empty
      if (room.isEmpty()) {
        this.removeRoom(client.roomId);
      }
    }

    client.roomId = undefined;
    client.player = undefined;
  }

  processInput(client: ClientConnection, inputData: any): void {
    if (!client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (room) {
      room.processInput(client.id, inputData);
    }
  }

  private generateUniqueRoomCode(): string {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const code = generateRoomCode();
      if (!this.roomCodes.has(code)) {
        return code;
      }
      attempts++;
    }

    // Fallback to timestamp-based code
    return Date.now().toString(36).toUpperCase();
  }

  private cleanupEmptyRooms(): void {
    const emptyRooms: string[] = [];

    for (const [roomId, room] of this.rooms) {
      if (room.isEmpty()) {
        const age = Date.now() - room.createdAt;
        // Remove rooms that have been empty for more than 5 minutes
        if (age > 5 * 60 * 1000) {
          emptyRooms.push(roomId);
        }
      }
    }

    for (const roomId of emptyRooms) {
      this.removeRoom(roomId);
    }

    if (emptyRooms.length > 0) {
      this.logger.info(`Cleaned up ${emptyRooms.length} empty rooms`);
    }
  }

  getStats() {
    const totalPlayers = Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.getPlayerCount(), 0);

    return {
      activeRooms: this.rooms.size,
      totalRooms: this.rooms.size,
      connectedPlayers: totalPlayers,
      maxRooms: this.config.maxRooms,
    };
  }

  getRoomList() {
    return Array.from(this.rooms.values()).map(room => room.getInfo());
  }

  shutdown(): void {
    this.logger.info('Shutting down room manager...');

    // Clear cleanup interval
    clearInterval(this.cleanupInterval);

    // Close all rooms
    for (const [roomId, _] of this.rooms) {
      this.removeRoom(roomId);
    }

    this.rooms.clear();
    this.roomCodes.clear();
  }
}