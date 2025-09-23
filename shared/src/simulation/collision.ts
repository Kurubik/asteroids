import { 
  Player, 
  Asteroid, 
  Bullet, 
  Vector2, 
  CollisionResult 
} from '../types.js';
import { PLAYER_CONFIG, PHYSICS_CONFIG } from '../constants.js';
import { Vec2, circleCircleCollision, SpatialHash } from '../index.js';

export class CollisionSystem {
  private spatialHash: SpatialHash;

  constructor() {
    this.spatialHash = new SpatialHash(PHYSICS_CONFIG.SPATIAL_HASH_CELL_SIZE);
  }

  update(
    players: Map<string, Player>,
    asteroids: Map<string, Asteroid>,
    bullets: Map<string, Bullet>
  ): CollisionEvents {
    this.spatialHash.clear();

    // Insert all entities into spatial hash
    for (const [id, player] of players) {
      if (player.isAlive) {
        this.spatialHash.insert(
          `player_${id}`,
          player.transform.position,
          PLAYER_CONFIG.RADIUS
        );
      }
    }

    for (const [id, asteroid] of asteroids) {
      this.spatialHash.insert(
        `asteroid_${id}`,
        asteroid.transform.position,
        asteroid.radius
      );
    }

    for (const [id, bullet] of bullets) {
      this.spatialHash.insert(
        `bullet_${id}`,
        bullet.transform.position,
        2 // Small radius for bullets
      );
    }

    const events: CollisionEvents = {
      playerAsteroidCollisions: [],
      bulletAsteroidCollisions: [],
      playerBulletCollisions: [],
    };

    // Check player-asteroid collisions
    for (const [playerId, player] of players) {
      if (!player.isAlive) continue;

      const candidates = this.spatialHash.query(
        player.transform.position,
        PLAYER_CONFIG.RADIUS
      );

      for (const candidateId of candidates) {
        if (candidateId.startsWith('asteroid_')) {
          const asteroidId = candidateId.substring(9);
          const asteroid = asteroids.get(asteroidId);
          
          if (asteroid && this.checkPlayerAsteroidCollision(player, asteroid)) {
            events.playerAsteroidCollisions.push({
              playerId,
              asteroidId,
              player,
              asteroid,
            });
          }
        }
      }
    }

    // Check bullet-asteroid collisions
    for (const [bulletId, bullet] of bullets) {
      const candidates = this.spatialHash.query(bullet.transform.position, 2);

      for (const candidateId of candidates) {
        if (candidateId.startsWith('asteroid_')) {
          const asteroidId = candidateId.substring(9);
          const asteroid = asteroids.get(asteroidId);
          
          if (asteroid && this.checkBulletAsteroidCollision(bullet, asteroid)) {
            events.bulletAsteroidCollisions.push({
              bulletId,
              asteroidId,
              bullet,
              asteroid,
            });
          }
        }
      }
    }

    // Check player-bullet collisions (for friendly fire, if enabled)
    for (const [playerId, player] of players) {
      if (!player.isAlive) continue;

      const candidates = this.spatialHash.query(
        player.transform.position,
        PLAYER_CONFIG.RADIUS
      );

      for (const candidateId of candidates) {
        if (candidateId.startsWith('bullet_')) {
          const bulletId = candidateId.substring(7);
          const bullet = bullets.get(bulletId);
          
          if (
            bullet && 
            bullet.playerId !== playerId && // Don't collide with own bullets
            this.checkPlayerBulletCollision(player, bullet)
          ) {
            events.playerBulletCollisions.push({
              playerId,
              bulletId,
              player,
              bullet,
            });
          }
        }
      }
    }

    return events;
  }

  private checkPlayerAsteroidCollision(player: Player, asteroid: Asteroid): boolean {
    return circleCircleCollision(
      player.transform.position,
      PLAYER_CONFIG.RADIUS,
      asteroid.transform.position,
      asteroid.radius
    ).collided;
  }

  private checkBulletAsteroidCollision(bullet: Bullet, asteroid: Asteroid): boolean {
    return circleCircleCollision(
      bullet.transform.position,
      2, // Bullet radius
      asteroid.transform.position,
      asteroid.radius
    ).collided;
  }

  private checkPlayerBulletCollision(player: Player, bullet: Bullet): boolean {
    return circleCircleCollision(
      player.transform.position,
      PLAYER_CONFIG.RADIUS,
      bullet.transform.position,
      2 // Bullet radius
    ).collided;
  }

  getDebugInfo(): { objectCount: number; cellCount: number } {
    return {
      objectCount: this.spatialHash.getObjectCount(),
      cellCount: this.spatialHash.getCellCount(),
    };
  }
}

export interface CollisionEvents {
  playerAsteroidCollisions: PlayerAsteroidCollision[];
  bulletAsteroidCollisions: BulletAsteroidCollision[];
  playerBulletCollisions: PlayerBulletCollision[];
}

