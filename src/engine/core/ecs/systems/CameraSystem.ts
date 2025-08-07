import { System } from '../System';
import { CameraComponent } from '../components/CameraComponent';
import { TransformComponent } from '../components/TransformComponent';
import { World } from '../World';
import { Vector3 } from '../../math';

export class CameraSystem extends System {
  private setCameraPosition: (pos: Vector3) => void;
  private setCameraTarget: (target: Vector3) => void;

  constructor(setCameraPosition: (pos: Vector3) => void, setCameraTarget: (target: Vector3) => void) {
    super('CameraSystem', 'high', { all: ['CameraComponent'] });
    this.setCameraPosition = setCameraPosition;
    this.setCameraTarget = setCameraTarget;
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    for (const entityId of this.entities) {
      const camera = world.getComponent<CameraComponent>(entityId, 'CameraComponent');
      if (!camera) continue;
      if (camera.mode === 'follow' && camera.targetEntityId) {
        const targetTransform = world.getComponent<TransformComponent>(camera.targetEntityId, 'TransformComponent');
        if (targetTransform) {
          const cameraPos = new Vector3(
            targetTransform.position.x + camera.offset.x,
            targetTransform.position.y + camera.offset.y,
            targetTransform.position.z + camera.offset.z
          );
          this.setCameraPosition(cameraPos);
          this.setCameraTarget(targetTransform.position);
        }
      }
      // Free/orbit modes can be implemented as needed
    }
  }
}