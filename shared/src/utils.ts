import { Vector2 } from './types.js';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  pop(): T | undefined {
    if (this.size === 0) return undefined;
    
    this.tail = (this.tail - 1 + this.capacity) % this.capacity;
    const item = this.buffer[this.tail];
    this.size--;
    return item;
  }

  peek(): T | undefined {
    if (this.size === 0) return undefined;
    return this.buffer[(this.tail - 1 + this.capacity) % this.capacity];
  }

  get(index: number): T | undefined {
    if (index < 0 || index >= this.size) return undefined;
    return this.buffer[(this.head + index) % this.capacity];
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }

  get length(): number {
    return this.size;
  }

  get isFull(): boolean {
    return this.size === this.capacity;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }
}

export class SpatialHash {
  private cells = new Map<string, Set<string>>();
  private objects = new Map<string, { position: Vector2; radius: number; cellKeys: string[] }>();

  constructor(private cellSize: number) {}

  private getCellKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  private getCellsForObject(position: Vector2, radius: number): string[] {
    const keys: string[] = [];
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        keys.push(`${x},${y}`);
      }
    }
    return keys;
  }

  insert(id: string, position: Vector2, radius: number): void {
    this.remove(id);

    const cellKeys = this.getCellsForObject(position, radius);
    this.objects.set(id, { position, radius, cellKeys });

    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key)!.add(id);
    }
  }

  remove(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    for (const key of obj.cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.objects.delete(id);
  }

  query(position: Vector2, radius: number): string[] {
    const cellKeys = this.getCellsForObject(position, radius);
    const candidates = new Set<string>();

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const id of cell) {
          candidates.add(id);
        }
      }
    }

    return Array.from(candidates);
  }

  clear(): void {
    this.cells.clear();
    this.objects.clear();
  }

  getObjectCount(): number {
    return this.objects.size;
  }

  getCellCount(): number {
    return this.cells.size;
  }
}

export function validatePlayerName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Name is required';
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters';
  }
  
  if (trimmed.length > 20) {
    return 'Name must be less than 20 characters';
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Name can only contain letters, numbers, underscores, and hyphens';
  }
  
  return null;
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}