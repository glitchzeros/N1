import { System } from '@/engine/core/ecs/System';
import { World } from '@/engine/core/ecs/World';

export interface PlayerProfile {
  id: string;
  name: string;
  skillRating: number;
  level: number;
  totalGames: number;
  wins: number;
  kills: number;
  averagePlacement: number;
  lastPlayed: number;
  region: string;
  ping: number;
}

export interface MatchRequest {
  playerId: string;
  skillRating: number;
  region: string;
  timestamp: number;
  maxWaitTime: number;
}

export interface GameSession {
  id: string;
  players: PlayerProfile[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'active' | 'finished';
  startTime: number;
  endTime?: number;
  map: string;
  region: string;
  skillRange: { min: number; max: number };
}

export interface MatchmakingConfig {
  maxPlayersPerMatch: number;
  skillTolerance: number;
  maxWaitTime: number;
  regions: string[];
  skillDecayRate: number;
  placementMatches: number;
}

export class MatchmakingComponent {
  profile: PlayerProfile;
  status: 'idle' | 'queuing' | 'matched' | 'in-game' = 'idle';
  queueStartTime: number = 0;
  estimatedWaitTime: number = 0;
  matchRequest?: MatchRequest;

  constructor(profile: PlayerProfile) {
    this.profile = profile;
  }

  toJSON() {
    return {
      profile: this.profile,
      status: this.status,
      queueStartTime: this.queueStartTime,
      estimatedWaitTime: this.estimatedWaitTime,
      matchRequest: this.matchRequest,
    };
  }

  fromJSON(json: any) {
    this.profile = json.profile;
    this.status = json.status;
    this.queueStartTime = json.queueStartTime;
    this.estimatedWaitTime = json.estimatedWaitTime;
    this.matchRequest = json.matchRequest;
  }
}

export class MatchmakingSystem extends System {
  private config: MatchmakingConfig;
  private queue: MatchRequest[] = [];
  private activeSessions: Map<string, GameSession> = new Map();
  private playerProfiles: Map<string, PlayerProfile> = new Map();
  private lastMatchmakingUpdate: number = 0;
  private matchmakingInterval: number = 1000; // 1 second

  constructor(config: MatchmakingConfig) {
    super('MatchmakingSystem', 'low', { all: ['MatchmakingComponent'] });
    this.config = config;
  }

  protected onUpdate(deltaTime: number): void {
    const currentTime = performance.now();
    
    // Run matchmaking logic periodically
    if (currentTime - this.lastMatchmakingUpdate >= this.matchmakingInterval) {
      this.processMatchmaking();
      this.lastMatchmakingUpdate = currentTime;
    }
  }

  // Public API for matchmaking
  joinQueue(playerId: string, maxWaitTime: number = 30000): boolean {
    const matchmaking = this.getPlayerMatchmaking(playerId);
    if (!matchmaking || matchmaking.status !== 'idle') {
      return false;
    }

    const request: MatchRequest = {
      playerId,
      skillRating: matchmaking.profile.skillRating,
      region: matchmaking.profile.region,
      timestamp: performance.now(),
      maxWaitTime
    };

    this.queue.push(request);
    matchmaking.status = 'queuing';
    matchmaking.queueStartTime = performance.now();
    matchmaking.matchRequest = request;

    this.emit('player-queued', playerId, request);
    return true;
  }

