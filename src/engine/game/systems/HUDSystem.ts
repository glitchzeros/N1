import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { World } from '@/engine/core/ecs/World';

export interface HUDData {
  fps: number;
  frameTime: number;
  entityCount: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  playerHealth: number;
  playerAmmo: number;
  playerPosition: { x: number; y: number; z: number };
  gameTime: number;
  playersAlive: number;
  zoneRadius: number;
  zoneCenter: { x: number; y: number; z: number };
}

export class HUDComponent {
  data: HUDData;
  visible: boolean = true;
  updateInterval: number = 100; // ms
  lastUpdate: number = 0;

  constructor() {
    this.data = {
      fps: 0,
      frameTime: 0,
      entityCount: 0,
      drawCalls: 0,
      triangles: 0,
      memoryUsage: 0,
      playerHealth: 100,
      playerAmmo: 30,
      playerPosition: { x: 0, y: 0, z: 0 },
      gameTime: 0,
      playersAlive: 1,
      zoneRadius: 100,
      zoneCenter: { x: 0, y: 0, z: 0 },
    };
  }

  toJSON() {
    return {
      visible: this.visible,
      updateInterval: this.updateInterval,
      data: this.data,
    };
  }

  fromJSON(json: any) {
    this.visible = json.visible;
    this.updateInterval = json.updateInterval;
    this.data = { ...this.data, ...json.data };
  }
}

export class HUDSystem extends System {
  private hudElement: HTMLElement | null = null;
  private performanceElement: HTMLElement | null = null;
  private gameInfoElement: HTMLElement | null = null;
  private playerStatsElement: HTMLElement | null = null;

  constructor() {
    super('HUDSystem', 'low', { all: ['HUDComponent'] });
    this.initializeHUD();
  }

  private initializeHUD(): void {
    // Create HUD container
    this.hudElement = document.createElement('div');
    this.hudElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #00ff00;
      text-shadow: 1px 1px 1px #000;
    `;

    // Performance metrics (top-left)
    this.performanceElement = document.createElement('div');
    this.performanceElement.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 5px;
      pointer-events: auto;
    `;

    // Game info (top-right)
    this.gameInfoElement = document.createElement('div');
    this.gameInfoElement.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 5px;
      text-align: right;
    `;

    // Player stats (bottom-left)
    this.playerStatsElement = document.createElement('div');
    this.playerStatsElement.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 5px;
    `;

    // Crosshair (center)
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      border: 2px solid #00ff00;
      border-radius: 50%;
      pointer-events: none;
    `;

    // Assemble HUD
    this.hudElement.appendChild(this.performanceElement);
    this.hudElement.appendChild(this.gameInfoElement);
    this.hudElement.appendChild(this.playerStatsElement);
    this.hudElement.appendChild(crosshair);

    // Add to document
    document.body.appendChild(this.hudElement);
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    const currentTime = performance.now();

    for (const entityId of this.entities) {
      const hud = world.getComponent<HUDComponent>(entityId, 'HUDComponent');
      if (!hud || !hud.visible) continue;

      // Update HUD data
      if (currentTime - hud.lastUpdate >= hud.updateInterval) {
        this.updateHUDData(entityId, hud, world);
        this.renderHUD(hud);
        hud.lastUpdate = currentTime;
      }
    }
  }

  private updateHUDData(entityId: string, hud: HUDComponent, world: World): void {
    // Get engine stats
    const engine = (world as any).engine;
    if (engine) {
      const stats = engine.stats;
      hud.data.fps = Math.round(stats.fps);
      hud.data.frameTime = Math.round(stats.frameTime);
      hud.data.entityCount = stats.worldStats.entityCount || 0;
      hud.data.drawCalls = stats.renderStats.drawCalls || 0;
      hud.data.triangles = stats.renderStats.triangles || 0;
      hud.data.memoryUsage = Math.round((stats.memory.used || 0) / 1024 / 1024);
    }

    // Get player stats
    const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
    if (transform) {
      hud.data.playerPosition = {
        x: Math.round(transform.position.x * 100) / 100,
        y: Math.round(transform.position.y * 100) / 100,
        z: Math.round(transform.position.z * 100) / 100,
      };
    }

    // Update game time
    hud.data.gameTime += hud.updateInterval;

    // Count alive players
    const allPlayers = world.query({ all: ['TransformComponent'] });
    hud.data.playersAlive = allPlayers.length;
  }

  private renderHUD(hud: HUDComponent): void {
    if (!this.performanceElement || !this.gameInfoElement || !this.playerStatsElement) return;

    // Performance metrics
    this.performanceElement.innerHTML = `
      <div><strong>Performance</strong></div>
      <div>FPS: ${hud.data.fps}</div>
      <div>Frame: ${hud.data.frameTime}ms</div>
      <div>Entities: ${hud.data.entityCount}</div>
      <div>Draw Calls: ${hud.data.drawCalls}</div>
      <div>Triangles: ${hud.data.triangles}</div>
      <div>Memory: ${hud.data.memoryUsage}MB</div>
    `;

    // Game info
    this.gameInfoElement.innerHTML = `
      <div><strong>Game Info</strong></div>
      <div>Time: ${Math.floor(hud.data.gameTime / 1000)}s</div>
      <div>Players: ${hud.data.playersAlive}</div>
      <div>Zone: ${hud.data.zoneRadius}m</div>
    `;

    // Player stats
    this.playerStatsElement.innerHTML = `
      <div><strong>Player</strong></div>
      <div>Health: ${hud.data.playerHealth}</div>
      <div>Ammo: ${hud.data.playerAmmo}</div>
      <div>Pos: (${hud.data.playerPosition.x}, ${hud.data.playerPosition.y}, ${hud.data.playerPosition.z})</div>
    `;
  }

  // Public methods for external updates
  updatePlayerHealth(health: number): void {
    for (const entityId of this.entities) {
      const hud = (this as any).world.getComponent<HUDComponent>(entityId, 'HUDComponent');
      if (hud) {
        hud.data.playerHealth = health;
      }
    }
  }

  updatePlayerAmmo(ammo: number): void {
    for (const entityId of this.entities) {
      const hud = (this as any).world.getComponent<HUDComponent>(entityId, 'HUDComponent');
      if (hud) {
        hud.data.playerAmmo = ammo;
      }
    }
  }

  updateZoneInfo(radius: number, center: { x: number; y: number; z: number }): void {
    for (const entityId of this.entities) {
      const hud = (this as any).world.getComponent<HUDComponent>(entityId, 'HUDComponent');
      if (hud) {
        hud.data.zoneRadius = radius;
        hud.data.zoneCenter = center;
      }
    }
  }

  setHUDVisible(visible: boolean): void {
    if (this.hudElement) {
      this.hudElement.style.display = visible ? 'block' : 'none';
    }
  }

  destroy(): void {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }
}