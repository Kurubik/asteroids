import { WebSocket } from 'ws';
import { Player, InputState, ClientMessage, ServerMessage } from '@asteroid-storm/shared';

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  player?: Player;
  roomId?: string;
  lastPing: number;
  inputBuffer: ClientInputEntry[];
  acknowledged: number;
}

export interface ClientInputEntry {
  sequence: number;
  timestamp: number;
  input: InputState;
  processed: boolean;
}

export interface RoomState {
  id: string;
  clients: Map<string, ClientConnection>;
  gameWorld: any; // Will be GameWorld from shared
  lastTick: number;
  isActive: boolean;
  createdAt: number;
}

export interface ServerConfig {
  port: number;
  wsPort: number;
  tickRate: number;
  maxPlayersPerRoom: number;
  maxRooms: number;
}

export interface ServerStats {
  uptime: number;
  connectedClients: number;
  activeRooms: number;
  totalRooms: number;
  messagesPerSecond: number;
  ticksPerSecond: number;
}

export interface MessageHandler {
  type: string;
  handler: (client: ClientConnection, data: any) => void;
}