  leaveQueue(playerId: string): boolean {
    const matchmaking = this.getPlayerMatchmaking(playerId);
    if (!matchmaking || matchmaking.status !== 'queuing') {
      return false;
    }

    // Remove from queue
    const index = this.queue.findIndex(req => req.playerId === playerId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    matchmaking.status = 'idle';
    matchmaking.matchRequest = undefined;

    this.emit('player-left-queue', playerId);
    return true;
  }

  private processMatchmaking(): void {
    const currentTime = performance.now();
    
    // Remove expired requests
    this.queue = this.queue.filter(req => 
      currentTime - req.timestamp < req.maxWaitTime
    );

    // Group players by region and skill
    const regionalQueues = this.groupByRegion(this.queue);
    
    for (const [region, requests] of regionalQueues) {
      this.processRegionalMatchmaking(region, requests);
    }
  }

  private groupByRegion(requests: MatchRequest[]): Map<string, MatchRequest[]> {
    const groups = new Map<string, MatchRequest[]>();
    
    for (const request of requests) {
      if (!groups.has(request.region)) {
        groups.set(request.region, []);
      }
      groups.get(request.region)!.push(request);
    }
    
    return groups;
  }

  private processRegionalMatchmaking(region: string, requests: MatchRequest[]): void {
    // Sort by skill rating
    requests.sort((a, b) => a.skillRating - b.skillRating);
    
    const matches: MatchRequest[][] = [];
    let currentMatch: MatchRequest[] = [];
    
    for (const request of requests) {
      // Check if player is still in queue
      const matchmaking = this.getPlayerMatchmaking(request.playerId);
      if (!matchmaking || matchmaking.status !== 'queuing') {
        continue;
      }

      // Check if player fits in current match
      if (this.canJoinMatch(request, currentMatch)) {
        currentMatch.push(request);
      } else {
        // Start new match if current is full or skill gap is too large
        if (currentMatch.length >= this.config.maxPlayersPerMatch) {
          matches.push([...currentMatch]);
          currentMatch = [request];
        } else {
          currentMatch = [request];
        }
      }
    }
    
    // Add final match if it has enough players
    if (currentMatch.length >= Math.ceil(this.config.maxPlayersPerMatch * 0.8)) {
      matches.push(currentMatch);
    }
    
    // Create game sessions for complete matches
    for (const match of matches) {
      if (match.length >= this.config.maxPlayersPerMatch) {
        this.createGameSession(match, region);
      }
    }
  }

  private canJoinMatch(request: MatchRequest, currentMatch: MatchRequest[]): boolean {
    if (currentMatch.length >= this.config.maxPlayersPerMatch) {
      return false;
    }
    
    if (currentMatch.length === 0) {
      return true;
    }
    
    // Check skill range
    const minSkill = Math.min(...currentMatch.map(p => p.skillRating));
    const maxSkill = Math.max(...currentMatch.map(p => p.skillRating));
    
    return request.skillRating >= minSkill - this.config.skillTolerance &&
           request.skillRating <= maxSkill + this.config.skillTolerance;
  }

  private createGameSession(players: MatchRequest[], region: string): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const playerProfiles = players.map(req => {
      const profile = this.playerProfiles.get(req.playerId);
      return profile || this.createDefaultProfile(req.playerId);
    });
    
    const skillRange = {
      min: Math.min(...players.map(p => p.skillRating)),
      max: Math.max(...players.map(p => p.skillRating))
    };
    
    const session: GameSession = {
      id: sessionId,
      players: playerProfiles,
      maxPlayers: this.config.maxPlayersPerMatch,
      status: 'waiting',
      startTime: performance.now(),
      map: this.selectMap(region),
      region,
      skillRange
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Update player statuses
    for (const player of players) {
      const matchmaking = this.getPlayerMatchmaking(player.playerId);
      if (matchmaking) {
        matchmaking.status = 'matched';
        this.emit('player-matched', player.playerId, session);
      }
    }
    
    // Remove from queue
    for (const player of players) {
      const index = this.queue.findIndex(req => req.playerId === player.playerId);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
    }
    
    this.emit('session-created', session);
  }

  private selectMap(region: string): string {
    // Simple map selection based on region
    const maps = ['map_forest', 'map_desert', 'map_urban', 'map_island'];
    const regionIndex = this.config.regions.indexOf(region);
    return maps[regionIndex % maps.length];
  }

  private createDefaultProfile(playerId: string): PlayerProfile {
    return {
      id: playerId,
      name: `Player_${playerId.substr(0, 8)}`,
      skillRating: 1000,
      level: 1,
      totalGames: 0,
      wins: 0,
      kills: 0,
      averagePlacement: 0,
      lastPlayed: performance.now(),
      region: 'us-east',
      ping: 0
    };
  }

  private getPlayerMatchmaking(playerId: string): MatchmakingComponent | null {
    const world = (this as any).world as World;
    for (const entityId of this.entities) {
      const matchmaking = world.getComponent<MatchmakingComponent>(entityId, 'MatchmakingComponent');
      if (matchmaking && matchmaking.profile.id === playerId) {
        return matchmaking;
      }
    }
    return null;
  }

  // Session management
  startSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'waiting') {
      return false;
    }
    
    session.status = 'starting';
    this.emit('session-starting', session);
    
    // Start game after 10 seconds
    setTimeout(() => {
      this.activateSession(sessionId);
    }, 10000);
    
    return true;
  }

  private activateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.status = 'active';
    
    // Update player statuses
    for (const player of session.players) {
      const matchmaking = this.getPlayerMatchmaking(player.id);
      if (matchmaking) {
        matchmaking.status = 'in-game';
      }
    }
    
    this.emit('session-activated', session);
  }

  endSession(sessionId: string, results: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.status = 'finished';
    session.endTime = performance.now();
    
    // Update player stats
    this.updatePlayerStats(session, results);
    
    // Reset player statuses
    for (const player of session.players) {
      const matchmaking = this.getPlayerMatchmaking(player.id);
      if (matchmaking) {
        matchmaking.status = 'idle';
        matchmaking.matchRequest = undefined;
      }
    }
    
    this.emit('session-ended', session, results);
    this.activeSessions.delete(sessionId);
  }

  private updatePlayerStats(session: GameSession, results: any): void {
    for (const result of results) {
      const profile = this.playerProfiles.get(result.playerId);
      if (profile) {
        profile.totalGames++;
        profile.lastPlayed = performance.now();
        
        if (result.placement === 1) {
          profile.wins++;
        }
        
        profile.kills += result.kills || 0;
        profile.averagePlacement = 
          (profile.averagePlacement * (profile.totalGames - 1) + result.placement) / profile.totalGames;
        
        // Update skill rating
        this.updateSkillRating(profile, result);
      }
    }
  }

  private updateSkillRating(profile: PlayerProfile, result: any): void {
    // Simple ELO-like rating system
    const expectedScore = 1 / (1 + Math.pow(10, (result.opponentRating - profile.skillRating) / 400));
    const actualScore = result.placement === 1 ? 1 : 0.5;
    const kFactor = profile.totalGames < this.config.placementMatches ? 40 : 20;
    
    profile.skillRating += kFactor * (actualScore - expectedScore);
    profile.skillRating = Math.max(100, Math.min(3000, profile.skillRating));
  }

  // Public getters
  getQueueStatus(): any {
    return {
      queueLength: this.queue.length,
      activeSessions: this.activeSessions.size,
      regionalQueues: this.groupByRegion(this.queue)
    };
  }

  getPlayerProfile(playerId: string): PlayerProfile | undefined {
    return this.playerProfiles.get(playerId);
  }

  getActiveSession(sessionId: string): GameSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}