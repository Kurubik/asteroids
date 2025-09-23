import { Player, formatScore } from '@shared/index.js';

interface HUDData {
  score: number;
  lives: number;
  health: number;
  ping: number;
}

export class UIManager {
  private joinMenu: HTMLElement;
  private hud: HTMLElement;
  private playerList: HTMLElement;
  private connectionStatus: HTMLElement;
  private controls: HTMLElement;

  private playerNameInput: HTMLInputElement;
  private roomCodeInput: HTMLInputElement;
  private joinButton: HTMLButtonElement;
  private quickPlayButton: HTMLButtonElement;

  // Event handlers
  public onJoinGame?: (playerName: string, roomCode?: string) => void;
  public onLeaveGame?: () => void;

  constructor() {
    this.joinMenu = document.getElementById('joinMenu')!;
    this.hud = document.getElementById('hud')!;
    this.playerList = document.getElementById('playerList')!;
    this.connectionStatus = document.getElementById('connectionStatus')!;
    this.controls = document.getElementById('controls')!;

    this.playerNameInput = document.getElementById('playerName') as HTMLInputElement;
    this.roomCodeInput = document.getElementById('roomCode') as HTMLInputElement;
    this.joinButton = document.getElementById('joinButton') as HTMLButtonElement;
    this.quickPlayButton = document.getElementById('quickPlayButton') as HTMLButtonElement;
  }

  init(): void {
    this.setupEventListeners();
    this.showJoinMenu();
    console.log('UIManager initialized');
  }

  private setupEventListeners(): void {
    this.joinButton.addEventListener('click', () => {
      const playerName = this.playerNameInput.value.trim();
      const roomCode = this.roomCodeInput.value.trim() || undefined;
      
      if (this.validatePlayerName(playerName)) {
        this.onJoinGame?.(playerName, roomCode);
      }
    });

    this.quickPlayButton.addEventListener('click', () => {
      const playerName = this.playerNameInput.value.trim();
      
      if (this.validatePlayerName(playerName)) {
        this.onJoinGame?.(playerName);
      }
    });

    // Enter key in input fields
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.joinButton.click();
      }
    });

    this.roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.joinButton.click();
      }
    });

    // ESC key to leave game
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isInGame()) {
        this.onLeaveGame?.();
      }
    });

    // Auto-focus on player name input
    this.playerNameInput.focus();

    // Room code formatting (uppercase)
    this.roomCodeInput.addEventListener('input', () => {
      this.roomCodeInput.value = this.roomCodeInput.value.toUpperCase();
    });
  }

  private validatePlayerName(name: string): boolean {
    if (!name) {
      this.showError('Please enter your name');
      this.playerNameInput.focus();
      return false;
    }

    if (name.length < 2) {
      this.showError('Name must be at least 2 characters');
      this.playerNameInput.focus();
      return false;
    }

    if (name.length > 20) {
      this.showError('Name must be less than 20 characters');
      this.playerNameInput.focus();
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      this.showError('Name can only contain letters, numbers, underscores, and hyphens');
      this.playerNameInput.focus();
      return false;
    }

    return true;
  }

  showJoinMenu(): void {
    this.joinMenu.style.display = 'block';
    this.hud.style.display = 'none';
    this.playerList.style.display = 'none';
    this.controls.style.display = 'none';
    this.playerNameInput.focus();
  }

  hideJoinMenu(): void {
    this.joinMenu.style.display = 'none';
  }

  showGameUI(): void {
    this.hud.style.display = 'block';
    this.playerList.style.display = 'block';
    this.controls.style.display = 'block';
  }

  updateHUD(data: HUDData): void {
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const healthElement = document.getElementById('health');
    const pingElement = document.getElementById('ping');

    if (scoreElement) scoreElement.textContent = `Score: ${formatScore(data.score)}`;
    if (livesElement) livesElement.textContent = `Lives: ${data.lives}`;
    if (healthElement) {
      healthElement.textContent = `Health: ${Math.round(data.health)}`;
      
      // Change color based on health
      if (data.health < 25) {
        healthElement.style.color = '#ff6666';
      } else if (data.health < 50) {
        healthElement.style.color = '#ffff66';
      } else {
        healthElement.style.color = '#00ff00';
      }
    }
    if (pingElement) {
      pingElement.textContent = `Ping: ${data.ping}ms`;
      
      // Change color based on ping
      if (data.ping > 200) {
        pingElement.style.color = '#ff6666';
      } else if (data.ping > 100) {
        pingElement.style.color = '#ffff66';
      } else {
        pingElement.style.color = '#00ff00';
      }
    }
  }

  updatePlayerList(players: Player[]): void {
    const playersElement = document.getElementById('players');
    if (!playersElement) return;

    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    playersElement.innerHTML = '';
    
    for (const player of sortedPlayers) {
      const playerElement = document.createElement('div');
      playerElement.className = 'player-entry';
      
      const statusIcon = player.isAlive ? '●' : '○';
      const statusColor = player.isAlive ? '#00ff00' : '#666666';
      
      playerElement.innerHTML = `
        <span style="color: ${statusColor}">${statusIcon}</span>
        <span class="player-name">${player.name}</span>
        <span class="player-score">${formatScore(player.score)}</span>
      `;
      
      playerElement.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        font-size: 12px;
      `;
      
      playersElement.appendChild(playerElement);
    }
  }

  setConnectionStatus(status: 'connected' | 'disconnected' | 'connecting'): void {
    this.connectionStatus.className = `ui-element ${status}`;
    
    switch (status) {
      case 'connected':
        this.connectionStatus.textContent = 'Connected';
        break;
      case 'disconnected':
        this.connectionStatus.textContent = 'Disconnected';
        break;
      case 'connecting':
        this.connectionStatus.textContent = 'Connecting...';
        break;
    }
  }

  showError(message: string): void {
    // Create error popup
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-popup';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(100, 0, 0, 0.9);
      color: #ff6666;
      border: 2px solid #ff6666;
      border-radius: 5px;
      padding: 20px;
      z-index: 1000;
      font-family: 'Courier New', monospace;
      text-align: center;
      box-shadow: 0 0 20px rgba(255, 102, 102, 0.3);
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);

    // Remove on click
    errorDiv.addEventListener('click', () => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    });
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const colors = {
      info: '#00ffff',
      success: '#66ff66',
      warning: '#ffff66',
    };

    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification';
    notificationDiv.textContent = message;
    notificationDiv.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: ${colors[type]};
      border: 1px solid ${colors[type]};
      border-radius: 5px;
      padding: 15px;
      z-index: 1000;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      max-width: 300px;
    `;

    document.body.appendChild(notificationDiv);

    // Slide in animation
    notificationDiv.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      notificationDiv.style.transition = 'transform 0.3s ease';
      notificationDiv.style.transform = 'translateX(0)';
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notificationDiv.parentNode) {
        notificationDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notificationDiv.parentNode) {
            notificationDiv.parentNode.removeChild(notificationDiv);
          }
        }, 300);
      }
    }, 3000);
  }

  isInGame(): boolean {
    return this.joinMenu.style.display === 'none';
  }

  destroy(): void {
    // Clean up event listeners if needed
    console.log('UIManager destroyed');
  }

  getDebugInfo() {
    return {
      isInGame: this.isInGame(),
      playerName: this.playerNameInput.value,
      roomCode: this.roomCodeInput.value,
    };
  }
}