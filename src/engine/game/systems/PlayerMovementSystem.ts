import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { InputComponent } from '@/engine/core/ecs/components/InputComponent';
import { PhysicsComponent } from '@/engine/core/ecs/components/PhysicsComponent';
import { World } from '@/engine/core/ecs/World';
import { Vector3, Quaternion } from '@/engine/core/math';

export class PlayerMovementSystem extends System {
  private moveSpeed: number = 5;
  private sprintSpeed: number = 8;
  private jumpForce: number = 8;
  private mouseSensitivity: number = 0.002;

  constructor() {
    super('PlayerMovementSystem', 'high', { all: ['TransformComponent', 'InputComponent', 'PhysicsComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;

    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const input = world.getComponent<InputComponent>(entityId, 'InputComponent');
      const physics = world.getComponent<PhysicsComponent>(entityId, 'PhysicsComponent');
      
      if (!transform || !input || !physics) continue;

      // Handle movement
      this.handleMovement(transform, input, physics, deltaTime);
      
      // Handle rotation (mouse look)
      this.handleRotation(transform, input);
      
      // Handle jumping
      this.handleJump(physics, input);
    }
  }

  private handleMovement(transform: TransformComponent, input: InputComponent, physics: PhysicsComponent, deltaTime: number): void {
    const speed = input.state.sprint ? this.sprintSpeed : this.moveSpeed;
    
    // Calculate movement direction
    const moveDirection = new Vector3();
    
    if (input.state.forward) moveDirection.z -= 1;
    if (input.state.backward) moveDirection.z += 1;
    if (input.state.left) moveDirection.x -= 1;
    if (input.state.right) moveDirection.x += 1;
    
    // Normalize movement direction
    if (!moveDirection.isZero()) {
      moveDirection.normalize();
      
      // Apply rotation to movement direction
      const rotatedDirection = transform.rotation.rotateVector(moveDirection);
      
      // Set velocity
      physics.velocity.x = rotatedDirection.x * speed;
      physics.velocity.z = rotatedDirection.z * speed;
    } else {
      // Apply friction when not moving
      physics.velocity.x *= 0.9;
      physics.velocity.z *= 0.9;
    }
  }

  private handleRotation(transform: TransformComponent, input: InputComponent): void {
    // Update rotation based on mouse input
    if (Math.abs(input.state.lookX) > 0.001) {
      transform.rotation.rotateY(input.state.lookX);
      input.state.lookX = 0; // Reset after applying
    }
  }

  private handleJump(physics: PhysicsComponent, input: InputComponent): void {
    // Simple jump implementation - check if on ground and apply upward force
    if (input.state.jump && physics.velocity.y === 0) {
      physics.velocity.y = this.jumpForce;
    }
  }
}