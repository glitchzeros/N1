import { EventEmitter } from 'events';

export interface NetworkConfig {
  serverUrl: string;
  roomId?: string;
  playerId: string;
  enableWebRTC: boolean;
  enableWebSocket: boolean;
  predictionEnabled: boolean;
  reconciliationEnabled: boolean;
  maxPredictionSteps: number;
}

export interface NetworkMessage {
  type: string;
  data: any;
  timestamp: number;
  sequence: number;
  playerId: string;
}

export interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  health: number;
  weapon: string;
  ammo: number;
  timestamp: number;
}

export interface GameState {
  players: Map<string, PlayerState>;
  projectiles: any[];
  destructibles: any[];
  zone: {
    center: { x: number; y: number; z: number };
    radius: number;
    damage: number;
  };
  gameTime: number;
  timestamp: number;
}

export class NetworkManager extends EventEmitter {
  private config: NetworkConfig;
  private connected: boolean = false;
  private roomId: string | null = null;
  private players: Map<string, PlayerState> = new Map();
  private localPlayerId: string;
  private sequence: number = 0;
  private lastServerUpdate: number = 0;
  private predictionBuffer: PlayerState[] = [];
  private reconciliationBuffer: NetworkMessage[] = [];
  private websocket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor(config: NetworkConfig) {
    super();
    this.config = config;
    this.localPlayerId = config.playerId;
  }

  async connect(): Promise<boolean> {
    try {
      if (this.config.enableWebSocket) {
        await this.connectWebSocket();
      }
      
      if (this.config.enableWebRTC) {
        await this.setupWebRTC();
      }

      this.connected = true;
      this.emit('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to network:', error);
      this.emit('error', error);
      return false;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(this.config.serverUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.joinRoom();
        resolve();
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.emit('disconnected');
      };
    });
  }

  private async setupWebRTC(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.dataChannel = this.peerConnection.createDataChannel('gameData', {
      ordered: false,
      maxRetransmits: 0
    });

    this.dataChannel.onopen = () => {
      console.log('WebRTC data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      this.handleWebRTCMessage(JSON.parse(event.data));
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendWebSocketMessage({
          type: 'ice-candidate',
          data: event.candidate,
          timestamp: Date.now(),
          sequence: this.sequence++,
          playerId: this.localPlayerId
        });
      }
    };
  }

  private joinRoom(): void {
    this.sendWebSocketMessage({
      type: 'join-room',
      data: { roomId: this.config.roomId },
      timestamp: Date.now(),
      sequence: this.sequence++,
      playerId: this.localPlayerId
    });
  }

  sendPlayerState(state: PlayerState): void {
    const message: NetworkMessage = {
      type: 'player-state',
      data: state,
      timestamp: Date.now(),
      sequence: this.sequence++,
      playerId: this.localPlayerId
    };

    if (this.config.predictionEnabled) {
      this.predictionBuffer.push(state);
      if (this.predictionBuffer.length > this.config.maxPredictionSteps) {
        this.predictionBuffer.shift();
      }
    }

    this.sendMessage(message);
  }

  sendAction(action: string, data: any): void {
    const message: NetworkMessage = {
      type: 'action',
      data: { action, ...data },
      timestamp: Date.now(),
      sequence: this.sequence++,
      playerId: this.localPlayerId
    };

    this.sendMessage(message);
  }

  private sendMessage(message: NetworkMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  private sendWebSocketMessage(message: NetworkMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  private handleWebSocketMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'room-joined':
        this.roomId = message.data.roomId;
        this.emit('room-joined', message.data);
        break;
      
      case 'player-joined':
        this.players.set(message.playerId, message.data);
        this.emit('player-joined', message.playerId, message.data);
        break;
      
      case 'player-left':
        this.players.delete(message.playerId);
        this.emit('player-left', message.playerId);
        break;
      
      case 'game-state':
        this.handleGameStateUpdate(message.data);
        break;
      
      case 'ice-candidate':
        if (this.peerConnection) {
          this.peerConnection.addIceCandidate(message.data);
        }
        break;
      
      case 'offer':
        if (this.peerConnection) {
          this.peerConnection.setRemoteDescription(message.data);
          this.peerConnection.createAnswer().then(answer => {
            this.sendWebSocketMessage({
              type: 'answer',
              data: answer,
              timestamp: Date.now(),
              sequence: this.sequence++,
              playerId: this.localPlayerId
            });
          });
        }
        break;
      
      case 'answer':
        if (this.peerConnection) {
          this.peerConnection.setRemoteDescription(message.data);
        }
        break;
    }
  }

  private handleWebRTCMessage(message: NetworkMessage): void {
    // Handle WebRTC-specific messages (usually for low-latency updates)
    this.handleWebSocketMessage(message);
  }

  private handleGameStateUpdate(gameState: GameState): void {
    this.lastServerUpdate = gameState.timestamp;
    
    // Update remote players
    for (const [playerId, state] of Object.entries(gameState.players)) {
      if (playerId !== this.localPlayerId) {
        this.players.set(playerId, state);
      }
    }

    // Handle reconciliation if enabled
    if (this.config.reconciliationEnabled) {
      this.reconcileState(gameState);
    }

    this.emit('game-state-update', gameState);
  }

  private reconcileState(serverState: GameState): void {
    const localState = this.players.get(this.localPlayerId);
    if (!localState) return;

    const serverPlayerState = serverState.players[this.localPlayerId];
    if (!serverPlayerState) return;

    // Check if server state differs significantly from predicted state
    const positionDiff = Math.abs(localState.position.x - serverPlayerState.position.x) +
                        Math.abs(localState.position.y - serverPlayerState.position.y) +
                        Math.abs(localState.position.z - serverPlayerState.position.z);

    if (positionDiff > 0.1) {
      // Server correction needed - apply server state and replay inputs
      this.players.set(this.localPlayerId, serverPlayerState);
      this.replayInputs(serverPlayerState.timestamp);
    }
  }

  private replayInputs(fromTimestamp: number): void {
    // Replay inputs from the reconciliation buffer
    const inputsToReplay = this.reconciliationBuffer.filter(
      msg => msg.timestamp > fromTimestamp && msg.type === 'player-state'
    );

    for (const input of inputsToReplay) {
      // Reapply input to current state
      this.emit('input-replay', input.data);
    }
  }

  getPlayerState(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): Map<string, PlayerState> {
    return new Map(this.players);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.connected = false;
    this.emit('disconnected');
  }

  // Performance monitoring
  getNetworkStats(): any {
    return {
      connected: this.connected,
      players: this.players.size,
      predictionBufferSize: this.predictionBuffer.length,
      reconciliationBufferSize: this.reconciliationBuffer.length,
      lastServerUpdate: this.lastServerUpdate,
      latency: Date.now() - this.lastServerUpdate
    };
  }
}