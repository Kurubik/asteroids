import * as THREE from 'three';
import { Player, RENDER_CONFIG } from '@shared/index.js';

export class ShipRenderer {
  private scene: THREE.Scene;
  private shipMeshes = new Map<string, THREE.Line>();
  private shipGeometry!: THREE.BufferGeometry;
  private shipMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createShipGeometry();
    this.shipMaterial = new THREE.LineBasicMaterial({
      color: RENDER_CONFIG.COLORS.PLAYER,
      linewidth: RENDER_CONFIG.LINE_WIDTH,
    });
  }

  async init(): Promise<void> {
    console.log('ShipRenderer initialized');
  }

  private createShipGeometry(): void {
    const points = [
      new THREE.Vector3(0, 10, 0),   // tip
      new THREE.Vector3(-6, -8, 0),  // left
      new THREE.Vector3(0, -4, 0),   // center back
      new THREE.Vector3(6, -8, 0),   // right
      new THREE.Vector3(0, 10, 0),   // back to tip
    ];

    this.shipGeometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  update(players: Player[], _deltaTime: number): void {
    // Remove meshes for players that no longer exist
    for (const [playerId, mesh] of this.shipMeshes) {
      if (!players.find(p => p.id === playerId)) {
        this.scene.remove(mesh);
        this.shipMeshes.delete(playerId);
      }
    }

    // Update existing players and create new ones
    for (const player of players) {
      if (!player.isAlive) continue;

      const mesh = this.shipMeshes.get(player.id) ?? (() => {
        const m = new THREE.Line(this.shipGeometry, this.shipMaterial);
        this.shipMeshes.set(player.id, m);
        this.scene.add(m);
        return m;
      })();

      // Update position and rotation
      mesh.position.set(
        player.transform.position.x,
        player.transform.position.y,
        0
      );
      mesh.rotation.z = -player.transform.rotation + Math.PI / 2;

      // Handle invulnerability blinking
      if (Date.now() < player.invulnerableUntil) {
        mesh.visible = Math.sin(Date.now() * 0.02) > 0;
      } else {
        mesh.visible = true;
      }
    }
  }

  dispose(): void {
    this.shipGeometry?.dispose();
    this.shipMaterial?.dispose();
    
    for (const [_, mesh] of this.shipMeshes) {
      this.scene.remove(mesh);
    }
    this.shipMeshes.clear();
  }
}
