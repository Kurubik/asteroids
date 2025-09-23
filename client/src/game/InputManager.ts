import { InputState } from '@shared/index.js';

export class InputManager {
  private keys = new Set<string>();
  private inputState: InputState = {
    thrust: false,
    rotate: 0,
    brake: false,
    shoot: false,
  };
  
  private lastInputState: InputState = { ...this.inputState };
  public onInputChange?: (inputState: InputState) => void;

  private keyMappings = {
    // Movement
    KeyW: 'thrust',
    ArrowUp: 'thrust',
    KeyS: 'brake',
    ArrowDown: 'brake',
    KeyA: 'rotateLeft',
    ArrowLeft: 'rotateLeft',
    KeyD: 'rotateRight',
    ArrowRight: 'rotateRight',
    
    // Actions
    Space: 'shoot',
  };

  init(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Handle focus loss (release all keys)
    window.addEventListener('blur', this.releaseAllKeys.bind(this));
    
    console.log('InputManager initialized');
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    
    // Prevent default behavior for game keys
    if (this.keyMappings[event.code as keyof typeof this.keyMappings]) {
      event.preventDefault();
    }
    
    this.keys.add(event.code);
    this.updateInputState();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
    this.updateInputState();
  }

  private releaseAllKeys(): void {
    this.keys.clear();
    this.updateInputState();
  }

  private updateInputState(): void {
    // Reset input state
    this.inputState = {
      thrust: false,
      rotate: 0,
      brake: false,
      shoot: false,
    };

    // Process current keys
    for (const key of this.keys) {
      const mapping = this.keyMappings[key as keyof typeof this.keyMappings];
      
      switch (mapping) {
        case 'thrust':
          this.inputState.thrust = true;
          break;
        case 'brake':
          this.inputState.brake = true;
          break;
        case 'rotateLeft':
          this.inputState.rotate = -1;
          break;
        case 'rotateRight':
          this.inputState.rotate = 1;
          break;
        case 'shoot':
          this.inputState.shoot = true;
          break;
      }
    }

    // Check if input state changed
    if (this.hasInputChanged()) {
      this.lastInputState = { ...this.inputState };
      this.onInputChange?.(this.inputState);
    }
  }

  private hasInputChanged(): boolean {
    return (
      this.inputState.thrust !== this.lastInputState.thrust ||
      this.inputState.rotate !== this.lastInputState.rotate ||
      this.inputState.brake !== this.lastInputState.brake ||
      this.inputState.shoot !== this.lastInputState.shoot
    );
  }

  update(): void {
    // Called every frame to handle continuous input
    // Currently, most input is handled via events, but this could be used
    // for mouse input or gamepad support in the future
  }

  getCurrentInputState(): InputState {
    return { ...this.inputState };
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    window.removeEventListener('blur', this.releaseAllKeys.bind(this));
    
    this.keys.clear();
    console.log('InputManager destroyed');
  }

  // Debug methods
  getActiveKeys(): string[] {
    return Array.from(this.keys);
  }

  getDebugInfo() {
    return {
      activeKeys: this.getActiveKeys(),
      inputState: this.inputState,
      hasInput: this.keys.size > 0,
    };
  }
}