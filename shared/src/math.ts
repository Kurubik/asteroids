import { Vector2, CollisionResult } from './types.js';

export class Vec2 {
  static zero(): Vector2 {
    return { x: 0, y: 0 };
  }

  static create(x: number, y: number): Vector2 {
    return { x, y };
  }

  static copy(v: Vector2): Vector2 {
    return { x: v.x, y: v.y };
  }

  static add(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static multiply(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  static divide(v: Vector2, scalar: number): Vector2 {
    return { x: v.x / scalar, y: v.y / scalar };
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  static cross(a: Vector2, b: Vector2): number {
    return a.x * b.y - a.y * b.x;
  }

  static length(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static lengthSquared(v: Vector2): number {
    return v.x * v.x + v.y * v.y;
  }

  static distance(a: Vector2, b: Vector2): number {
    return Vec2.length(Vec2.subtract(a, b));
  }

  static distanceSquared(a: Vector2, b: Vector2): number {
    return Vec2.lengthSquared(Vec2.subtract(a, b));
  }

  static normalize(v: Vector2): Vector2 {
    const len = Vec2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return Vec2.divide(v, len);
  }

  static rotate(v: Vector2, angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  }

  static angle(v: Vector2): number {
    return Math.atan2(v.y, v.x);
  }

  static fromAngle(angle: number, magnitude = 1): Vector2 {
    return {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude,
    };
  }

  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  static clamp(v: Vector2, min: Vector2, max: Vector2): Vector2 {
    return {
      x: Math.max(min.x, Math.min(max.x, v.x)),
      y: Math.max(min.y, Math.min(max.y, v.y)),
    };
  }

  static limitLength(v: Vector2, maxLength: number): Vector2 {
    const lenSq = Vec2.lengthSquared(v);
    if (lenSq > maxLength * maxLength) {
      return Vec2.multiply(Vec2.normalize(v), maxLength);
    }
    return v;
  }
}

export function wrapPosition(position: Vector2, worldWidth: number, worldHeight: number): Vector2 {
  return {
    x: ((position.x % worldWidth) + worldWidth) % worldWidth,
    y: ((position.y % worldHeight) + worldHeight) % worldHeight,
  };
}

export function wrapAngle(angle: number): number {
  return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function lerpAngle(from: number, to: number, t: number): number {
  const diff = wrapAngle(to - from);
  const adjustedDiff = diff > Math.PI ? diff - 2 * Math.PI : diff;
  return wrapAngle(from + adjustedDiff * t);
}

export function circleCircleCollision(
  pos1: Vector2,
  radius1: number,
  pos2: Vector2,
  radius2: number
): CollisionResult {
  const delta = Vec2.subtract(pos2, pos1);
  const distance = Vec2.length(delta);
  const minDistance = radius1 + radius2;

  if (distance < minDistance && distance > 0) {
    const depth = minDistance - distance;
    const normal = Vec2.normalize(delta);
    return { collided: true, depth, normal };
  }

  return { collided: false };
}

export function pointInCircle(point: Vector2, center: Vector2, radius: number): boolean {
  return Vec2.distanceSquared(point, center) <= radius * radius;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

export function randomVector2(minMagnitude: number, maxMagnitude: number): Vector2 {
  const angle = randomFloat(0, 2 * Math.PI);
  const magnitude = randomFloat(minMagnitude, maxMagnitude);
  return Vec2.fromAngle(angle, magnitude);
}

export function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(a: number, b: number, t: number): number {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}