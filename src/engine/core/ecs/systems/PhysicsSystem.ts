import { System } from '../System';
import { TransformComponent } from '../components/TransformComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { World } from '../World';

export class PhysicsSystem extends System {
  private gravity = -9.81;

  constructor() {
    super('PhysicsSystem', 'high', { all: ['TransformComponent', 'PhysicsComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const physics = world.getComponent<PhysicsComponent>(entityId, 'PhysicsComponent');
      if (!transform || !physics || physics.isStatic) continue;

      // Apply gravity
      physics.acceleration.y = this.gravity;

      // Integrate velocity
      physics.velocity.x += physics.acceleration.x * deltaTime;
      physics.velocity.y += physics.acceleration.y * deltaTime;
      physics.velocity.z += physics.acceleration.z * deltaTime;

      // Integrate position (CCD: check for ground contact)
      const nextY = transform.position.y + physics.velocity.y * deltaTime;
      if (nextY < 0) {
        transform.position.y = 0;
        physics.velocity.y = 0;
      } else {
        transform.position.x += physics.velocity.x * deltaTime;
        transform.position.y = nextY;
        transform.position.z += physics.velocity.z * deltaTime;
      }

      // Simple friction
      physics.velocity.x *= 0.98;
      physics.velocity.z *= 0.98;
    }
  }
}