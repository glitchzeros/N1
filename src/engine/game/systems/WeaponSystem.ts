import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { InputComponent } from '@/engine/core/ecs/components/InputComponent';
import { World } from '@/engine/core/ecs/World';
import { Vector3 } from '@/engine/core/math';
import { RenderComponent } from '@/engine/core/ecs/components/RenderComponent';
import { PhysicsComponent } from '@/engine/core/ecs/components/PhysicsComponent';
import { CollisionComponent } from './CollisionSystem';

export type WeaponType = 'pistol' | 'rifle' | 'shotgun' | 'sniper' | 'smg' | 'lmg';

export interface WeaponStats {
  damage: number;
  fireRate: number; // rounds per second
  range: number;
  accuracy: number; // 0-1
  reloadTime: number;
  magazineSize: number;
  projectileSpeed: number;
  spread: number; // degrees
}

export class WeaponComponent {
  type: WeaponType = 'pistol';
  stats: WeaponStats;
  currentAmmo: number;
  totalAmmo: number;
  lastFireTime: number = 0;
  isReloading: boolean = false;
  reloadStartTime: number = 0;

  constructor(type: WeaponType) {
    this.type = type;
    this.stats = this.getWeaponStats(type);
    this.currentAmmo = this.stats.magazineSize;
    this.totalAmmo = this.stats.magazineSize * 3;
  }

  private getWeaponStats(type: WeaponType): WeaponStats {
    switch (type) {
      case 'pistol':
        return { damage: 25, fireRate: 2, range: 50, accuracy: 0.8, reloadTime: 1.5, magazineSize: 12, projectileSpeed: 300, spread: 2 };
      case 'rifle':
        return { damage: 35, fireRate: 8, range: 100, accuracy: 0.9, reloadTime: 2.0, magazineSize: 30, projectileSpeed: 400, spread: 1 };
      case 'shotgun':
        return { damage: 15, fireRate: 1, range: 20, accuracy: 0.6, reloadTime: 3.0, magazineSize: 8, projectileSpeed: 200, spread: 15 };
      case 'sniper':
        return { damage: 100, fireRate: 0.5, range: 200, accuracy: 0.95, reloadTime: 2.5, magazineSize: 5, projectileSpeed: 600, spread: 0.5 };
      case 'smg':
        return { damage: 20, fireRate: 12, range: 60, accuracy: 0.7, reloadTime: 1.8, magazineSize: 25, projectileSpeed: 350, spread: 3 };
      case 'lmg':
        return { damage: 30, fireRate: 10, range: 120, accuracy: 0.6, reloadTime: 4.0, magazineSize: 100, projectileSpeed: 450, spread: 4 };
      default:
        return { damage: 25, fireRate: 2, range: 50, accuracy: 0.8, reloadTime: 1.5, magazineSize: 12, projectileSpeed: 300, spread: 2 };
    }
  }

  canFire(currentTime: number): boolean {
    return !this.isReloading && 
           this.currentAmmo > 0 && 
           currentTime - this.lastFireTime >= 1000 / this.stats.fireRate;
  }

  fire(currentTime: number): boolean {
    if (!this.canFire(currentTime)) return false;
    
    this.currentAmmo--;
    this.lastFireTime = currentTime;
    
    if (this.currentAmmo === 0) {
      this.startReload(currentTime);
    }
    
    return true;
  }

  startReload(currentTime: number): void {
    if (this.isReloading || this.currentAmmo === this.stats.magazineSize) return;
    this.isReloading = true;
    this.reloadStartTime = currentTime;
  }

  updateReload(currentTime: number): void {
    if (!this.isReloading) return;
    
    if (currentTime - this.reloadStartTime >= this.stats.reloadTime * 1000) {
      const ammoNeeded = this.stats.magazineSize - this.currentAmmo;
      const ammoToAdd = Math.min(ammoNeeded, this.totalAmmo);
      this.currentAmmo += ammoToAdd;
      this.totalAmmo -= ammoToAdd;
      this.isReloading = false;
    }
  }
}

export class WeaponSystem extends System {
  constructor() {
    super('WeaponSystem', 'normal', { all: ['TransformComponent', 'InputComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    const currentTime = performance.now();

    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const input = world.getComponent<InputComponent>(entityId, 'InputComponent');
      const weapon = world.getComponent<WeaponComponent>(entityId, 'WeaponComponent');
      
      if (!transform || !input || !weapon) continue;

      // Handle reload
      if (input.state.reload) {
        weapon.startReload(currentTime);
      }

      // Update reload state
      weapon.updateReload(currentTime);

      // Handle firing
      if (input.state.fire && weapon.canFire(currentTime)) {
        this.fireWeapon(entityId, transform, weapon, currentTime, world);
      }
    }
  }

  private fireWeapon(entityId: string, transform: TransformComponent, weapon: WeaponComponent, currentTime: number, world: World): void {
    if (!weapon.fire(currentTime)) return;

    // Create projectile entity
    const projectile = world.createEntity('Projectile');
    
    // Add projectile components
    const projTransform = new TransformComponent();
    projTransform.position.copy(transform.position);
    projTransform.position.y += 1.5; // Eye level
    world.addComponent(projectile.id, projTransform);

    const projRender = new RenderComponent();
    projRender.meshType = 'sphere';
    projRender.color = 0xffff00;
    world.addComponent(projectile.id, projRender);

    const projPhysics = new PhysicsComponent();
    // Calculate direction based on player rotation
    const direction = new Vector3(0, 0, -1); // Forward direction
    const rotatedDirection = transform.rotation.rotateVector(direction);
    projPhysics.velocity = rotatedDirection.scale(weapon.stats.projectileSpeed);
    world.addComponent(projectile.id, projPhysics);

    // Add collision component for projectile
    const projCollision = new CollisionComponent(0.1, true, weapon.stats.damage);
    world.addComponent(projectile.id, projCollision);

    // Play weapon sound
    const audio = world.getComponent<any>(entityId, 'AudioComponent');
    if (audio) {
      audio.play(`${weapon.type}_fire`, {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z
      });
    }
  }
}