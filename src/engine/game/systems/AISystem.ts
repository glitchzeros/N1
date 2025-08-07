import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { InputComponent } from '@/engine/core/ecs/components/InputComponent';
import { PhysicsComponent } from '@/engine/core/ecs/components/PhysicsComponent';
import { World } from '@/engine/core/ecs/World';
import { Vector3 } from '@/engine/core/math';

export type AIState = 'patrol' | 'search' | 'combat' | 'retreat' | 'loot';

export interface AIPerception {
  nearestEnemy: string | null;
  nearestEnemyDistance: number;
  nearestEnemyDirection: Vector3;
  nearestLoot: string | null;
  nearestLootDistance: number;
  health: number;
  ammo: number;
  isUnderFire: boolean;
  lastKnownEnemyPosition: Vector3 | null;
}

export class AIComponent {
  state: AIState = 'patrol';
  perception: AIPerception;
  reactionTime: number = 200; // ms
  accuracy: number = 0.7; // 0-1
  aggression: number = 0.8; // 0-1
  lastDecisionTime: number = 0;
  patrolPoints: Vector3[] = [];
  currentPatrolIndex: number = 0;
  searchTimeout: number = 0;
  combatTimeout: number = 0;

  constructor() {
    this.perception = {
      nearestEnemy: null,
      nearestEnemyDistance: Infinity,
      nearestEnemyDirection: new Vector3(),
      nearestLoot: null,
      nearestLootDistance: Infinity,
      health: 100,
      ammo: 30,
      isUnderFire: false,
      lastKnownEnemyPosition: null,
    };
  }

  toJSON() {
    return {
      state: this.state,
      reactionTime: this.reactionTime,
      accuracy: this.accuracy,
      aggression: this.aggression,
      lastDecisionTime: this.lastDecisionTime,
      currentPatrolIndex: this.currentPatrolIndex,
      searchTimeout: this.searchTimeout,
      combatTimeout: this.combatTimeout,
    };
  }

  fromJSON(json: any) {
    this.state = json.state;
    this.reactionTime = json.reactionTime;
    this.accuracy = json.accuracy;
    this.aggression = json.aggression;
    this.lastDecisionTime = json.lastDecisionTime;
    this.currentPatrolIndex = json.currentPatrolIndex;
    this.searchTimeout = json.searchTimeout;
    this.combatTimeout = json.combatTimeout;
  }
}

