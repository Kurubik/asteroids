import * as THREE from 'three';
import { Particle, ParticleType, RENDER_CONFIG } from '@shared/index.js';

export class ParticleRenderer {
  private scene: THREE.Scene;
  private particleSystems = new Map<ParticleType, THREE.Points>();
  private maxParticles = 1000;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async init(): Promise<void> {
    this.createParticleSystem(ParticleType.THRUST);
    this.createParticleSystem(ParticleType.EXPLOSION);
    this.createParticleSystem(ParticleType.BULLET_HIT);

    console.log('ParticleRenderer initialized');
  }

  private createParticleSystem(type: ParticleType): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const alphas = new Float32Array(this.maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      transparent: true,
      vertexColors: true,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.frustumCulled = false;
    
    this.particleSystems.set(type, particleSystem);
    this.scene.add(particleSystem);
  }

  update(particles: Particle[], _deltaTime: number): void {
    // Group particles by type
    const particlesByType = new Map<ParticleType, Particle[]>();
    
    for (const particle of particles) {
      if (!particlesByType.has(particle.type)) {
        particlesByType.set(particle.type, []);
      }
      particlesByType.get(particle.type)!.push(particle);
    }

    // Update each particle system
    for (const [type, system] of this.particleSystems) {
      const typeParticles = particlesByType.get(type) || [];
      this.updateParticleSystem(system, typeParticles, type);
    }
  }

  private updateParticleSystem(
    system: THREE.Points,
    particles: Particle[],
    type: ParticleType
  ): void {
    const geometry = system.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const alphas = geometry.attributes.alpha.array as Float32Array;

    let particleIndex = 0;

    for (const particle of particles) {
      if (particleIndex >= this.maxParticles) break;

      const lifetimeRatio = particle.lifetime / particle.maxLifetime;
      const baseIndex = particleIndex * 3;

      // Position
      positions[baseIndex] = particle.transform.position.x;
      positions[baseIndex + 1] = particle.transform.position.y;
      positions[baseIndex + 2] = 0;

      // Color based on particle type
      const color = this.getParticleColor(type, lifetimeRatio);
      colors[baseIndex] = color.r;
      colors[baseIndex + 1] = color.g;
      colors[baseIndex + 2] = color.b;

      // Size and alpha based on lifetime
      sizes[particleIndex] = this.getParticleSize(type, lifetimeRatio);
      alphas[particleIndex] = lifetimeRatio;

      particleIndex++;
    }

    // Hide unused particles
    for (let i = particleIndex; i < this.maxParticles; i++) {
      const baseIndex = i * 3;
      positions[baseIndex] = 0;
      positions[baseIndex + 1] = 0;
      positions[baseIndex + 2] = 0;
      alphas[i] = 0;
    }

    // Mark attributes for update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
  }

  private getParticleColor(type: ParticleType, lifetimeRatio: number): { r: number; g: number; b: number } {
    const color = new THREE.Color();
    
    switch (type) {
      case ParticleType.THRUST:
        color.setHex(RENDER_CONFIG.COLORS.THRUST);
        break;
      case ParticleType.EXPLOSION:
        // Fade from white to red
        color.lerpColors(
          new THREE.Color(0xffffff),
          new THREE.Color(RENDER_CONFIG.COLORS.EXPLOSION),
          1 - lifetimeRatio
        );
        break;
      case ParticleType.BULLET_HIT:
        color.setHex(RENDER_CONFIG.COLORS.BULLET);
        break;
    }

    return color;
  }

  private getParticleSize(type: ParticleType, lifetimeRatio: number): number {
    switch (type) {
      case ParticleType.THRUST:
        return 1 + lifetimeRatio * 2;
      case ParticleType.EXPLOSION:
        return 2 + (1 - lifetimeRatio) * 3;
      case ParticleType.BULLET_HIT:
        return 1.5;
      default:
        return 1;
    }
  }

  dispose(): void {
    for (const [_, system] of this.particleSystems) {
      this.scene.remove(system);
      system.geometry.dispose();
      if (Array.isArray(system.material)) {
        system.material.forEach(mat => mat.dispose());
      } else {
        system.material.dispose();
      }
    }
    this.particleSystems.clear();
  }
}
