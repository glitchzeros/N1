import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { HealthComponent } from '@/engine/systems/HealthSystem';
import { World } from '@/engine/core/ecs/World';
import { Vector3 } from '@/engine/core/math';

export interface ZonePhase {
  phase: number;
  center: Vector3;
  radius: number;
  damage: number;
  duration: number;
  startTime: number;
  endTime: number;
}

export interface BattleRoyaleState {
  phase: 'waiting' | 'dropping' | 'active' | 'finished';
  startTime: number;
  endTime?: number;
  currentPhase: number;
  playersAlive: number;
  totalPlayers: number;
  zone: ZonePhase;
  safeZone: ZonePhase;
  dropZone: Vector3;
  winner?: string;
}

export class BattleRoyaleComponent {
  state: BattleRoyaleState;
  placement: number = 0;
  kills: number = 0;
  damageDealt: number = 0;
  timeAlive: number = 0;
  lastZoneDamage: number = 0;

  constructor(totalPlayers: number = 100) {
    this.state = {
      phase: 'waiting',
      startTime: 0,
      currentPhase: 0,
      playersAlive: totalPlayers,
      totalPlayers,
      zone: this.createInitialZone(),
      safeZone: this.createInitialZone(),
      dropZone: new Vector3(0, 0, 0)
    };
  }

  private createInitialZone(): ZonePhase {
    return {
      phase: 0,
      center: new Vector3(0, 0, 0),
      radius: 1000,
      damage: 0,
      duration: 300000, // 5 minutes
      startTime: 0,
      endTime: 0
    };
  }

  toJSON() {
    return {
      state: this.state,
      placement: this.placement,
      kills: this.kills,
      damageDealt: this.damageDealt,
      timeAlive: this.timeAlive,
      lastZoneDamage: this.lastZoneDamage,
    };
  }

  fromJSON(json: any) {
    this.state = json.state;
    this.placement = json.placement;
    this.kills = json.kills;
    this.damageDealt = json.damageDealt;
    this.timeAlive = json.timeAlive;
    this.lastZoneDamage = json.lastZoneDamage;
  }
}

export class BattleRoyaleSystem extends System {
  private phases: ZonePhase[] = [];
  private currentTime: number = 0;
  private lastPhaseUpdate: number = 0;
  private phaseUpdateInterval: number = 1000; // 1 second
  private zoneDamageInterval: number = 1000; // 1 second
  private lastZoneDamage: number = 0;

  constructor() {
    super('BattleRoyaleSystem', 'normal', { all: ['BattleRoyaleComponent'] });
    this.initializePhases();
  }

  private initializePhases(): void {
    // Define zone phases
    this.phases = [
      {
        phase: 1,
        center: new Vector3(0, 0, 0),
        radius: 800,
        damage: 1,
        duration: 180000, // 3 minutes
        startTime: 0,
        endTime: 0
      },
      {
        phase: 2,
        center: new Vector3(0, 0, 0),
        radius: 600,
        damage: 2,
        duration: 150000, // 2.5 minutes
        startTime: 0,
        endTime: 0
      },
      {
        phase: 3,
        center: new Vector3(0, 0, 0),
        radius: 400,
        damage: 3,
        duration: 120000, // 2 minutes
        startTime: 0,
        endTime: 0
      },
      {
        phase: 4,
        center: new Vector3(0, 0, 0),
        radius: 200,
        damage: 5,
        duration: 90000, // 1.5 minutes
        startTime: 0,
        endTime: 0
      },
      {
        phase: 5,
        center: new Vector3(0, 0, 0),
        radius: 100,
        damage: 10,
        duration: 60000, // 1 minute
        startTime: 0,
        endTime: 0
      }
    ];
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    this.currentTime = performance.now();

    // Update phase logic
    if (this.currentTime - this.lastPhaseUpdate >= this.phaseUpdateInterval) {
      this.updatePhases();
      this.lastPhaseUpdate = this.currentTime;
    }

    // Apply zone damage
    if (this.currentTime - this.lastZoneDamage >= this.zoneDamageInterval) {
      this.applyZoneDamage(world);
      this.lastZoneDamage = this.currentTime;
    }

    // Update battle royale state for all entities
    for (const entityId of this.entities) {
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      const health = world.getComponent<HealthComponent>(entityId, 'HealthComponent');
      
      if (!br || !health) continue;

      // Update time alive
      if (br.state.phase === 'active' && !health.isDead) {
        br.timeAlive += deltaTime;
      }

      // Check if player is in zone
      this.checkZonePosition(entityId, br, world);
    }
  }

  private updatePhases(): void {
    for (const entityId of this.entities) {
      const world = (this as any).world as World;
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      if (!br) continue;

      const currentPhase = br.state.currentPhase;
      const phase = this.phases[currentPhase];

      if (!phase) continue;

      // Check if it's time to advance to next phase
      if (this.currentTime >= phase.endTime && currentPhase < this.phases.length - 1) {
        this.advancePhase(entityId, br, world);
      }
    }
  }

