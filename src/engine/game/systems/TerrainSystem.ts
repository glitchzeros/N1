import { System } from '@/engine/core/ecs/System';
import { RenderComponent } from '@/engine/core/ecs/components/RenderComponent';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { World } from '@/engine/core/ecs/World';
import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

export class TerrainSystem extends System {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private width: number;
  private depth: number;
  private scale: number;
  private simplex: SimplexNoise;

  constructor(scene: THREE.Scene, width = 64, depth = 64, scale = 8) {
    super('TerrainSystem', 'normal', { all: [] });
    this.scene = scene;
    this.width = width;
    this.depth = depth;
    this.scale = scale;
    this.simplex = new SimplexNoise();
    this.generateTerrain();
  }

  private generateTerrain() {
    const geometry = new THREE.PlaneGeometry(this.width, this.depth, this.width - 1, this.depth - 1);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i) / this.scale;
      const z = vertices.getZ(i) / this.scale;
      const y = this.simplex.noise2D(x, z) * 2;
      vertices.setY(i, y);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  protected onUpdate(deltaTime: number): void {
    // Terrain is static for now
  }
}