import { System } from '@/engine/core/ecs/System';
import { World } from '@/engine/core/ecs/World';

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  data: any;
  timestamp: number;
  sessionId: string;
  playerId?: string;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  entities: number;
  networkLatency: number;
  loadTime: number;
}

export interface UserBehavior {
  sessionDuration: number;
  actionsPerMinute: number;
  weaponUsage: Record<string, number>;
  movementPatterns: any[];
  deathCauses: Record<string, number>;
  playTimeDistribution: Record<string, number>;
}

export interface GameMetrics {
  totalMatches: number;
  averageMatchDuration: number;
  playerRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  engagement: {
    dailyActiveUsers: number;
    averageSessionsPerDay: number;
    averageSessionLength: number;
  };
  monetization: {
    conversionRate: number;
    averageRevenuePerUser: number;
    totalRevenue: number;
  };
}

export class AnalyticsComponent {
  sessionId: string;
  events: AnalyticsEvent[] = [];
  performanceHistory: PerformanceMetrics[] = [];
  behavior: UserBehavior;
  startTime: number;
  lastEventTime: number;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = performance.now();
    this.lastEventTime = this.startTime;
    
    this.behavior = {
      sessionDuration: 0,
      actionsPerMinute: 0,
      weaponUsage: {},
      movementPatterns: [],
      deathCauses: {},
      playTimeDistribution: {}
    };
  }

  trackEvent(type: string, category: string, data: any, playerId?: string): void {
    const event: AnalyticsEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      data,
      timestamp: performance.now(),
      sessionId: this.sessionId,
      playerId
    };

    this.events.push(event);
    this.lastEventTime = event.timestamp;

    // Emit event for real-time processing
    this.emit('analytics-event', event);
  }

  trackPerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push({
      ...metrics,
      timestamp: performance.now()
    });

    // Keep only last 1000 performance records
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
  }

  updateBehavior(updates: Partial<UserBehavior>): void {
    Object.assign(this.behavior, updates);
  }

  getSessionDuration(): number {
    return performance.now() - this.startTime;
  }

  getAveragePerformance(): PerformanceMetrics {
    if (this.performanceHistory.length === 0) {
      return {
        fps: 0,
        frameTime: 0,
        memoryUsage: 0,
        drawCalls: 0,
        triangles: 0,
        entities: 0,
        networkLatency: 0,
        loadTime: 0
      };
    }

    const sum = this.performanceHistory.reduce((acc, curr) => ({
      fps: acc.fps + curr.fps,
      frameTime: acc.frameTime + curr.frameTime,
      memoryUsage: acc.memoryUsage + curr.memoryUsage,
      drawCalls: acc.drawCalls + curr.drawCalls,
      triangles: acc.triangles + curr.triangles,
      entities: acc.entities + curr.entities,
      networkLatency: acc.networkLatency + curr.networkLatency,
      loadTime: acc.loadTime + curr.loadTime
    }));

    const count = this.performanceHistory.length;
    return {
      fps: sum.fps / count,
      frameTime: sum.frameTime / count,
      memoryUsage: sum.memoryUsage / count,
      drawCalls: sum.drawCalls / count,
      triangles: sum.triangles / count,
      entities: sum.entities / count,
      networkLatency: sum.networkLatency / count,
      loadTime: sum.loadTime / count
    };
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      events: this.events,
      performanceHistory: this.performanceHistory,
      behavior: this.behavior,
      startTime: this.startTime,
      lastEventTime: this.lastEventTime
    };
  }

  fromJSON(json: any) {
    this.sessionId = json.sessionId;
    this.events = json.events;
    this.performanceHistory = json.performanceHistory;
    this.behavior = json.behavior;
    this.startTime = json.startTime;
    this.lastEventTime = json.lastEventTime;
  }
}

export class AnalyticsSystem extends System {
  private config: {
    enabled: boolean;
    endpoint: string;
    batchSize: number;
    flushInterval: number;
    enableRealTime: boolean;
  };
  private eventQueue: AnalyticsEvent[] = [];
  private lastFlush: number = 0;
  private globalMetrics: GameMetrics;

