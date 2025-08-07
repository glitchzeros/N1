import { System } from '@/engine/core/ecs/System';
import { World } from '@/engine/core/ecs/World';

export class HealthComponent {
  currentHealth: number;
  maxHealth: number;
  isDead: boolean = false;
  lastDamageTime: number = 0;
  invulnerabilityTime: number = 500; // ms

  constructor(maxHealth: number = 100) {
    this.currentHealth = maxHealth;
    this.maxHealth = maxHealth;
  }

  takeDamage(damage: number): boolean {
    const currentTime = performance.now();
    
    // Check invulnerability
    if (currentTime - this.lastDamageTime < this.invulnerabilityTime) {
      return false;
    }

    this.currentHealth -= damage;
    this.lastDamageTime = currentTime;

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.isDead = true;
      return true; // Entity died
    }

    return false; // Entity still alive
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  revive(): void {
    this.currentHealth = this.maxHealth;
    this.isDead = false;
  }

  getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth;
  }

  toJSON() {
    return {
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      isDead: this.isDead,
      lastDamageTime: this.lastDamageTime,
      invulnerabilityTime: this.invulnerabilityTime,
    };
  }

  fromJSON(json: any) {
    this.currentHealth = json.currentHealth;
    this.maxHealth = json.maxHealth;
    this.isDead = json.isDead;
    this.lastDamageTime = json.lastDamageTime;
    this.invulnerabilityTime = json.invulnerabilityTime;
  }
}

export class HealthSystem extends System {
  constructor() {
    super('HealthSystem', 'normal', { all: ['HealthComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;

    for (const entityId of this.entities) {
      const health = world.getComponent<HealthComponent>(entityId, 'HealthComponent');
      if (!health) continue;

      // Handle death
      if (health.isDead) {
        this.handleDeath(entityId, health, world);
      }
    }
  }

  private handleDeath(entityId: string, health: HealthComponent, world: World): void {
    // Check if this is a player
    const entity = world.getEntity(entityId);
    if (entity && entity.name === 'Player') {
      // Player death - could trigger respawn or game over
      console.log('Player died!');
    } else {
      // AI death - destroy entity after a delay
      setTimeout(() => {
        if (world.hasEntity(entityId)) {
          world.destroyEntity(entityId);
        }
      }, 2000); // 2 second delay before cleanup
    }
  }
}