import * as THREE from 'three';
import { Bullet, RENDER_CONFIG } from '@shared/index.js';

export class BulletRenderer {
  private scene: THREE.Scene;
  private bulletMeshes = new Map<string, THREE.Mesh>();
  private geometry!: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private maxBullets = 100;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBulletGeometry();
    this.material = new THREE.PointsMaterial({
      color: RENDER_CONFIG.COLORS.BULLET,
      size: 3,
      sizeAttenuation: false,
    });
  }

  async init(): Promise<void> {
    // Create instanced mesh for better performance with many bullets
    const geometry = new THREE.CircleGeometry(1, 4);
    const material = new THREE.MeshBasicMaterial({
      color: RENDER_CONFIG.COLORS.BULLET,
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxBullets);
    this.instancedMesh.count = 0;
    this.scene.add(this.instancedMesh);

    console.log('BulletRenderer initialized');
  }

  private createBulletGeometry(): void {
    const points = [new THREE.Vector3(0, 0, 0)];
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  update(bullets: Bullet[], _deltaTime: number): void {
    if (!this.instancedMesh) return;

    const matrix = new THREE.Matrix4();
    let instanceIndex = 0;

    for (const bullet of bullets) {
      if (instanceIndex >= this.maxBullets) break;

      // Set bullet transform
      matrix.makeTranslation(
        bullet.transform.position.x,
        bullet.transform.position.y,
        0
      );

      this.instancedMesh.setMatrixAt(instanceIndex, matrix);
      instanceIndex++;
    }

    // Update instance count
    this.instancedMesh.count = instanceIndex;
    
    if (instanceIndex > 0) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach(mat => mat.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
    }
    
    for (const [_, mesh] of this.bulletMeshes) {
      this.scene.remove(mesh);
    }
    this.bulletMeshes.clear();
  }
}
