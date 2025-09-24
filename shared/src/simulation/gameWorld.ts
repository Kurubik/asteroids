import { 
  Player, 
  Asteroid, 
  Bullet, 
  Particle, 
  Room,
  GameState,
  InputState,
  Vector2,
  AsteroidSize,
  ParticleType
} from '../types.js';
import { GAME_CONFIG, ASTEROID_CONFIG } from '../constants.js';
import { Vec2, randomFloat, randomVector2, generateId } from '../index.js';
import { 
  createPlayer, 
  createAsteroid, 
  createBullet, 
  createParticle,
  updatePlayerMovement,
  updateAsteroid,
  updateBullet,
  updateParticle,
  canPlayerShoot,
  respawnPlayer,
  splitAsteroid,
  getScoreForAsteroid
} from './entities.js';
import { CollisionSystem, resolveCollisions } from './collision.js';

export class GameWorld {
  private players = new Map<string, Player>();
  private asteroids = new Map<string, Asteroid>();
  private bullets = new Map<string, Bullet>();
  private particles = new Map<string, Particle>();
  private collisionSystem = new CollisionSystem();
  
  public tick = 0;
  public lastUpdate = 0;

  constructor() {
    this.initializeAsteroids();
  }

  private initializeAsteroids(): void {
    const asteroidCount = 8;
    
    for (let i = 0; i < asteroidCount; i++) {
      const position: Vector2 = {
        x: randomFloat(0, GAME_CONFIG.WORLD_WIDTH),
        y: randomFloat(0, GAME_CONFIG.WORLD_HEIGHT),
      };
      
      const velocity = randomVector2(
        ASTEROID_CONFIG.LARGE.MIN_SPEED,
        ASTEROID_CONFIG.LARGE.MAX_SPEED
      );
      
      const asteroid = createAsteroid(position, velocity, AsteroidSize.LARGE);
      this.asteroids.set(asteroid.id, asteroid);
    }
  }

  addPlayer(id: string, name: string): Player {
    const spawnPosition = this.findSafeSpawnPosition();
    const player = createPlayer(id, name, spawnPosition);
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  processInput(playerId: string, input: InputState, currentTime: number): void {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return;

    // Handle shooting
    if (input.shoot && canPlayerShoot(player, currentTime)) {
      this.shootBullet(player, currentTime);
    }
  }

  private shootBullet(player: Player, currentTime: number): void {
    const bulletDirection = Vec2.fromAngle(player.transform.rotation);
    const bulletStartPos = Vec2.add(
      player.transform.position,
      Vec2.multiply(bulletDirection, 12) // Offset from player center
    );
    
    const bullet = createBullet(
      player.id,
      bulletStartPos,
      bulletDirection,
      currentTime,
      player.velocity.linear
    );
    
    this.bullets.set(bullet.id, bullet);
    player.lastShotTime = currentTime;
  }

  update(deltaTime: number, currentTime: number): void {
    this.tick++;
    this.lastUpdate = currentTime;

    // Update players
    for (const [_, player] of this.players) {
      if (player.isAlive) {
        // Player movement is handled separately via input processing
      }
    }

    // Update asteroids
    for (const [_, asteroid] of this.asteroids) {
      updateAsteroid(asteroid, deltaTime);
    }

    // Update bullets
    const expiredBullets: string[] = [];
    for (const [id, bullet] of this.bullets) {
      if (!updateBullet(bullet, deltaTime)) {
        expiredBullets.push(id);
      }
    }

    // Remove expired bullets
    for (const bulletId of expiredBullets) {
      this.bullets.delete(bulletId);
    }

    // Update particles
    const expiredParticles: string[] = [];
    for (const [id, particle] of this.particles) {
      if (!updateParticle(particle, deltaTime)) {
        expiredParticles.push(id);
      }
    }

    // Remove expired particles
    for (const particleId of expiredParticles) {
      this.particles.delete(particleId);
    }

    // Process collisions
    this.processCollisions(currentTime);

    // Spawn new asteroids if needed
    this.maintainAsteroidCount();
  }

  private processCollisions(currentTime: number): void {
    const events = this.collisionSystem.update(
      this.players,
      this.asteroids,
      this.bullets
    );

    const result = resolveCollisions(
      events,
      this.players,
      this.asteroids,
      this.bullets,
      currentTime
    );

    // Apply collision results
    for (const playerId of result.destroyedPlayers) {
      const player = this.players.get(playerId);
      if (player) {
        player.isAlive = false;
        player.health = 0;
        
        // Schedule respawn if player has lives left
        if (player.lives > 0) {
          setTimeout(() => {
            this.respawnPlayerSafely(playerId, currentTime + 3000);
          }, 3000);
        }
      }
    }

    for (const asteroidId of result.destroyedAsteroids) {
      this.asteroids.delete(asteroidId);
    }

    for (const bulletId of result.destroyedBullets) {
      this.bullets.delete(bulletId);
    }

    for (const asteroid of result.newAsteroids) {
      this.asteroids.set(asteroid.id, asteroid);
    }

    for (const scoreUpdate of result.scoreUpdates) {
      const player = this.players.get(scoreUpdate.playerId);
      if (player) {
        player.score += scoreUpdate.points;
      }
    }

    for (const effect of result.particleEffects) {
      this.createParticleEffect(effect.position, effect.type as ParticleType, effect.count);
    }
  }

  private createParticleEffect(position: Vector2, type: ParticleType, count: number): void {
    for (let i = 0; i < count; i++) {
      const velocity = randomVector2(50, 200);
      const particle = createParticle(position, velocity, type);
      this.particles.set(particle.id, particle);
    }
  }

  private findSafeSpawnPosition(): Vector2 {
    const maxAttempts = 50;
    const minDistance = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const position: Vector2 = {
        x: randomFloat(100, GAME_CONFIG.WORLD_WIDTH - 100),
        y: randomFloat(100, GAME_CONFIG.WORLD_HEIGHT - 100),
      };

      let isSafe = true;

      // Check distance from asteroids
      for (const [_, asteroid] of this.asteroids) {
        const distance = Vec2.distance(position, asteroid.transform.position);
        if (distance < minDistance + asteroid.radius) {
          isSafe = false;
          break;
        }
      }

      // Check distance from other players
      if (isSafe) {
        for (const [_, player] of this.players) {
          if (player.isAlive) {
            const distance = Vec2.distance(position, player.transform.position);
            if (distance < minDistance) {
              isSafe = false;
              break;
            }
          }
        }
      }

      if (isSafe) {
        return position;
      }
    }

    // If no safe position found, return center
    return {
      x: GAME_CONFIG.WORLD_WIDTH / 2,
      y: GAME_CONFIG.WORLD_HEIGHT / 2,
    };
  }

