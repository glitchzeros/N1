import { World } from '@/engine/core/ecs';
import { Renderer, RendererConfig } from '@/engine/renderer/Renderer';
import { Vector3 } from '@/engine/core/math';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  targetFPS?: number;
  fixedTimeStep?: number;
  enableDebug?: boolean;
  enableProfiling?: boolean;
}

export interface EngineStats {
  fps: number;
  frameTime: number;
  deltaTime: number;
  fixedDeltaTime: number;
  worldStats: any;
  renderStats: any;
  memory: {
    total: number;
    used: number;
    available: number;
  };
}

export class Engine {
  private _config: EngineConfig;
  private _world: World;
  private _renderer: Renderer;
  private _isRunning: boolean;
  private _lastFrameTime: number;
  private _deltaTime: number;
  private _fixedDeltaTime: number;
  private _accumulator: number;
  private _frameCount: number;
  private _fps: number;
  private _stats: EngineStats;

  constructor(config: EngineConfig) {
    this._config = config;
    this._isRunning = false;
    this._lastFrameTime = 0;
    this._deltaTime = 0;
    this._fixedDeltaTime = config.fixedTimeStep ?? 1 / 60;
    this._accumulator = 0;
    this._frameCount = 0;
    this._fps = 0;

    // Initialize ECS world
    this._world = new World(this._fixedDeltaTime);

    // Initialize renderer
    const rendererConfig: RendererConfig = {
      canvas: config.canvas,
      width: config.width,
      height: config.height,
      antialias: true,
      powerPreference: 'high-performance',
    };
    this._renderer = new Renderer(rendererConfig);

    // Initialize stats
    this._stats = {
      fps: 0,
      frameTime: 0,
      deltaTime: 0,
      fixedDeltaTime: this._fixedDeltaTime,
      worldStats: {},
      renderStats: {},
      memory: {
        total: 0,
        used: 0,
        available: 0,
      },
    };

    // Enable debug mode if requested
    if (config.enableDebug) {
      this._renderer.enableDebugMode();
    }

    // Set up resize handler
    this._setupResizeHandler();
  }

  // Getters
  get world(): World { return this._world; }
  get renderer(): Renderer { return this._renderer; }
  get isRunning(): boolean { return this._isRunning; }
  get stats(): EngineStats { return this._stats; }
  get config(): EngineConfig { return this._config; }

  // Lifecycle methods
  start(): void {
    if (this._isRunning) {
      console.warn('Engine is already running');
      return;
    }

    this._isRunning = true;
    this._lastFrameTime = performance.now();
    this._gameLoop();
  }

  stop(): void {
    this._isRunning = false;
  }

  pause(): void {
    this._isRunning = false;
  }

  resume(): void {
    if (!this._isRunning) {
      this._isRunning = true;
      this._lastFrameTime = performance.now();
      this._gameLoop();
    }
  }

  // Game loop
  private _gameLoop(): void {
    if (!this._isRunning) return;

    const currentTime = performance.now();
    this._deltaTime = (currentTime - this._lastFrameTime) / 1000; // Convert to seconds
    this._lastFrameTime = currentTime;

    // Clamp delta time to prevent spiral of death
    const maxDeltaTime = 1 / 30; // 30 FPS minimum
    this._deltaTime = Math.min(this._deltaTime, maxDeltaTime);

    // Update world (ECS systems)
    this._world.update(this._deltaTime);

    // Fixed timestep updates
    this._accumulator += this._deltaTime;
    while (this._accumulator >= this._fixedDeltaTime) {
      // Fixed update systems are handled by the world
      this._accumulator -= this._fixedDeltaTime;
    }

    // Render
    this._renderer.render();

    // Update stats
    this._updateStats();

    // Continue loop
    if (this._config.targetFPS) {
      const targetFrameTime = 1000 / this._config.targetFPS;
      const elapsed = performance.now() - currentTime;
      const delay = Math.max(0, targetFrameTime - elapsed);
      
      setTimeout(() => {
        requestAnimationFrame(() => this._gameLoop());
      }, delay);
    } else {
      requestAnimationFrame(() => this._gameLoop());
    }
  }

