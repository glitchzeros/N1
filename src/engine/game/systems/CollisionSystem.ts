import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { PhysicsComponent } from '@/engine/core/ecs/components/PhysicsComponent';
import { World } from '@/engine/core/ecs/World';
import { Vector3 } from '@/engine/core/math';

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  position: Vector3;
  normal: Vector3;
}

export class CollisionComponent {
  radius: number = 0.5;
  isProjectile: boolean = false;
  damage: number = 25;
  lifetime: number = 5000; // ms
  createdAt: number = performance.now();

  constructor(radius: number = 0.5, isProjectile: boolean = false, damage: number = 25) {
    this.radius = radius;
    this.isProjectile = isProjectile;
    this.damage = damage;
    this.createdAt = performance.now();
  }

  toJSON() {
    return {
      radius: this.radius,
      isProjectile: this.isProjectile,
      damage: this.damage,
      lifetime: this.lifetime,
      createdAt: this.createdAt,
    };
  }

  fromJSON(json: any) {
    this.radius = json.radius;
    this.isProjectile = json.isProjectile;
    this.damage = json.damage;
    this.lifetime = json.lifetime;
    this.createdAt = json.createdAt;
  }
}

export class CollisionSystem extends System {
  constructor() {
    super('CollisionSystem', 'high', { all: ['TransformComponent', 'CollisionComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    const currentTime = performance.now();

    // Get all entities with collision components
    const entities = Array.from(this.entities);
    
    // Check for collisions
    for (let i = 0; i < entities.length; i++) {
      const entityA = entities[i];
      const transformA = world.getComponent<TransformComponent>(entityA, 'TransformComponent');
      const collisionA = world.getComponent<CollisionComponent>(entityA, 'CollisionComponent');
      
      if (!transformA || !collisionA) continue;

      // Check projectile lifetime
      if (collisionA.isProjectile && currentTime - collisionA.createdAt > collisionA.lifetime) {
        world.destroyEntity(entityA);
        continue;
      }

      for (let j = i + 1; j < entities.length; j++) {
        const entityB = entities[j];
        const transformB = world.getComponent<TransformComponent>(entityB, 'TransformComponent');
        const collisionB = world.getComponent<CollisionComponent>(entityB, 'CollisionComponent');
        
        if (!transformB || !collisionB) continue;

        // Check collision
        const distance = transformA.position.distance(transformB.position);
        const collisionDistance = collisionA.radius + collisionB.radius;

        if (distance < collisionDistance) {
          this.handleCollision(entityA, entityB, transformA, transformB, collisionA, collisionB, world);
        }
      }
    }
  }

  private handleCollision(
    entityA: string, 
    entityB: string, 
    transformA: TransformComponent, 
    transformB: TransformComponent,
    collisionA: CollisionComponent,
    collisionB: CollisionComponent,
    world: World
  ): void {
    // Handle projectile collisions
    if (collisionA.isProjectile && !collisionB.isProjectile) {
      this.handleProjectileHit(entityA, entityB, collisionA, world);
    } else if (collisionB.isProjectile && !collisionA.isProjectile) {
      this.handleProjectileHit(entityB, entityA, collisionB, world);
    }
  }

  private handleProjectileHit(projectileId: string, targetId: string, projectileCollision: CollisionComponent, world: World): void {
    // Check if target is destructible
    const destructible = world.getComponent<any>(targetId, 'DestructibleComponent');
    if (destructible) {
      // Damage the destructible object
      const destructionSystem = world.getSystem<any>('DestructionSystem');
      if (destructionSystem) {
        destructionSystem.triggerDestruction(targetId, projectileCollision.damage);
      }
    }

    // Check if target has health component (for player/AI damage)
    const health = world.getComponent<any>(targetId, 'HealthComponent');
    if (health) {
      health.takeDamage(projectileCollision.damage);
    }

    // Destroy projectile
    world.destroyEntity(projectileId);
  }
}