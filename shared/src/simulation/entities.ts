import { 
  Player, 
  Asteroid, 
  Bullet, 
  Particle, 
  Transform, 
  Velocity, 
  Vector2, 
  AsteroidSize, 
  ParticleType 
} from '../types';
import { 
  PLAYER_CONFIG, 
  ASTEROID_CONFIG, 
  PARTICLE_CONFIG, 
  GAME_CONFIG 
} from '../constants';
import { Vec2, wrapPosition, randomVector2 } from '../math';
import { generateId } from '../utils';

export function createPlayer(id: string, name: string, position: Vector2): Player {
  return {
    id,
    name,
    transform: {
      position: { ...position },
      rotation: 0,
    },
    velocity: {
      linear: Vec2.zero(),
      angular: 0,
    },
    health: PLAYER_CONFIG.MAX_HEALTH,
    score: 0,
    lives: PLAYER_CONFIG.MAX_LIVES,
    isAlive: true,
    lastInputSequence: 0,
    invulnerableUntil: 0,
    lastShotTime: 0,
  };
}

export function createAsteroid(
  position: Vector2, 
  velocity: Vector2, 
  size: AsteroidSize
): Asteroid {
  const config = ASTEROID_CONFIG[size.toUpperCase() as keyof typeof ASTEROID_CONFIG];
  
  return {
    id: generateId(),
    transform: {
      position: { ...position },
      rotation: Math.random() * Math.PI * 2,
    },
    velocity: {
      linear: { ...velocity },
      angular: (Math.random() - 0.5) * 4,
    },
    size,
    radius: config.RADIUS,
  };
}

export function createBullet(
  playerId: string, 
  position: Vector2, 
  direction: Vector2, 
  timestamp: number
): Bullet {
  return {
    id: generateId(),
    playerId,
    transform: {
      position: { ...position },
      rotation: Vec2.angle(direction),
    },
    velocity: Vec2.multiply(Vec2.normalize(direction), PLAYER_CONFIG.BULLET_SPEED),
    createdAt: timestamp,
    lifetime: PLAYER_CONFIG.BULLET_LIFETIME,
  };
}

export function createParticle(
  position: Vector2,
  velocity: Vector2,
  type: ParticleType,
  lifetime?: number
): Particle {
  const config = PARTICLE_CONFIG[type.toUpperCase() as keyof typeof PARTICLE_CONFIG];
  const particleLifetime = lifetime || config.LIFETIME;
  
  return {
    id: generateId(),
    transform: {
      position: { ...position },
      rotation: Vec2.angle(velocity),
    },
    velocity: { ...velocity },
    lifetime: particleLifetime,
    maxLifetime: particleLifetime,
    type,
  };
}

export function updatePlayerMovement(
  player: Player,
  input: { thrust: boolean; rotate: number; brake: boolean },
  deltaTime: number
): void {
  const { transform, velocity } = player;
  
  // Apply rotation
  if (input.rotate !== 0) {
    transform.rotation += input.rotate * PLAYER_CONFIG.ROTATION_SPEED * deltaTime;
  }
  
  // Apply thrust
  if (input.thrust) {
    const thrustVector = Vec2.fromAngle(transform.rotation, PLAYER_CONFIG.ACCELERATION * deltaTime);
    velocity.linear = Vec2.add(velocity.linear, thrustVector);
  }
  
  // Apply braking
  if (input.brake) {
    const speed = Vec2.length(velocity.linear);
    if (speed > 0) {
      const brakeForce = PLAYER_CONFIG.BRAKE_DECELERATION * deltaTime;
      const normalizedVel = Vec2.normalize(velocity.linear);
      const brakeVector = Vec2.multiply(normalizedVel, Math.min(brakeForce, speed));
      velocity.linear = Vec2.subtract(velocity.linear, brakeVector);
    }
  }
  
  // Limit maximum speed
  velocity.linear = Vec2.limitLength(velocity.linear, PLAYER_CONFIG.MAX_SPEED);
  
  // Update position
  const deltaPos = Vec2.multiply(velocity.linear, deltaTime);
  transform.position = Vec2.add(transform.position, deltaPos);
  
  // Wrap around world boundaries
  transform.position = wrapPosition(
    transform.position,
    GAME_CONFIG.WORLD_WIDTH,
    GAME_CONFIG.WORLD_HEIGHT
  );
}