  constructor(config: any = {}) {
    super('AnalyticsSystem', 'low', { all: ['AnalyticsComponent'] });
    
    this.config = {
      enabled: true,
      endpoint: 'https://analytics.nexus-royale.com/events',
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      enableRealTime: true,
      ...config
    };

    this.globalMetrics = {
      totalMatches: 0,
      averageMatchDuration: 0,
      playerRetention: { day1: 0, day7: 0, day30: 0 },
      engagement: {
        dailyActiveUsers: 0,
        averageSessionsPerDay: 0,
        averageSessionLength: 0
      },
      monetization: {
        conversionRate: 0,
        averageRevenuePerUser: 0,
        totalRevenue: 0
      }
    };
  }

  protected onUpdate(deltaTime: number): void {
    const currentTime = performance.now();

    // Flush events periodically
    if (currentTime - this.lastFlush >= this.config.flushInterval) {
      this.flushEvents();
      this.lastFlush = currentTime;
    }

    // Update analytics for all entities
    for (const entityId of this.entities) {
      const analytics = this.getEntityAnalytics(entityId);
      if (!analytics) continue;

      // Update session duration
      analytics.behavior.sessionDuration = analytics.getSessionDuration();
    }
  }

  // Public API for tracking events
  trackEvent(playerId: string, type: string, category: string, data: any): void {
    if (!this.config.enabled) return;

    const analytics = this.getPlayerAnalytics(playerId);
    if (!analytics) return;

    analytics.trackEvent(type, category, data, playerId);

    // Add to global queue
    const event: AnalyticsEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      data,
      timestamp: performance.now(),
      sessionId: analytics.sessionId,
      playerId
    };

    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  trackPerformance(playerId: string, metrics: PerformanceMetrics): void {
    if (!this.config.enabled) return;

    const analytics = this.getPlayerAnalytics(playerId);
    if (!analytics) return;

    analytics.trackPerformance(metrics);
  }

  trackUserBehavior(playerId: string, behavior: Partial<UserBehavior>): void {
    if (!this.config.enabled) return;

    const analytics = this.getPlayerAnalytics(playerId);
    if (!analytics) return;

    analytics.updateBehavior(behavior);
  }

  // Game-specific tracking methods
  trackGameStart(playerId: string, matchId: string, playerCount: number): void {
    this.trackEvent(playerId, 'game_start', 'gameplay', {
      matchId,
      playerCount,
      timestamp: Date.now()
    });
  }

  trackGameEnd(playerId: string, matchId: string, placement: number, duration: number, kills: number): void {
    this.trackEvent(playerId, 'game_end', 'gameplay', {
      matchId,
      placement,
      duration,
      kills,
      timestamp: Date.now()
    });

    // Update global metrics
    this.globalMetrics.totalMatches++;
    this.globalMetrics.averageMatchDuration = 
      (this.globalMetrics.averageMatchDuration * (this.globalMetrics.totalMatches - 1) + duration) / this.globalMetrics.totalMatches;
  }

  trackWeaponUsage(playerId: string, weapon: string, shots: number, hits: number): void {
    this.trackEvent(playerId, 'weapon_usage', 'combat', {
      weapon,
      shots,
      hits,
      accuracy: hits / shots,
      timestamp: Date.now()
    });
  }

  trackPlayerDeath(playerId: string, cause: string, killerId?: string, distance?: number): void {
    this.trackEvent(playerId, 'player_death', 'combat', {
      cause,
      killerId,
      distance,
      timestamp: Date.now()
    });
  }

  trackPurchase(playerId: string, itemId: string, price: number, currency: string): void {
    this.trackEvent(playerId, 'purchase', 'monetization', {
      itemId,
      price,
      currency,
      timestamp: Date.now()
    });

    // Update monetization metrics
    this.globalMetrics.monetization.totalRevenue += price;
  }

