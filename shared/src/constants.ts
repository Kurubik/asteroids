export const GAME_CONFIG = {
  WORLD_WIDTH: 4096,
  WORLD_HEIGHT: 4096,
  CAMERA_WIDTH: 1024,
  CAMERA_HEIGHT: 1024,
  
  TICK_RATE: 60,
  SNAPSHOT_RATE: 20,
  FIXED_TIMESTEP: 1 / 60,
  
  MAX_PLAYERS_PER_ROOM: 8,
  MAX_ROOMS: 100,
  
  INTERPOLATION_BUFFER: 100, // ms
  EXTRAPOLATION_LIMIT: 200, // ms
} as const;

export const PLAYER_CONFIG = {
  RADIUS: 8,
  MAX_SPEED: 420,
  ACCELERATION: 320,
  BRAKE_DECELERATION: 180, // gentler braking for more drift
  ROTATION_SPEED: 5.2, // rad/s - snappier rotation like classic Asteroids
  
  MAX_HEALTH: 100,
  MAX_LIVES: 3,
  INVULNERABILITY_TIME: 2000, // ms
  
  FIRE_RATE: 120, // ms between shots
  BULLET_SPEED: 900,
  BULLET_LIFETIME: 3000, // ms, bullets travel further
} as const;

export const ASTEROID_CONFIG = {
  LARGE: {
    RADIUS: 40,
    MIN_SPEED: 20,
    MAX_SPEED: 60,
    POINTS: 20,
    SPLIT_COUNT: 2,
  },
  MEDIUM: {
    RADIUS: 20,
    MIN_SPEED: 40,
    MAX_SPEED: 100,
    POINTS: 50,
    SPLIT_COUNT: 2,
  },
  SMALL: {
    RADIUS: 10,
    MIN_SPEED: 60,
    MAX_SPEED: 140,
    POINTS: 100,
    SPLIT_COUNT: 0,
  },
} as const;

export const PARTICLE_CONFIG = {
  THRUST: {
    LIFETIME: 200,
    COUNT: 3,
    SPEED_RANGE: [50, 100],
  },
  EXPLOSION: {
    LIFETIME: 1000,
    COUNT: 8,
    SPEED_RANGE: [100, 300],
  },
  BULLET_HIT: {
    LIFETIME: 300,
    COUNT: 4,
    SPEED_RANGE: [30, 80],
  },
} as const;

export const NETWORK_CONFIG = {
  HEARTBEAT_INTERVAL: 5000, // ms
  CONNECTION_TIMEOUT: 10000, // ms
  RECONNECT_DELAY: 1000, // ms
  MAX_RECONNECT_ATTEMPTS: 5,
  
  INPUT_BUFFER_SIZE: 60,
  SNAPSHOT_BUFFER_SIZE: 60,
  
  COMPRESSION_THRESHOLD: 1024, // bytes
} as const;

export const PHYSICS_CONFIG = {
  COLLISION_LAYERS: {
    PLAYER: 1,
    ASTEROID: 2,
    BULLET: 4,
    BOUNDARY: 8,
  },
  
  SPATIAL_HASH_CELL_SIZE: 100,
  SPATIAL_HASH_BOUNDS: {
    x: GAME_CONFIG.WORLD_WIDTH,
    y: GAME_CONFIG.WORLD_HEIGHT,
  },
} as const;

export const AUDIO_CONFIG = {
  MASTER_VOLUME: 0.7,
  SFX_VOLUME: 0.8,
  ENGINE_VOLUME: 0.6,
  
  SAMPLE_RATE: 44100,
  BUFFER_SIZE: 4096,
} as const;

export const RENDER_CONFIG = {
  TARGET_FPS: 60,
  VSYNC: true,
  
  LINE_WIDTH: 2,
  GLOW_INTENSITY: 0.3,
  
  COLORS: {
    PLAYER: 0x00ff00,
    ASTEROID: 0xffffff,
    BULLET: 0xffff00,
    THRUST: 0xff6600,
    EXPLOSION: 0xff0000,
    UI: 0x00ffff,
    BACKGROUND: 0x000000,
  },
} as const;
