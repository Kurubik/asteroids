export interface Vector2 {
  x: number;
  y: number;
}

export interface Transform {
  position: Vector2;
  rotation: number;
}

export interface Velocity {
  linear: Vector2;
  angular: number;
}

export interface Player {
  id: string;
  name: string;
  transform: Transform;
  velocity: Velocity;
  health: number;
  score: number;
  lives: number;
  isAlive: boolean;
  lastInputSequence: number;
  invulnerableUntil: number;
  lastShotTime: number;
}

export interface Asteroid {
  id: string;
  transform: Transform;
  velocity: Velocity;
  size: AsteroidSize;
  radius: number;
}

export interface Bullet {
  id: string;
  playerId: string;
  transform: Transform;
  velocity: Vector2;
  createdAt: number;
  lifetime: number;
}

export interface Particle {
  id: string;
  transform: Transform;
  velocity: Vector2;
  lifetime: number;
  maxLifetime: number;
  type: ParticleType;
}

export interface Room {
  id: string;
  players: Map<string, Player>;
  asteroids: Map<string, Asteroid>;
  bullets: Map<string, Bullet>;
  particles: Map<string, Particle>;
  tick: number;
  lastUpdate: number;
}

export interface GameState {
  players: Player[];
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[];
  tick: number;
  timestamp: number;
}

export interface InputState {
  thrust: boolean;
  rotate: number; // -1, 0, 1
  brake: boolean;
  shoot: boolean;
}

export interface ClientInput {
  sequence: number;
  timestamp: number;
  input: InputState;
}

export interface ServerMessage {
  type: 'welcome' | 'snapshot' | 'ack' | 'pong' | 'playerJoined' | 'playerLeft' | 'error';
  data: any;
}

export interface ClientMessage {
  type: 'join' | 'input' | 'ping' | 'leave';
  data: any;
}

export interface WelcomeData {
  playerId: string;
  roomId: string;
  gameState: GameState;
}

export interface SnapshotData {
  tick: number;
  timestamp: number;
  players: Partial<Player>[];
  asteroids: Partial<Asteroid>[];
  bullets: Partial<Bullet>[];
  particles: Partial<Particle>[];
  events: GameEvent[];
}

export interface GameEvent {
  type: 'playerDestroyed' | 'asteroidDestroyed' | 'bulletHit' | 'playerRespawned';
  data: any;
  timestamp: number;
}

export interface JoinData {
  name: string;
  roomId?: string;
}

export interface InputData extends ClientInput {}

export interface PingData {
  timestamp: number;
}

export enum AsteroidSize {
  LARGE = 'large',
  MEDIUM = 'medium',
  SMALL = 'small',
}

export enum ParticleType {
  THRUST = 'thrust',
  EXPLOSION = 'explosion',
  BULLET_HIT = 'bulletHit',
}

export interface CollisionResult {
  collided: boolean;
  depth?: number;
  normal?: Vector2;
}

export interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}