  // World management
  createEntity(name = 'Entity') {
    return this._world.createEntity(name);
  }

  destroyEntity(entityId: string): boolean {
    return this._world.destroyEntity(entityId);
  }

  getEntity(entityId: string) {
    return this._world.getEntity(entityId);
  }

  // Component management
  addComponent<T>(entityId: string, component: T): boolean {
    return this._world.addComponent(entityId, component as any);
  }

  removeComponent(entityId: string, componentType: string): boolean {
    return this._world.removeComponent(entityId, componentType);
  }

  getComponent<T>(entityId: string, componentType: string): T | undefined {
    return this._world.getComponent(entityId, componentType) as T | undefined;
  }

  hasComponent(entityId: string, componentType: string): boolean {
    return this._world.hasComponent(entityId, componentType);
  }

  // System management
  addSystem(system: any): void {
    this._world.addSystem(system);
  }

  removeSystem(systemName: string): boolean {
    return this._world.removeSystem(systemName);
  }

  getSystem<T>(systemName: string): T | undefined {
    return this._world.getSystem(systemName) as T | undefined;
  }

  hasSystem(systemName: string): boolean {
    return this._world.hasSystem(systemName);
  }

  // Query methods
  query(query: { all?: string[]; any?: string[]; none?: string[] }): string[] {
    return this._world.query(query);
  }

  // Rendering
  setCameraPosition(position: Vector3): void {
    this._renderer.setCameraPosition(position);
  }

  setCameraTarget(target: Vector3): void {
    this._renderer.setCameraTarget(target);
  }

  addToScene(object: any): void {
    this._renderer.add(object);
  }

  removeFromScene(object: any): void {
    this._renderer.remove(object);
  }

  // Performance
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this._renderer.setQuality(quality);
  }

  // Resize handling
  resize(width: number, height: number): void {
    this._config.width = width;
    this._config.height = height;
    this._renderer.resize(width, height);
  }

  private _setupResizeHandler(): void {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  }

  // Stats and profiling
  private _updateStats(): void {
    this._frameCount++;
    
    // Update FPS every 60 frames
    if (this._frameCount % 60 === 0) {
      this._fps = 1 / this._deltaTime;
    }

    this._stats.fps = this._fps;
    this._stats.frameTime = this._deltaTime * 1000; // Convert to milliseconds
    this._stats.deltaTime = this._deltaTime;
    this._stats.worldStats = this._world.getStats();
    this._stats.renderStats = this._renderer.stats;

    // Update memory stats if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this._stats.memory = {
        total: memory.jsHeapSizeLimit,
        used: memory.usedJSHeapSize,
        available: memory.totalJSHeapSize,
      };
    }
  }

  getPerformanceReport(): {
    engine: EngineStats;
    systems: any[];
    entities: any[];
  } {
    const systems = Array.from(this._world['_systems'].values()).map(system => 
      system.getPerformanceReport()
    );

    const entities = Array.from(this._world['_entities'].values()).map(entity => ({
      id: entity.id,
      name: entity.name,
      active: entity.active,
      age: entity.getAge(),
      componentCount: this._world.getComponents(entity.id)?.size ?? 0,
    }));

    return {
      engine: this._stats,
      systems,
      entities,
    };
  }

  // Debug
  enableDebugMode(): void {
    this._renderer.enableDebugMode();
  }

  getDebugInfo(): {
    engine: {
      isRunning: boolean;
      frameCount: number;
      fps: number;
      deltaTime: number;
    };
    world: any;
    renderer: any;
  } {
    return {
      engine: {
        isRunning: this._isRunning,
        frameCount: this._frameCount,
        fps: this._fps,
        deltaTime: this._deltaTime,
      },
      world: this._world.getStats(),
      renderer: this._renderer.getDebugInfo(),
    };
  }

  // Cleanup
  dispose(): void {
    this.stop();
    this._world.clear();
    this._renderer.dispose();
  }
}