  trackLevelUp(playerId: string, newLevel: number, xpGained: number): void {
    this.trackEvent(playerId, 'level_up', 'progression', {
      newLevel,
      xpGained,
      timestamp: Date.now()
    });
  }

  trackAchievement(playerId: string, achievementId: string, progress: number): void {
    this.trackEvent(playerId, 'achievement_progress', 'progression', {
      achievementId,
      progress,
      timestamp: Date.now()
    });
  }

  trackError(playerId: string, error: string, context: any): void {
    this.trackEvent(playerId, 'error', 'system', {
      error,
      context,
      timestamp: Date.now()
    });
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Send to analytics endpoint
    if (this.config.endpoint) {
      this.sendToEndpoint(events);
    }

    // Store locally for offline analysis
    this.storeLocally(events);
  }

  private async sendToEndpoint(events: AnalyticsEvent[]): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          timestamp: Date.now(),
          version: '1.0.0'
        })
      });

      if (!response.ok) {
        console.warn('Failed to send analytics events:', response.status);
        // Re-queue failed events
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Error sending analytics events:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...events);
    }
  }

  private storeLocally(events: AnalyticsEvent[]): void {
    try {
      const existing = localStorage.getItem('nexus_analytics');
      const stored = existing ? JSON.parse(existing) : [];
      stored.push(...events);
      
      // Keep only last 1000 events
      if (stored.length > 1000) {
        stored.splice(0, stored.length - 1000);
      }
      
      localStorage.setItem('nexus_analytics', JSON.stringify(stored));
    } catch (error) {
      console.error('Error storing analytics locally:', error);
    }
  }

  private getPlayerAnalytics(playerId: string): AnalyticsComponent | null {
    const world = (this as any).world as World;
    for (const entityId of this.entities) {
      const analytics = world.getComponent<AnalyticsComponent>(entityId, 'AnalyticsComponent');
      if (analytics && analytics.sessionId.includes(playerId)) {
        return analytics;
      }
    }
    return null;
  }

  private getEntityAnalytics(entityId: string): AnalyticsComponent | null {
    const world = (this as any).world as World;
    return world.getComponent<AnalyticsComponent>(entityId, 'AnalyticsComponent');
  }

  // Public getters
  getGlobalMetrics(): GameMetrics {
    return { ...this.globalMetrics };
  }

  getPlayerAnalyticsData(playerId: string): any {
    const analytics = this.getPlayerAnalytics(playerId);
    if (!analytics) return null;

    return {
      sessionId: analytics.sessionId,
      sessionDuration: analytics.getSessionDuration(),
      events: analytics.events.length,
      averagePerformance: analytics.getAveragePerformance(),
      behavior: analytics.behavior
    };
  }

  // Performance monitoring
  getPerformanceSummary(): any {
    const allAnalytics = Array.from(this.entities).map(entityId => {
      const analytics = this.getEntityAnalytics(entityId);
      return analytics ? analytics.getAveragePerformance() : null;
    }).filter(Boolean);

    if (allAnalytics.length === 0) return null;

    const sum = allAnalytics.reduce((acc, curr) => ({
      fps: acc.fps + curr.fps,
      frameTime: acc.frameTime + curr.frameTime,
      memoryUsage: acc.memoryUsage + curr.memoryUsage,
      drawCalls: acc.drawCalls + curr.drawCalls,
      triangles: acc.triangles + curr.triangles,
      entities: acc.entities + curr.entities,
      networkLatency: acc.networkLatency + curr.networkLatency,
      loadTime: acc.loadTime + curr.loadTime
    }));

    const count = allAnalytics.length;
    return {
      fps: sum.fps / count,
      frameTime: sum.frameTime / count,
      memoryUsage: sum.memoryUsage / count,
      drawCalls: sum.drawCalls / count,
      triangles: sum.triangles / count,
      entities: sum.entities / count,
      networkLatency: sum.networkLatency / count,
      loadTime: sum.loadTime / count
    };
  }
}