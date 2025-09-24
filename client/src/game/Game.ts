import { Renderer } from '../render/Renderer.js';
import { NetworkManager } from '../net/NetworkManager.js';
import { InputManager } from './InputManager.js';
import { GameStateManager } from './GameStateManager.js';
import { UIManager } from '../ui/UIManager.js';
import { MobileControls } from '../ui/MobileControls.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ClientPrediction } from './ClientPrediction.js';
import { 
  GameState, 
  InputState 
} from '@shared/index.js';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private network: NetworkManager;
  private input: InputManager;
  private gameState: GameStateManager;
  private ui: UIManager;
  private audio: AudioManager;
  private prediction: ClientPrediction;
  private mobileControls?: MobileControls;

  private isRunning = false;
  private isPaused = false;
  private lastTime = 0;
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;

  private playerId?: string;
  private roomId?: string;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Game canvas not found');
    }

    // Initialize managers
    this.renderer = new Renderer(this.canvas);
    this.network = new NetworkManager();
    this.input = new InputManager();
    this.gameState = new GameStateManager();
    this.ui = new UIManager();
    this.audio = new AudioManager();
    this.prediction = new ClientPrediction();

    this.setupEventHandlers();
  }

  async init(): Promise<void> {
    console.log('Initializing Asteroid Storm Online...');

    try {
      // Initialize all managers
      await this.renderer.init();
      await this.audio.init();
      this.ui.init();
      this.input.init();
      // Initialize mobile controls if on touch device
      this.mobileControls = new MobileControls(this.input);
      this.mobileControls.init();

      // Setup network event handlers
      this.setupNetworkHandlers();

      // Resize to fit window
      this.resize();

      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.ui.showError('Failed to initialize game. Please refresh the page.');
    }
  }

  private setupEventHandlers(): void {
    // Join game button
    this.ui.onJoinGame = (playerName: string, roomCode?: string) => {
      this.joinGame(playerName, roomCode);
    };

    // Leave game
    this.ui.onLeaveGame = () => {
      this.leaveGame();
    };

    // Input events
    this.input.onInputChange = (inputState: InputState) => {
      if (this.playerId && this.isRunning) {
        // Apply client-side prediction
        this.prediction.applyInput(this.playerId, inputState);
        
        // Send input to server
        this.network.sendInput(inputState);
      }
    };
  }

  private setupNetworkHandlers(): void {
    this.network.onConnect = () => {
      this.ui.setConnectionStatus('connected');
    };

    this.network.onDisconnect = () => {
      this.ui.setConnectionStatus('disconnected');
      this.ui.showJoinMenu();
      this.stop();
    };

    this.network.onReconnecting = () => {
      this.ui.setConnectionStatus('connecting');
    };

    this.network.onWelcome = (data) => {
      this.playerId = data.playerId;
      this.roomId = data.roomId;
      this.gameState.updateState(data.gameState);
      this.prediction.setPlayerId(data.playerId);
      
      // Hide join menu and show game UI
      this.ui.hideJoinMenu();
      this.ui.showGameUI();
      
      // Start game loop
      this.start();
      
      console.log(`Joined room ${data.roomId} as player ${data.playerId}`);
    };

    this.network.onSnapshot = (snapshot) => {
      this.gameState.applySnapshot(snapshot);
      this.prediction.reconcile(snapshot);
      
      // Update UI
      const player = this.gameState.getPlayer(this.playerId!);
      if (player) {
        this.ui.updateHUD({
          score: player.score,
          lives: player.lives,
          health: player.health,
          ping: this.network.getPing(),
        });
      }

      this.ui.updatePlayerList(this.gameState.getAllPlayers());
    };

    this.network.onPlayerJoined = (data) => {
      console.log(`Player ${data.player.name} joined`);
      // Could show notification
    };

    this.network.onPlayerLeft = (data) => {
      console.log(`Player ${data.playerName} left`);
      // Could show notification
    };

    this.network.onError = (error) => {
      console.error('Network error:', error);
      this.ui.showError(error);
    };
  }

  private async joinGame(playerName: string, roomCode?: string): Promise<void> {
    try {
      this.ui.setConnectionStatus('connecting');
      await this.network.connect(playerName, roomCode);
    } catch (error) {
      console.error('Failed to join game:', error);
      this.ui.setConnectionStatus('disconnected');
      this.ui.showError('Failed to connect to server. Please try again.');
    }
  }

  private leaveGame(): void {
    this.network.disconnect();
    this.stop();
    this.ui.showJoinMenu();
    this.playerId = undefined;
    this.roomId = undefined;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    
    console.log('Game loop started');
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    console.log('Game loop stopped');
  }

  pause(): void {
    this.isPaused = true;
    console.log('Game paused');
  }

  resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false;
      this.lastTime = performance.now();
      console.log('Game resumed');
    }
  }

  private gameLoop = (currentTime: number = performance.now()): void => {
    if (!this.isRunning) return;

    // Request next frame
    requestAnimationFrame(this.gameLoop);

    if (this.isPaused) return;

    // Calculate delta time
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update FPS counter
    this.updateFPS(currentTime);

    // Update game systems
    this.update(deltaTime);

    // Render frame
    this.render(deltaTime);
  };

  private update(deltaTime: number): void {
    // Update input
    this.input.update();

    // Update game state
    this.gameState.update(deltaTime);

    // Update client prediction
    this.prediction.update(deltaTime);

    // Update audio
    this.audio.update(deltaTime);
  }

  private render(deltaTime: number): void {
    // Get current game state
    const state = this.gameState.getCurrentState();
    
    // Apply client prediction for local player
    const predictedState = state ? this.prediction.getPredictedState(state) : null;
    
    // Render the game
    if (predictedState) {
      this.renderer.render(predictedState, deltaTime);
    }
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = currentTime;
      
      // Update debug info if available
      if ((window as any).debugInfo) {
        (window as any).debugInfo.fps = this.currentFps;
      }
    }
  }

  resize(): void {
    const container = document.getElementById('gameContainer');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Update canvas size
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Update renderer
    this.renderer.resize(width, height);

    console.log(`Game resized to ${width}x${height}`);
  }

  destroy(): void {
    console.log('Destroying game...');

    this.stop();
    this.network.disconnect();
    this.audio.destroy();
    this.renderer.destroy();
    this.input.destroy();
    this.ui.destroy();
  }

  // Debug methods
  getDebugInfo() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      fps: this.currentFps,
      playerId: this.playerId,
      roomId: this.roomId,
      networkPing: this.network.getPing(),
      gameState: this.gameState.getDebugInfo(),
      renderer: this.renderer.getDebugInfo(),
    };
  }

  getCurrentState(): GameState | null {
    return this.gameState.getCurrentState();
  }

  getPlayerId(): string | undefined {
    return this.playerId;
  }

  getRoomId(): string | undefined {
    return this.roomId;
  }
}