  private advancePhase(entityId: string, br: BattleRoyaleComponent, world: World): void {
    br.state.currentPhase++;
    const newPhase = this.phases[br.state.currentPhase];
    
    if (newPhase) {
      // Update zone
      br.state.zone = {
        ...newPhase,
        startTime: this.currentTime,
        endTime: this.currentTime + newPhase.duration
      };

      // Shrink safe zone
      this.shrinkSafeZone(br);

      // Emit phase change event
      this.emit('phase-changed', {
        phase: br.state.currentPhase,
        zone: br.state.zone,
        safeZone: br.state.safeZone
      });
    }
  }

  private shrinkSafeZone(br: BattleRoyaleComponent): void {
    const currentPhase = this.phases[br.state.currentPhase];
    if (!currentPhase) return;

    // Calculate new safe zone center (random within current zone)
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (br.state.zone.radius - currentPhase.radius);
    const newCenter = new Vector3(
      br.state.zone.center.x + Math.cos(angle) * distance,
      0,
      br.state.zone.center.z + Math.sin(angle) * distance
    );

    br.state.safeZone = {
      ...currentPhase,
      center: newCenter,
      startTime: this.currentTime,
      endTime: this.currentTime + currentPhase.duration
    };
  }

  private checkZonePosition(entityId: string, br: BattleRoyaleComponent, world: World): void {
    const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
    if (!transform) return;

    // Check if player is outside the zone
    const distanceToZone = transform.position.distance(br.state.zone.center);
    
    if (distanceToZone > br.state.zone.radius) {
      // Player is outside zone - mark for damage
      br.lastZoneDamage = this.currentTime;
    }
  }

  private applyZoneDamage(world: World): void {
    for (const entityId of this.entities) {
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      const health = world.getComponent<HealthComponent>(entityId, 'HealthComponent');
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      
      if (!br || !health || !transform || health.isDead) continue;

      // Check if player is outside zone
      const distanceToZone = transform.position.distance(br.state.zone.center);
      
      if (distanceToZone > br.state.zone.radius) {
        // Apply zone damage
        const damage = br.state.zone.damage;
        const died = health.takeDamage(damage);
        
        if (died) {
          this.handlePlayerElimination(entityId, br, world);
        }
      }
    }
  }

  private handlePlayerElimination(entityId: string, br: BattleRoyaleComponent, world: World): void {
    // Update placement
    br.placement = br.state.playersAlive;
    br.state.playersAlive--;

    // Check if game is over
    if (br.state.playersAlive <= 1) {
      this.endGame(br, world);
    }

    // Emit elimination event
    this.emit('player-eliminated', {
      playerId: entityId,
      placement: br.placement,
      playersRemaining: br.state.playersAlive
    });
  }

  private endGame(br: BattleRoyaleComponent, world: World): void {
    br.state.phase = 'finished';
    br.state.endTime = this.currentTime;

    // Find winner
    const winner = this.findWinner(world);
    if (winner) {
      br.state.winner = winner;
      br.placement = 1;
    }

    // Emit game end event
    this.emit('game-ended', {
      winner: br.state.winner,
      finalPlacement: br.placement,
      totalPlayers: br.state.totalPlayers,
      timeAlive: br.timeAlive,
      kills: br.kills
    });
  }

  private findWinner(world: World): string | null {
    for (const entityId of this.entities) {
      const health = world.getComponent<HealthComponent>(entityId, 'HealthComponent');
      if (health && !health.isDead) {
        return entityId;
      }
    }
    return null;
  }

  // Public API
  startGame(): void {
    for (const entityId of this.entities) {
      const world = (this as any).world as World;
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      if (!br) continue;

      br.state.phase = 'active';
      br.state.startTime = this.currentTime;
      br.state.zone.startTime = this.currentTime;
      br.state.zone.endTime = this.currentTime + br.state.zone.duration;
      br.state.safeZone.startTime = this.currentTime;
      br.state.safeZone.endTime = this.currentTime + br.state.safeZone.duration;
    }

    this.emit('game-started');
  }

  dropPlayers(): void {
    for (const entityId of this.entities) {
      const world = (this as any).world as World;
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      
      if (!br || !transform) continue;

      // Random drop position within initial zone
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * br.state.zone.radius;
      
      transform.position.set(
        br.state.zone.center.x + Math.cos(angle) * distance,
        100, // Drop height
        br.state.zone.center.z + Math.sin(angle) * distance
      );
    }

    this.emit('players-dropped');
  }

  getZoneInfo(): any {
    for (const entityId of this.entities) {
      const world = (this as any).world as World;
      const br = world.getComponent<BattleRoyaleComponent>(entityId, 'BattleRoyaleComponent');
      if (br) {
        return {
          currentZone: br.state.zone,
          safeZone: br.state.safeZone,
          phase: br.state.currentPhase,
          playersAlive: br.state.playersAlive,
          totalPlayers: br.state.totalPlayers
        };
      }
    }
    return null;
  }

  addKill(playerId: string): void {
    const world = (this as any).world as World;
    const br = world.getComponent<BattleRoyaleComponent>(playerId, 'BattleRoyaleComponent');
    if (br) {
      br.kills++;
    }
  }

  addDamage(playerId: string, damage: number): void {
    const world = (this as any).world as World;
    const br = world.getComponent<BattleRoyaleComponent>(playerId, 'BattleRoyaleComponent');
    if (br) {
      br.damageDealt += damage;
    }
  }
}