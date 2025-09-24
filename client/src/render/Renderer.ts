import * as THREE from 'three';
import { GameState, RENDER_CONFIG } from '@shared/index.js';
import { ShipRenderer } from './entities/ShipRenderer.js';
import { AsteroidRenderer } from './entities/AsteroidRenderer.js';
import { BulletRenderer } from './entities/BulletRenderer.js';
import { ParticleRenderer } from './entities/ParticleRenderer.js';
import { Camera } from './Camera.js';

export class Renderer {
  private scene: THREE.Scene;
  private camera: Camera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private shipRenderer: ShipRenderer;
  private asteroidRenderer: AsteroidRenderer;
  private bulletRenderer: BulletRenderer;
  private particleRenderer: ParticleRenderer;

  private width = 0;
  private height = 0;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new Camera();
    
    // Initialize WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(RENDER_CONFIG.COLORS.BACKGROUND);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Initialize entity renderers
    this.shipRenderer = new ShipRenderer(this.scene);
    this.asteroidRenderer = new AsteroidRenderer(this.scene);
    this.bulletRenderer = new BulletRenderer(this.scene);
    this.particleRenderer = new ParticleRenderer(this.scene);
  }

  async init(): Promise<void> {
    console.log('Initializing renderer...');

    // Setup scene
    this.scene.background = new THREE.Color(RENDER_CONFIG.COLORS.BACKGROUND);

    // Add camera to scene
    this.scene.add(this.camera.getCamera());

    // Initialize entity renderers
    await this.shipRenderer.init();
    await this.asteroidRenderer.init();
    await this.bulletRenderer.init();
    await this.particleRenderer.init();

    console.log('Renderer initialized');
  }

  render(gameState: GameState | null, deltaTime: number): void {
    if (!gameState) return;

    // Update camera to follow local player
    this.updateCamera(gameState);

    // Clear previous frame
    this.renderer.clear();

    // Update and render entities
    this.shipRenderer.update(gameState.players, deltaTime);
    this.asteroidRenderer.update(gameState.asteroids, deltaTime);
    this.bulletRenderer.update(gameState.bullets, deltaTime);
    this.particleRenderer.update(gameState.particles, deltaTime);

    // Render the scene
    this.renderer.render(this.scene, this.camera.getCamera());
  }

  private updateCamera(gameState: GameState): void {
    // Find local player (this would be set by the Game class)
    const localPlayerId = (window as any).game?.getPlayerId();
    if (!localPlayerId) return;

    const localPlayer = gameState.players.find(p => p.id === localPlayerId);
    if (!localPlayer || !localPlayer.isAlive) return;

    // Update camera to follow player
    this.camera.followTarget(localPlayer.transform.position);
    this.camera.update();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.pixelRatio = window.devicePixelRatio;

    // Update renderer size
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.pixelRatio);

    // Update camera aspect ratio
    this.camera.updateAspectRatio(width / height);

    console.log(`Renderer resized to ${width}x${height} (pixel ratio: ${this.pixelRatio})`);
  }

  destroy(): void {
    console.log('Destroying renderer...');

    // Dispose of entity renderers
    this.shipRenderer.dispose();
    this.asteroidRenderer.dispose();
    this.bulletRenderer.dispose();
    this.particleRenderer.dispose();

    // Dispose of renderer
    this.renderer.dispose();

    // Clear scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      
      if ('geometry' in child) {
        (child as any).geometry?.dispose();
      }
      if ('material' in child) {
        const material = (child as any).material;
        if (Array.isArray(material)) {
          material.forEach(mat => mat.dispose());
        } else {
          material?.dispose();
        }
      }
    }
  }

  getDebugInfo() {
    return {
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      points: this.renderer.info.render.points,
      lines: this.renderer.info.render.lines,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      camera: this.camera.getDebugInfo(),
    };
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.Camera {
    return this.camera.getCamera();
  }
}
