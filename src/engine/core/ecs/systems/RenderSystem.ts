import { System } from '../System';
import { RenderComponent } from '../components/RenderComponent';
import { TransformComponent } from '../components/TransformComponent';
import { World } from '../World';
import * as THREE from 'three';

export class RenderSystem extends System {
  private scene: THREE.Scene;
  private cubeMesh: THREE.InstancedMesh;
  private maxInstances: number = 1000;
  private instanceMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(scene: THREE.Scene) {
    super('RenderSystem', 'normal', { all: ['TransformComponent', 'RenderComponent'] });
    this.scene = scene;
    // Create instanced mesh for cubes
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    this.cubeMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
    this.cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.cubeMesh);
  }

  protected onUpdate(deltaTime: number): void {
    // Update instanced mesh transforms
    let instanceId = 0;
    this.cubeMesh.count = 0;
    for (const entityId of this.entities) {
      if (instanceId >= this.maxInstances) break;
      // Get components
      const world = (this as any).world as World;
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const render = world.getComponent<RenderComponent>(entityId, 'RenderComponent');
      if (!transform || !render || render.meshType !== 'cube' || !render.visible) continue;
      // Set instance matrix
      this.instanceMatrix.compose(
        new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z),
        new THREE.Quaternion(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w),
        new THREE.Vector3(transform.scale.x, transform.scale.y, transform.scale.z)
      );
      this.cubeMesh.setMatrixAt(instanceId, this.instanceMatrix);
      this.cubeMesh.setColorAt(instanceId, new THREE.Color(render.color));
      instanceId++;
    }
    this.cubeMesh.count = instanceId;
    this.cubeMesh.instanceMatrix.needsUpdate = true;
    if (this.cubeMesh.instanceColor) this.cubeMesh.instanceColor.needsUpdate = true;
  }
}