export interface PlayerAsteroidCollision {
  playerId: string;
  asteroidId: string;
  player: Player;
  asteroid: Asteroid;
}

export interface BulletAsteroidCollision {
  bulletId: string;
  asteroidId: string;
  bullet: Bullet;
  asteroid: Asteroid;
}

export interface PlayerBulletCollision {
  playerId: string;
  bulletId: string;
  player: Player;
  bullet: Bullet;
}

export function resolveCollisions(
  events: CollisionEvents,
  players: Map<string, Player>,
  asteroids: Map<string, Asteroid>,
  bullets: Map<string, Bullet>,
  currentTime: number
): ResolveCollisionResult {
  const result: ResolveCollisionResult = {
    destroyedPlayers: [],
    destroyedAsteroids: [],
    destroyedBullets: [],
    newAsteroids: [],
    scoreUpdates: [],
    particleEffects: [],
  };

  // Handle player-asteroid collisions
  for (const collision of events.playerAsteroidCollisions) {
    const { player, asteroid } = collision;
    
    // Damage player
    const playerDestroyed = damagePlayerFromCollision(
      player,
      100, // Full damage from asteroid collision
      currentTime
    );
    
    if (playerDestroyed) {
      result.destroyedPlayers.push(collision.playerId);
      
      // Create explosion particles at player position
      result.particleEffects.push({
        position: { ...player.transform.position },
        type: 'explosion',
        count: 8,
      });
    }
  }

  // Handle bullet-asteroid collisions
  for (const collision of events.bulletAsteroidCollisions) {
    const { bullet, asteroid } = collision;
    
    // Destroy bullet
    result.destroyedBullets.push(collision.bulletId);
    
    // Split asteroid
    const newAsteroids = splitAsteroidFromBullet(asteroid);
    result.newAsteroids.push(...newAsteroids);
    
    // Destroy original asteroid
    result.destroyedAsteroids.push(collision.asteroidId);
    
    // Award points to bullet owner
    const score = getAsteroidScore(asteroid);
    result.scoreUpdates.push({
      playerId: bullet.playerId,
      points: score,
    });
    
    // Create particle effects
    result.particleEffects.push({
      position: { ...asteroid.transform.position },
      type: 'explosion',
      count: 6,
    });
    
    result.particleEffects.push({
      position: { ...bullet.transform.position },
      type: 'bulletHit',
      count: 3,
    });
  }

  // Handle player-bullet collisions (friendly fire)
  for (const collision of events.playerBulletCollisions) {
    const { player, bullet } = collision;
    
    // Destroy bullet
    result.destroyedBullets.push(collision.bulletId);
    
    // Damage player
    const playerDestroyed = damagePlayerFromCollision(
      player,
      25, // Reduced damage from bullet
      currentTime
    );
    
    if (playerDestroyed) {
      result.destroyedPlayers.push(collision.playerId);
      
      // Create explosion particles
      result.particleEffects.push({
        position: { ...player.transform.position },
        type: 'explosion',
        count: 6,
      });
    }
    
    // Create bullet hit particles
    result.particleEffects.push({
      position: { ...bullet.transform.position },
      type: 'bulletHit',
      count: 2,
    });
  }

  return result;
}

export interface ResolveCollisionResult {
  destroyedPlayers: string[];
  destroyedAsteroids: string[];
  destroyedBullets: string[];
  newAsteroids: Asteroid[];
  scoreUpdates: { playerId: string; points: number }[];
  particleEffects: { position: Vector2; type: string; count: number }[];
}

function damagePlayerFromCollision(
  player: Player,
  damage: number,
  currentTime: number
): boolean {
  // Check if player is invulnerable
  if (currentTime < player.invulnerableUntil || !player.isAlive) {
    return false;
  }
  
  player.health -= damage;
  
  if (player.health <= 0) {
    player.health = 0;
    player.isAlive = false;
    player.lives = Math.max(0, player.lives - 1);
    return true;
  }
  
  return false;
}

function splitAsteroidFromBullet(asteroid: Asteroid): Asteroid[] {
  import('./entities.js').then(({ splitAsteroid }) => {
    return splitAsteroid(asteroid);
  });
  // For now, return empty array to avoid circular dependency
  return [];
}

function getAsteroidScore(asteroid: Asteroid): number {
  // Return score directly to avoid circular dependency
  import('../constants.js').then(({ ASTEROID_CONFIG }) => {
    const config = ASTEROID_CONFIG[asteroid.size.toUpperCase() as keyof typeof ASTEROID_CONFIG];
    return config.POINTS;
  });
  
  // For now, return fixed values to avoid async issues
  switch (asteroid.size) {
    case 'large': return 20;
    case 'medium': return 50;
    case 'small': return 100;
    default: return 0;
  }
}