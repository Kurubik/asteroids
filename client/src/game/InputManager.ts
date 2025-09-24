import { InputState, PLAYER_CONFIG } from '@shared/index.js';

export class InputManager {
  private keys = new Set<string>();
  private inputState: InputState = {
    thrust: false,
    rotate: 0,
    brake: false,
    shoot: false,
  };
  
  private lastInputState: InputState = { ...this.inputState };
  private shootPressed = false;
  private keyFireInterval: number | null = null;
  public onInputChange?: (inputState: InputState) => void;

  // Touch/virtual control state
  private touchThrust = false;
  private touchBrake = false;
  private touchRotate: -1 | 0 | 1 = 0;

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
    
    // Handle shooting as immediate action
    if (event.code === 'Space') {
      this.shootPressed = true;
      if (this.keyFireInterval === null) {
        this.keyFireInterval = window.setInterval(() => {
          this.shootPressed = true;
          this.updateInputState();
        }, PLAYER_CONFIG.FIRE_RATE);
      }
    }
    
    this.keys.add(event.code);
    this.updateInputState();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
    if (event.code === 'Space') {
      if (this.keyFireInterval !== null) {
        clearInterval(this.keyFireInterval);
        this.keyFireInterval = null;
      }
    }
    this.updateInputState();
  }

  private releaseAllKeys(): void {
    this.keys.clear();
    this.updateInputState();
  }

  private updateInputState(): void {
    // Reset input state
    this.inputState = {
      thrust: this.touchThrust,
      rotate: this.touchRotate,
      brake: this.touchBrake,
      shoot: false,
    };

    // Process current keys
    for (const key of this.keys) {
      const mapping = this.keyMappings[key as keyof typeof this.keyMappings];
      
      switch (mapping) {
        case 'thrust':
          this.inputState.thrust = true || this.inputState.thrust;
          break;
        case 'brake':
          this.inputState.brake = true || this.inputState.brake;
          break;
        case 'rotateLeft':
          this.inputState.rotate = this.inputState.rotate !== 0 ? this.inputState.rotate : -1;
          break;
        case 'rotateRight':
          this.inputState.rotate = this.inputState.rotate !== 0 ? this.inputState.rotate : 1;
          break;
        case 'shoot':
          // Use shootPressed flag for immediate action
          this.inputState.shoot = this.shootPressed;
          break;
      }
    }

    // Check if input state changed or if shooting was triggered
    if (this.hasInputChanged() || this.shootPressed) {
      this.lastInputState = { ...this.inputState };
      this.onInputChange?.(this.inputState);
      // Reset shoot flag after sending
      this.shootPressed = false;
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

  // Mobile/touch controls API
  setTouchThrust(active: boolean) {
    this.touchThrust = active;
    this.updateInputState();
  }

  setTouchBrake(active: boolean) {
    this.touchBrake = active;
    this.updateInputState();
  }

  setTouchRotate(direction: -1 | 0 | 1) {
    this.touchRotate = direction;
    this.updateInputState();
  }

  triggerShoot() {
    this.shootPressed = true;
    this.updateInputState();
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
