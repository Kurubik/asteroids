import { AUDIO_CONFIG } from '@shared/index.js';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sounds = new Map<string, AudioBuffer>();
  private playingSounds = new Set<AudioBufferSourceNode>();

  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = AUDIO_CONFIG.MASTER_VOLUME;
      this.gainNode.connect(this.audioContext.destination);

      // Generate procedural sounds
      await this.generateSounds();

      console.log('AudioManager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  private async generateSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Generate thrust sound
    this.sounds.set('thrust', this.generateThrustSound());
    
    // Generate laser sound
    this.sounds.set('laser', this.generateLaserSound());
    
    // Generate explosion sound
    this.sounds.set('explosion', this.generateExplosionSound());
    
    // Generate hit sound
    this.sounds.set('hit', this.generateHitSound());
  }

  private generateThrustSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate brown noise for thrust
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
      
      // Apply envelope
      const envelope = Math.exp(-i / length * 2);
      data[i] *= envelope;
    }

    return buffer;
  }

  private generateLaserSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate laser sweep
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const frequency = 800 - t * 400; // Sweep from 800Hz to 400Hz
      const sample = Math.sin(2 * Math.PI * frequency * t);
      
      // Apply envelope
      const envelope = Math.exp(-t * 8);
      data[i] = sample * envelope * 0.2;
    }

    return buffer;
  }

  private generateExplosionSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate explosion noise
    for (let i = 0; i < length; i++) {
      const t = i / length;
      
      // Mix white and brown noise
      const whiteNoise = (Math.random() * 2 - 1);
      const brownNoise = (Math.random() * 2 - 1) * 0.5;
      let sample = whiteNoise + brownNoise;
      
      // Apply low-pass filter effect
      if (i > 0) {
        sample = data[i - 1] * 0.99 + sample * 0.01;
      }
      
      // Apply envelope
      const envelope = Math.exp(-t * 3);
      data[i] = sample * envelope * 0.4;
    }

    return buffer;
  }

  private generateHitSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.05;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate metallic hit sound
    for (let i = 0; i < length; i++) {
      const t = i / length;
      
      // Mix multiple frequencies
      const freq1 = Math.sin(2 * Math.PI * 1200 * t);
      const freq2 = Math.sin(2 * Math.PI * 800 * t);
      const noise = (Math.random() * 2 - 1) * 0.3;
      
      let sample = freq1 * 0.4 + freq2 * 0.3 + noise;
      
      // Apply sharp envelope
      const envelope = Math.exp(-t * 20);
      data[i] = sample * envelope * 0.3;
    }

    return buffer;
  }

  playSound(name: string, volume: number = 1, pitch: number = 1): void {
    if (!this.audioContext || !this.gainNode) return;

    const buffer = this.sounds.get(name);
    if (!buffer) {
      console.warn(`Sound '${name}' not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const soundGain = this.audioContext.createGain();

      source.buffer = buffer;
      source.playbackRate.value = pitch;
      
      soundGain.gain.value = volume * AUDIO_CONFIG.SFX_VOLUME;

      source.connect(soundGain);
      soundGain.connect(this.gainNode);

      // Clean up when sound finishes
      source.onended = () => {
        this.playingSounds.delete(source);
      };

      this.playingSounds.add(source);
      source.start(0);

    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  playThrust(): void {
    this.playSound('thrust', 0.3, 1 + Math.random() * 0.2);
  }

  playLaser(): void {
    this.playSound('laser', 0.4, 0.8 + Math.random() * 0.4);
  }

  playExplosion(): void {
    this.playSound('explosion', 0.8, 0.9 + Math.random() * 0.2);
  }

  playHit(): void {
    this.playSound('hit', 0.5, 0.8 + Math.random() * 0.4);
  }

  setMasterVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  update(_deltaTime: number): void {
    // Resume audio context if suspended (needed for some browsers)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    // Stop all playing sounds
    for (const source of this.playingSounds) {
      try {
        source.stop();
      } catch (error) {
        // Sound may have already stopped
      }
    }
    this.playingSounds.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.sounds.clear();
    console.log('AudioManager destroyed');
  }

  getDebugInfo() {
    return {
      isInitialized: this.audioContext !== null,
      audioContextState: this.audioContext?.state,
      playingSoundsCount: this.playingSounds.size,
      loadedSoundsCount: this.sounds.size,
    };
  }
}