export class AISystem extends System {
  constructor() {
    super('AISystem', 'normal', { all: ['TransformComponent', 'AIComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    const currentTime = performance.now();

    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const ai = world.getComponent<AIComponent>(entityId, 'AIComponent');
      const input = world.getComponent<InputComponent>(entityId, 'InputComponent');
      
      if (!transform || !ai || !input) continue;

      // Update perception
      this.updatePerception(entityId, transform, ai, world);

      // Make decisions
      if (currentTime - ai.lastDecisionTime >= ai.reactionTime) {
        this.makeDecision(entityId, transform, ai, input, currentTime);
        ai.lastDecisionTime = currentTime;
      }

      // Execute current behavior
      this.executeBehavior(entityId, transform, ai, input, deltaTime);
    }
  }

  private updatePerception(entityId: string, transform: TransformComponent, ai: AIComponent, world: World): void {
    // Find nearest enemy
    const allEntities = world.query({ all: ['TransformComponent'] });
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    for (const otherId of allEntities) {
      if (otherId === entityId) continue;
      
      const otherTransform = world.getComponent<TransformComponent>(otherId, 'TransformComponent');
      if (!otherTransform) continue;

      const distance = transform.position.distance(otherTransform.position);
      if (distance < nearestDistance && distance < 50) { // Detection range
        nearestEnemy = otherId;
        nearestDistance = distance;
        ai.perception.nearestEnemyDirection = otherTransform.position.clone().sub(transform.position).normalize();
      }
    }

    ai.perception.nearestEnemy = nearestEnemy;
    ai.perception.nearestEnemyDistance = nearestDistance;

    // Update last known position
    if (nearestEnemy) {
      const enemyTransform = world.getComponent<TransformComponent>(nearestEnemy, 'TransformComponent');
      if (enemyTransform) {
        ai.perception.lastKnownEnemyPosition = enemyTransform.position.clone();
      }
    }
  }

  private makeDecision(entityId: string, transform: TransformComponent, ai: AIComponent, input: InputComponent, currentTime: number): void {
    const prevState = ai.state;

    // State machine logic
    if (ai.perception.nearestEnemy && ai.perception.nearestEnemyDistance < 10) {
      // Enemy very close - combat or retreat
      if (ai.perception.health > 30 && ai.aggression > 0.5) {
        ai.state = 'combat';
        ai.combatTimeout = currentTime + 5000; // 5 seconds of combat
      } else {
        ai.state = 'retreat';
      }
    } else if (ai.perception.nearestEnemy && ai.perception.nearestEnemyDistance < 30) {
      // Enemy detected - search or combat
      if (ai.aggression > 0.7) {
        ai.state = 'combat';
        ai.combatTimeout = currentTime + 3000;
      } else {
        ai.state = 'search';
        ai.searchTimeout = currentTime + 10000; // 10 seconds of searching
      }
    } else if (ai.state === 'search' && currentTime > ai.searchTimeout) {
      // Search timeout - return to patrol
      ai.state = 'patrol';
    } else if (ai.state === 'combat' && currentTime > ai.combatTimeout) {
      // Combat timeout - search for enemy
      ai.state = 'search';
      ai.searchTimeout = currentTime + 8000;
    } else if (ai.state === 'retreat' && ai.perception.health > 50) {
      // Health recovered - return to patrol
      ai.state = 'patrol';
    } else if (ai.state === 'patrol' && ai.perception.nearestLoot && ai.perception.nearestLootDistance < 5) {
      // Loot nearby - loot it
      ai.state = 'loot';
    }

    // Initialize patrol points if needed
    if (ai.state === 'patrol' && ai.patrolPoints.length === 0) {
      this.initializePatrolPoints(transform, ai);
    }
  }

  private executeBehavior(entityId: string, transform: TransformComponent, ai: AIComponent, input: InputComponent, deltaTime: number): void {
    // Clear previous input
    Object.keys(input.state).forEach(key => {
      if (typeof input.state[key] === 'boolean') {
        input.state[key] = false;
      }
    });

    switch (ai.state) {
      case 'patrol':
        this.executePatrol(transform, ai, input);
        break;
      case 'search':
        this.executeSearch(transform, ai, input);
        break;
      case 'combat':
        this.executeCombat(transform, ai, input);
        break;
      case 'retreat':
        this.executeRetreat(transform, ai, input);
        break;
      case 'loot':
        this.executeLoot(transform, ai, input);
        break;
    }
  }

  private executePatrol(transform: TransformComponent, ai: AIComponent, input: InputComponent): void {
    if (ai.patrolPoints.length === 0) return;

    const targetPoint = ai.patrolPoints[ai.currentPatrolIndex];
    const direction = targetPoint.clone().sub(transform.position);
    const distance = direction.length();

    if (distance < 2) {
      // Reached patrol point, move to next
      ai.currentPatrolIndex = (ai.currentPatrolIndex + 1) % ai.patrolPoints.length;
    } else {
      // Move towards patrol point
      direction.normalize();
      if (direction.x > 0.1) input.state.right = true;
      if (direction.x < -0.1) input.state.left = true;
      if (direction.z > 0.1) input.state.down = true;
      if (direction.z < -0.1) input.state.up = true;
    }
  }

  private executeSearch(transform: TransformComponent, ai: AIComponent, input: InputComponent): void {
    if (ai.perception.lastKnownEnemyPosition) {
      const direction = ai.perception.lastKnownEnemyPosition.clone().sub(transform.position);
      const distance = direction.length();

      if (distance > 1) {
        direction.normalize();
        if (direction.x > 0.1) input.state.right = true;
        if (direction.x < -0.1) input.state.left = true;
        if (direction.z > 0.1) input.state.down = true;
        if (direction.z < -0.1) input.state.up = true;
      }
    }
  }

  private executeCombat(transform: TransformComponent, ai: AIComponent, input: InputComponent): void {
    if (ai.perception.nearestEnemyDirection) {
      // Face enemy
      const direction = ai.perception.nearestEnemyDirection;
      if (direction.x > 0.1) input.state.right = true;
      if (direction.x < -0.1) input.state.left = true;
      if (direction.z > 0.1) input.state.down = true;
      if (direction.z < -0.1) input.state.up = true;

      // Fire at enemy (with accuracy)
      if (Math.random() < ai.accuracy) {
        input.state.fire = true;
      }

      // Strafe randomly
      if (Math.random() < 0.3) {
        input.state.left = !input.state.left;
        input.state.right = !input.state.right;
      }
    }
  }

  private executeRetreat(transform: TransformComponent, ai: AIComponent, input: InputComponent): void {
    // Move away from last known enemy position
    if (ai.perception.lastKnownEnemyPosition) {
      const direction = transform.position.clone().sub(ai.perception.lastKnownEnemyPosition);
      direction.normalize();
      
      if (direction.x > 0.1) input.state.right = true;
      if (direction.x < -0.1) input.state.left = true;
      if (direction.z > 0.1) input.state.down = true;
      if (direction.z < -0.1) input.state.up = true;
      
      input.state.sprint = true;
    }
  }

  private executeLoot(transform: TransformComponent, ai: AIComponent, input: InputComponent): void {
    // Simple loot behavior - just stand still for a moment
    // In a full implementation, this would interact with loot items
  }

  private initializePatrolPoints(transform: TransformComponent, ai: AIComponent): void {
    // Create patrol points around current position
    const center = transform.position.clone();
    const radius = 10;
    
    ai.patrolPoints = [
      center.clone().add(new Vector3(radius, 0, 0)),
      center.clone().add(new Vector3(0, 0, radius)),
      center.clone().add(new Vector3(-radius, 0, 0)),
      center.clone().add(new Vector3(0, 0, -radius)),
    ];
  }
}