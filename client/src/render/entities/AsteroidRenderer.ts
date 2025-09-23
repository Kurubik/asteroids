import * as THREE from 'three';
import { Asteroid, AsteroidSize, RENDER_CONFIG } from '@shared/index.js';

export class AsteroidRenderer {
  private scene: THREE.Scene;
  private asteroidMeshes = new Map<string, THREE.Mesh>();
  private geometries = new Map<AsteroidSize, THREE.BufferGeometry>();
  private material: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createAsteroidGeometries();
    this.material = new THREE.LineBasicMaterial({
      color: RENDER_CONFIG.COLORS.ASTEROID,
      linewidth: RENDER_CONFIG.LINE_WIDTH,
    });
  }

  async init(): Promise<void> {
    console.log('AsteroidRenderer initialized');
  }

  private createAsteroidGeometries(): void {
    // Create different asteroid shapes for each size
    this.createAsteroidGeometry(AsteroidSize.LARGE, 40, 8);
    this.createAsteroidGeometry(AsteroidSize.MEDIUM, 20, 6);
    this.createAsteroidGeometry(AsteroidSize.SMALL, 10, 5);
  }

  private createAsteroidGeometry(size: AsteroidSize, radius: number, segments: number): void {
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Add some randomness to make it look more asteroid-like
      const r = radius * (0.8 + Math.random() * 0.4);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      points.push(new THREE.Vector3(x, y, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.geometries.set(size, geometry);
  }

  update(asteroids: Asteroid[], deltaTime: number): void {
    // Remove meshes for asteroids that no longer exist
    for (const [asteroidId, mesh] of this.asteroidMeshes) {
      if (!asteroids.find(a => a.id === asteroidId)) {
        this.scene.remove(mesh);
        this.asteroidMeshes.delete(asteroidId);
      }
    }

    // Update existing asteroids and create new ones
    for (const asteroid of asteroids) {
      let mesh = this.asteroidMeshes.get(asteroid.id);
      
      if (!mesh) {
        // Create new asteroid mesh
        const geometry = this.geometries.get(asteroid.size);
        if (geometry) {
          mesh = new THREE.Line(geometry, this.material);
          this.asteroidMeshes.set(asteroid.id, mesh);
          this.scene.add(mesh);
        }
      }

      if (mesh) {
        // Update position and rotation
        mesh.position.set(
          asteroid.transform.position.x,
          asteroid.transform.position.y,
          0
        );
        mesh.rotation.z = asteroid.transform.rotation;
      }
    }
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    this.geometries.clear();
    
    this.material?.dispose();
    
    for (const [_, mesh] of this.asteroidMeshes) {
      this.scene.remove(mesh);
    }
    this.asteroidMeshes.clear();
  }
}