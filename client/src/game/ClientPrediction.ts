import { 
  InputState, 
  Player, 
  GameState, 
  SnapshotData,
  updatePlayerMovement,
  GAME_CONFIG 
} from '@shared/index.js';

interface PredictionInput {
  sequence: number;
  timestamp: number;
  input: InputState;
  processed: boolean;
}

export class ClientPrediction {
  private playerId?: string;
  private inputBuffer: PredictionInput[] = [];
  private sequenceNumber = 0;
  private lastAcknowledgedSequence = 0;
  private predictedState: Partial<Player> | null = null;

  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  applyInput(playerId: string, inputState: InputState): void {
    if (!this.playerId || this.playerId !== playerId) return;

    this.sequenceNumber++;
    
    const inputEntry: PredictionInput = {
      sequence: this.sequenceNumber,
      timestamp: Date.now(),
      input: inputState,
      processed: false,
    };

    this.inputBuffer.push(inputEntry);
    
    // Keep buffer size reasonable
    if (this.inputBuffer.length > 60) {
      this.inputBuffer.shift();
    }
  }

  reconcile(snapshot: SnapshotData): void {
    if (!this.playerId) return;

    // Find server state for local player
    const serverPlayer = snapshot.players.find(p => p.id === this.playerId) as Player;
    if (!serverPlayer) return;

    // Update last acknowledged sequence if we received an ack
    // This would normally come from a separate ack message
    
    // Find unprocessed inputs after the server's acknowledged state
    const unprocessedInputs: PredictionInput[] = this.inputBuffer.filter(
      input => input.sequence > this.lastAcknowledgedSequence
    );

    // Start with server's authoritative state
    this.predictedState = {
      id: serverPlayer.id,
      transform: {
        position: { ...serverPlayer.transform.position },
        rotation: serverPlayer.transform.rotation,
      },
      velocity: {
        linear: { ...serverPlayer.velocity.linear },
        angular: serverPlayer.velocity.angular,
      },
      isAlive: serverPlayer.isAlive,
    };

    // Re-apply unprocessed inputs
    for (const inputEntry of unprocessedInputs) {
      if (this.predictedState?.isAlive) {
        this.applyInputToState(this.predictedState, inputEntry.input);
      }
    }
  }

  private applyInputToState(player: Partial<Player>, input: InputState): void {
    if (!player.transform || !player.velocity) return;

    const deltaTime = GAME_CONFIG.FIXED_TIMESTEP;

    // Apply the same movement logic as the server
    const playerCopy = {
      transform: {
        position: { ...player.transform.position },
        rotation: player.transform.rotation,
      },
      velocity: {
        linear: { ...player.velocity.linear },
        angular: player.velocity.angular,
      },
    } as any;

    // Use the shared movement function
    updatePlayerMovement(playerCopy, input, deltaTime);

    // Update our predicted state
    player.transform.position = playerCopy.transform.position;
    player.transform.rotation = playerCopy.transform.rotation;
    player.velocity.linear = playerCopy.velocity.linear;
    player.velocity.angular = playerCopy.velocity.angular;
  }

  update(_deltaTime: number): void {
    // Clean up old inputs
    const cutoffTime = Date.now() - 2000; // Keep 2 seconds of input history
    
    // Remove old inputs from the buffer
    this.inputBuffer = this.inputBuffer.filter(
      input => input.timestamp > cutoffTime
    );
  }

  getPredictedState(gameState: GameState): GameState {
    if (!this.playerId || !this.predictedState || !gameState) {
      return gameState;
    }

    // Create a copy of the game state with predicted local player
    const predictedGameState: GameState = {
      ...gameState,
      players: gameState.players.map(player => {
        if (player.id === this.playerId && this.predictedState) {
          return {
            ...player,
            transform: this.predictedState.transform || player.transform,
            velocity: this.predictedState.velocity || player.velocity,
          };
        }
        return player;
      }),
    };

    return predictedGameState;
  }

  getCurrentSequence(): number {
    return this.sequenceNumber;
  }

  acknowledgeSequence(sequence: number): void {
    this.lastAcknowledgedSequence = Math.max(this.lastAcknowledgedSequence, sequence);
  }

  getDebugInfo() {
    return {
      playerId: this.playerId,
      sequenceNumber: this.sequenceNumber,
      lastAcknowledgedSequence: this.lastAcknowledgedSequence,
      inputBufferSize: this.inputBuffer.length,
      hasPredictedState: this.predictedState !== null,
      predictedPosition: this.predictedState?.transform?.position,
    };
  }
}