export function updateAsteroid(asteroid: Asteroid, deltaTime: number): void {
  const { transform, velocity } = asteroid;
  
  // Update rotation
  transform.rotation += velocity.angular * deltaTime;
  
  // Update position
  const deltaPos = Vec2.multiply(velocity.linear, deltaTime);
  transform.position = Vec2.add(transform.position, deltaPos);
  
  // Wrap around world boundaries
  transform.position = wrapPosition(
    transform.position,
    GAME_CONFIG.WORLD_WIDTH,
    GAME_CONFIG.WORLD_HEIGHT
  );
}

export function updateBullet(bullet: Bullet, deltaTime: number): boolean {
  const { transform, velocity } = bullet;
  
  // Update position
  const deltaPos = Vec2.multiply(velocity, deltaTime);
  transform.position = Vec2.add(transform.position, deltaPos);
  
  // Wrap around world boundaries
  transform.position = wrapPosition(
    transform.position,
    GAME_CONFIG.WORLD_WIDTH,
    GAME_CONFIG.WORLD_HEIGHT
  );
  
  // Check if bullet has expired
  bullet.lifetime -= deltaTime * 1000; // Convert to milliseconds
  return bullet.lifetime > 0;
}

export function updateParticle(particle: Particle, deltaTime: number): boolean {
  const { transform, velocity } = particle;
  
  // Update position
  const deltaPos = Vec2.multiply(velocity, deltaTime);
  transform.position = Vec2.add(transform.position, deltaPos);
  
  // Update lifetime
  particle.lifetime -= deltaTime * 1000; // Convert to milliseconds
  
  // Apply fade effect based on lifetime
  const lifetimeRatio = particle.lifetime / particle.maxLifetime;
  
  // Optional: Apply physics effects based on particle type
  if (particle.type === ParticleType.EXPLOSION) {
    // Slow down explosion particles over time
    velocity.x *= 0.95;
    velocity.y *= 0.95;
  }
  
  return particle.lifetime > 0;
}

export function splitAsteroid(asteroid: Asteroid): Asteroid[] {
  const config = ASTEROID_CONFIG[asteroid.size.toUpperCase() as keyof typeof ASTEROID_CONFIG];
  
  if (config.SPLIT_COUNT === 0) {
    return [];
  }
  
  const newAsteroids: Asteroid[] = [];
  let newSize: AsteroidSize;
  
  switch (asteroid.size) {
    case AsteroidSize.LARGE:
      newSize = AsteroidSize.MEDIUM;
      break;
    case AsteroidSize.MEDIUM:
      newSize = AsteroidSize.SMALL;
      break;
    default:
      return [];
  }
  
  const newConfig = ASTEROID_CONFIG[newSize.toUpperCase() as keyof typeof ASTEROID_CONFIG];
  
  for (let i = 0; i < config.SPLIT_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / config.SPLIT_COUNT + Math.random() * 0.5;
    const speed = Math.random() * (newConfig.MAX_SPEED - newConfig.MIN_SPEED) + newConfig.MIN_SPEED;
    const velocity = Vec2.fromAngle(angle, speed);
    
    // Offset position slightly to prevent immediate re-collision
    const offsetDistance = asteroid.radius + newConfig.RADIUS + 5;
    const offsetPosition = Vec2.add(
      asteroid.transform.position,
      Vec2.fromAngle(angle, offsetDistance)
    );
    
    newAsteroids.push(createAsteroid(offsetPosition, velocity, newSize));
  }
  
  return newAsteroids;
}

export function canPlayerShoot(player: Player, currentTime: number): boolean {
  return currentTime - player.lastShotTime >= PLAYER_CONFIG.FIRE_RATE;
}

export function isPlayerInvulnerable(player: Player, currentTime: number): boolean {
  return currentTime < player.invulnerableUntil;
}

export function respawnPlayer(player: Player, position: Vector2, currentTime: number): void {
  player.transform.position = { ...position };
  player.transform.rotation = 0;
  player.velocity.linear = Vec2.zero();
  player.velocity.angular = 0;
  player.health = PLAYER_CONFIG.MAX_HEALTH;
  player.isAlive = true;
  player.invulnerableUntil = currentTime + PLAYER_CONFIG.INVULNERABILITY_TIME;
}

export function damagePlayer(player: Player, damage: number, currentTime: number): boolean {
  if (isPlayerInvulnerable(player, currentTime) || !player.isAlive) {
    return false;
  }
  
  player.health -= damage;
  
  if (player.health <= 0) {
    player.health = 0;
    player.isAlive = false;
    player.lives = Math.max(0, player.lives - 1);
    return true; // Player was destroyed
  }
  
  return false;
}

export function getScoreForAsteroid(size: AsteroidSize): number {
  const config = ASTEROID_CONFIG[size.toUpperCase() as keyof typeof ASTEROID_CONFIG];
  return config.POINTS;
}