  private respawnPlayerSafely(playerId: string, currentTime: number): void {
    const player = this.players.get(playerId);
    if (!player || player.lives <= 0) return;

    const spawnPosition = this.findSafeSpawnPosition();
    respawnPlayer(player, spawnPosition, currentTime);
  }

  private maintainAsteroidCount(): void {
    const minAsteroids = 4;
    const maxAsteroids = 12;

    if (this.asteroids.size < minAsteroids) {
      const spawnCount = minAsteroids - this.asteroids.size;
      
      for (let i = 0; i < spawnCount; i++) {
        const position = this.findSafeSpawnPosition();
        const velocity = randomVector2(
          ASTEROID_CONFIG.LARGE.MIN_SPEED,
          ASTEROID_CONFIG.LARGE.MAX_SPEED
        );
        
        const asteroid = createAsteroid(position, velocity, AsteroidSize.LARGE);
        this.asteroids.set(asteroid.id, asteroid);
      }
    }
  }

  updatePlayerMovement(playerId: string, input: InputState, deltaTime: number): void {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return;

    updatePlayerMovement(player, input, deltaTime);
    
    // Create thrust particles
    if (input.thrust) {
      const thrustDirection = Vec2.fromAngle(player.transform.rotation + Math.PI);
      const thrustPosition = Vec2.add(
        player.transform.position,
        Vec2.multiply(thrustDirection, 8)
      );
      
      const thrustVelocity = Vec2.add(
        Vec2.multiply(thrustDirection, randomFloat(50, 100)),
        Vec2.multiply(player.velocity.linear, 0.5) // Add some player velocity
      );
      
      const particle = createParticle(thrustPosition, thrustVelocity, ParticleType.THRUST);
      this.particles.set(particle.id, particle);
    }
  }

  getGameState(): GameState {
    return {
      players: Array.from(this.players.values()),
      asteroids: Array.from(this.asteroids.values()),
      bullets: Array.from(this.bullets.values()),
      particles: Array.from(this.particles.values()),
      tick: this.tick,
      timestamp: this.lastUpdate,
    };
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  reset(): void {
    this.players.clear();
    this.bullets.clear();
    this.particles.clear();
    this.asteroids.clear();
    this.tick = 0;
    this.lastUpdate = 0;
    this.initializeAsteroids();
  }

  getDebugInfo() {
    return {
      players: this.players.size,
      asteroids: this.asteroids.size,
      bullets: this.bullets.size,
      particles: this.particles.size,
      tick: this.tick,
      collision: this.collisionSystem.getDebugInfo(),
    };
  }
}
