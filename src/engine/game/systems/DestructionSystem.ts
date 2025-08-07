import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { RenderComponent } from '@/engine/core/ecs/components/RenderComponent';
import { PhysicsComponent } from '@/engine/core/ecs/components/PhysicsComponent';
import { World } from '@/engine/core/ecs/World';
import { Vector3 } from '@/engine/core/math';
import * as THREE from 'three';

export interface DestructibleData {
  health: number;
  maxHealth: number;
  fracturePoints: number;
  debrisCount: number;
  debrisSize: number;
  destroyed: boolean;
}

export class DestructibleComponent {
  data: DestructibleData;
  originalMesh: THREE.Mesh | null = null;
  fractureMeshes: THREE.Mesh[] = [];

  constructor(health: number = 100, fracturePoints: number = 8, debrisCount: number = 5) {
    this.data = {
      health,
      maxHealth: health,
      fracturePoints,
      debrisCount,
      debrisSize: 0.5,
      destroyed: false,
    };
  }

  takeDamage(damage: number): boolean {
    this.data.health -= damage;
    if (this.data.health <= 0 && !this.data.destroyed) {
      this.data.destroyed = true;
      return true; // Destroyed
    }
    return false; // Still alive
  }

  toJSON() {
    return {
      health: this.data.health,
      maxHealth: this.data.maxHealth,
      fracturePoints: this.data.fracturePoints,
      debrisCount: this.data.debrisCount,
      debrisSize: this.data.debrisSize,
      destroyed: this.data.destroyed,
    };
  }

  fromJSON(json: any) {
    this.data = { ...this.data, ...json };
  }
}

export class DestructionSystem extends System {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    super('DestructionSystem', 'normal', { all: ['TransformComponent', 'DestructibleComponent'] });
    this.scene = scene;
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;

    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const destructible = world.getComponent<DestructibleComponent>(entityId, 'DestructibleComponent');
      
      if (!transform || !destructible || !destructible.data.destroyed) continue;

      // Handle destruction
      this.handleDestruction(entityId, transform, destructible, world);
    }
  }

  private handleDestruction(entityId: string, transform: TransformComponent, destructible: DestructibleComponent, world: World): void {
    // Create debris
    this.createDebris(transform.position, destructible);

    // Remove original entity
    world.destroyEntity(entityId);
  }

  private createDebris(position: Vector3, destructible: DestructibleComponent): void {
    const debrisCount = destructible.data.debrisCount;
    const debrisSize = destructible.data.debrisSize;

    for (let i = 0; i < debrisCount; i++) {
      // Create debris entity
      const world = (this as any).world as World;
      const debris = world.createEntity(`Debris_${i}`);

      // Add transform component
      const debrisTransform = new TransformComponent();
      debrisTransform.position.copy(position);
      debrisTransform.position.add(new Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ));
      debrisTransform.scale.set(debrisSize, debrisSize, debrisSize);
      world.addComponent(debris.id, debrisTransform);

      // Add render component
      const debrisRender = new RenderComponent();
      debrisRender.meshType = 'cube';
      debrisRender.color = 0x8B4513; // Brown color for debris
      world.addComponent(debris.id, debrisRender);

      // Add physics component with random velocity
      const debrisPhysics = new PhysicsComponent();
      debrisPhysics.velocity = new Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 10
      );
      debrisPhysics.mass = 0.5;
      debrisPhysics.restitution = 0.3;
      debrisPhysics.friction = 0.8;
      world.addComponent(debris.id, debrisPhysics);
    }
  }

  // Public method to trigger destruction from other systems
  triggerDestruction(entityId: string, damage: number): boolean {
    const world = (this as any).world as World;
    const destructible = world.getComponent<DestructibleComponent>(entityId, 'DestructibleComponent');
    
    if (!destructible) return false;

    return destructible.takeDamage(damage);
  }

  // Create destructible object
  createDestructibleObject(position: Vector3, size: Vector3, health: number = 100): string {
    const world = (this as any).world as World;
    const destructible = world.createEntity('Destructible');

    // Add transform
    const transform = new TransformComponent();
    transform.position.copy(position);
    transform.scale.copy(size);
    world.addComponent(destructible.id, transform);

    // Add render component
    const render = new RenderComponent();
    render.meshType = 'cube';
    render.color = 0x654321; // Dark brown
    world.addComponent(destructible.id, render);

    // Add physics component
    const physics = new PhysicsComponent();
    physics.isStatic = true;
    world.addComponent(destructible.id, physics);

    // Add destructible component
    const destructibleComp = new DestructibleComponent(health);
    world.addComponent(destructible.id, destructibleComp);

    return destructible.id;
  }

  // Create destructible wall
  createDestructibleWall(startPos: Vector3, endPos: Vector3, height: number = 3, health: number = 150): string[] {
    const wallIds: string[] = [];
    const segmentCount = 5;
    const direction = endPos.clone().sub(startPos);
    const segmentLength = direction.length() / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const segmentPos = startPos.clone().add(direction.clone().scale(i / segmentCount));
      const segmentSize = new Vector3(segmentLength * 0.8, height, 0.5);
      
      const wallId = this.createDestructibleObject(segmentPos, segmentSize, health);
      wallIds.push(wallId);
    }

    return wallIds;
  }

  // Create destructible building
  createDestructibleBuilding(position: Vector3, size: Vector3, health: number = 300): string[] {
    const buildingIds: string[] = [];
    const floors = 3;
    const floorHeight = size.y / floors;

    for (let floor = 0; floor < floors; floor++) {
      const floorPos = position.clone();
      floorPos.y += floor * floorHeight;
      
      const floorSize = new Vector3(size.x, floorHeight, size.z);
      const floorId = this.createDestructibleObject(floorPos, floorSize, health / floors);
      buildingIds.push(floorId);
    }

    return buildingIds;
  }
}