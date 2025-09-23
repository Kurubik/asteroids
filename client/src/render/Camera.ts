import * as THREE from 'three';
import { Vector2, GAME_CONFIG } from '@shared/index.js';
import { Vec2 } from '@shared/index.js';

export class Camera {
  private camera: THREE.OrthographicCamera;
  private targetPosition = Vec2.zero();
  private currentPosition = Vec2.zero();
  private smoothing = 0.1;
  private zoom = 1;
  private targetZoom = 1;

  constructor() {
    // Initialize orthographic camera for 2D gameplay
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = GAME_CONFIG.CAMERA_HEIGHT;
    
    this.camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,  // left
      (viewSize * aspect) / 2,   // right
      viewSize / 2,              // top
      -viewSize / 2,             // bottom
      -1000,                     // near
      1000                       // far
    );

    this.camera.position.z = 10;
  }

  followTarget(position: Vector2): void {
    this.targetPosition = { ...position };
  }

  setZoom(zoom: number): void {
    this.targetZoom = Math.max(0.5, Math.min(3, zoom));
  }

  update(): void {
    // Smooth camera movement
    this.currentPosition = Vec2.lerp(
      this.currentPosition,
      this.targetPosition,
      this.smoothing
    );

    // Smooth zoom
    this.zoom = THREE.MathUtils.lerp(this.zoom, this.targetZoom, this.smoothing * 0.5);

    // Apply world wrapping for camera position
    this.currentPosition = this.wrapCameraPosition(this.currentPosition);

    // Update camera position
    this.camera.position.x = this.currentPosition.x;
    this.camera.position.y = this.currentPosition.y;

    // Apply zoom by adjusting camera bounds
    const aspect = this.camera.right / this.camera.top;
    const viewHeight = GAME_CONFIG.CAMERA_HEIGHT / this.zoom;
    const viewWidth = viewHeight * aspect;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;

    this.camera.updateProjectionMatrix();
  }

  private wrapCameraPosition(position: Vector2): Vector2 {
    // Keep camera within world bounds with some padding
    const padding = GAME_CONFIG.CAMERA_WIDTH * 0.4;
    
    let x = position.x;
    let y = position.y;

    // Wrap X coordinate
    if (x < -padding) {
      x = GAME_CONFIG.WORLD_WIDTH - padding;
    } else if (x > GAME_CONFIG.WORLD_WIDTH + padding) {
      x = -padding;
    }

    // Wrap Y coordinate  
    if (y < -padding) {
      y = GAME_CONFIG.WORLD_HEIGHT - padding;
    } else if (y > GAME_CONFIG.WORLD_HEIGHT + padding) {
      y = -padding;
    }

    return { x, y };
  }

  updateAspectRatio(aspect: number): void {
    const viewHeight = GAME_CONFIG.CAMERA_HEIGHT / this.zoom;
    const viewWidth = viewHeight * aspect;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;

    this.camera.updateProjectionMatrix();
  }

  worldToScreen(worldPos: Vector2, screenWidth: number, screenHeight: number): Vector2 {
    const vector = new THREE.Vector3(worldPos.x, worldPos.y, 0);
    vector.project(this.camera);

    return {
      x: (vector.x * 0.5 + 0.5) * screenWidth,
      y: (vector.y * -0.5 + 0.5) * screenHeight,
    };
  }

  screenToWorld(screenPos: Vector2, screenWidth: number, screenHeight: number): Vector2 {
    const x = (screenPos.x / screenWidth) * 2 - 1;
    const y = -(screenPos.y / screenHeight) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0);
    vector.unproject(this.camera);

    return {
      x: vector.x,
      y: vector.y,
    };
  }

  getViewBounds(): { min: Vector2; max: Vector2; size: Vector2 } {
    const viewHeight = GAME_CONFIG.CAMERA_HEIGHT / this.zoom;
    const viewWidth = viewHeight * (this.camera.right / this.camera.top);

    const min: Vector2 = {
      x: this.currentPosition.x - viewWidth / 2,
      y: this.currentPosition.y - viewHeight / 2,
    };

    const max: Vector2 = {
      x: this.currentPosition.x + viewWidth / 2,
      y: this.currentPosition.y + viewHeight / 2,
    };

    const size: Vector2 = {
      x: viewWidth,
      y: viewHeight,
    };

    return { min, max, size };
  }

  isInView(position: Vector2, radius: number = 0): boolean {
    const bounds = this.getViewBounds();
    
    return (
      position.x + radius >= bounds.min.x &&
      position.x - radius <= bounds.max.x &&
      position.y + radius >= bounds.min.y &&
      position.y - radius <= bounds.max.y
    );
  }

  getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }

  getPosition(): Vector2 {
    return { ...this.currentPosition };
  }

  getTargetPosition(): Vector2 {
    return { ...this.targetPosition };
  }

  getZoom(): number {
    return this.zoom;
  }

  shake(intensity: number, duration: number): void {
    // Simple camera shake implementation
    const originalPosition = { ...this.targetPosition };
    const shakeAmount = intensity;
    let elapsed = 0;

    const shake = () => {
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const currentIntensity = shakeAmount * (1 - progress);

        this.currentPosition = {
          x: originalPosition.x + (Math.random() - 0.5) * currentIntensity,
          y: originalPosition.y + (Math.random() - 0.5) * currentIntensity,
        };

        elapsed += 16; // ~60fps
        requestAnimationFrame(shake);
      } else {
        this.targetPosition = originalPosition;
      }
    };

    shake();
  }

  getDebugInfo() {
    return {
      position: this.currentPosition,
      targetPosition: this.targetPosition,
      zoom: this.zoom,
      targetZoom: this.targetZoom,
      viewBounds: this.getViewBounds(),
    };
  }
}