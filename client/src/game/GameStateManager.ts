import { GameState, Player, SnapshotData, Vec2 } from '@shared/index.js';

export class GameStateManager {
  private currentState: GameState | null = null;
  private previousState: GameState | null = null;
  private stateBuffer: GameState[] = [];
  private maxBufferSize = 60; // ~1 second at 60fps

  updateState(gameState: GameState): void {
    this.previousState = this.currentState;
    this.currentState = gameState;
    
    // Add to buffer
    this.stateBuffer.push(gameState);
    
    // Keep buffer size manageable
    if (this.stateBuffer.length > this.maxBufferSize) {
      this.stateBuffer.shift();
    }
  }

  applySnapshot(snapshot: SnapshotData): void {
    if (!this.currentState) return;

    // Update the current state with snapshot data
    const newState: GameState = {
      players: snapshot.players as Player[],
      asteroids: snapshot.asteroids as any[],
      bullets: snapshot.bullets as any[],
      particles: snapshot.particles as any[],
      tick: snapshot.tick,
      timestamp: snapshot.timestamp,
    };

    this.updateState(newState);
  }

  update(deltaTime: number): void {
    if (!this.currentState) return;

    // Interpolate between states if we have both current and previous
    if (this.previousState) {
      // Simple interpolation for smooth movement
      this.interpolateState(deltaTime);
    }
  }

  private interpolateState(deltaTime: number): void {
    if (!this.currentState || !this.previousState) return;

    const lerpFactor = Math.min(deltaTime * 10, 1); // Adjust interpolation speed

    // Interpolate player positions
    for (let i = 0; i < this.currentState.players.length; i++) {
      const currentPlayer = this.currentState.players[i];
      const prevPlayer = this.previousState.players.find(p => p.id === currentPlayer.id);
      
      if (prevPlayer && currentPlayer.isAlive && prevPlayer.isAlive) {
        currentPlayer.transform.position = Vec2.lerp(
          prevPlayer.transform.position,
          currentPlayer.transform.position,
          lerpFactor
        );
      }
    }

    // Interpolate asteroid positions
    for (let i = 0; i < this.currentState.asteroids.length; i++) {
      const currentAsteroid = this.currentState.asteroids[i];
      const prevAsteroid = this.previousState.asteroids.find(a => a.id === currentAsteroid.id);
      
      if (prevAsteroid) {
        currentAsteroid.transform.position = Vec2.lerp(
          prevAsteroid.transform.position,
          currentAsteroid.transform.position,
          lerpFactor
        );
      }
    }

    // Bullets and particles generally don't need interpolation due to their short lifetime
  }

  getCurrentState(): GameState | null {
    return this.currentState;
  }

  getPlayer(playerId: string): Player | undefined {
    if (!this.currentState) return undefined;
    return this.currentState.players.find(p => p.id === playerId);
  }

  getAllPlayers(): Player[] {
    if (!this.currentState) return [];
    return this.currentState.players;
  }

  getStateAtTick(tick: number): GameState | null {
    return this.stateBuffer.find(state => state.tick === tick) || null;
  }

  getLatestTick(): number {
    return this.currentState?.tick || 0;
  }

  hasState(): boolean {
    return this.currentState !== null;
  }

  reset(): void {
    this.currentState = null;
    this.previousState = null;
    this.stateBuffer = [];
  }

  getDebugInfo() {
    return {
      hasState: this.hasState(),
      currentTick: this.getLatestTick(),
      bufferSize: this.stateBuffer.length,
      playerCount: this.currentState?.players.length || 0,
      asteroidCount: this.currentState?.asteroids.length || 0,
      bulletCount: this.currentState?.bullets.length || 0,
      particleCount: this.currentState?.particles.length || 0,
    };
  }
}