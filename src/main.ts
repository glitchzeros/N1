import { Engine, EngineConfig } from '@/engine/Engine';
import { Vector3 } from '@/engine/core/math';
import { TransformComponent, RenderComponent, InputComponent, PhysicsComponent, CameraComponent } from '@/engine/core/ecs/components';
import { TransformSystem, RenderSystem, InputSystem, PhysicsSystem, CameraSystem } from '@/engine/core/ecs/systems';
import { TerrainSystem } from '@/engine/game/systems/TerrainSystem';
import { WeaponSystem, WeaponComponent } from '@/engine/game/systems/WeaponSystem';
import { AISystem, AIComponent } from '@/engine/game/systems/AISystem';
import { AudioSystem, AudioComponent } from '@/engine/game/systems/AudioSystem';
import { HUDSystem, HUDComponent } from '@/engine/game/systems/HUDSystem';
import { DestructionSystem, DestructibleComponent } from '@/engine/game/systems/DestructionSystem';
import { InputManager } from '@/engine/platform/web/InputManager';
import * as THREE from 'three';

// Global game instance
let game: Game | null = null;

// Loading screen elements
const loadingScreen = document.getElementById('loadingScreen') as HTMLElement;
const loadingProgress = document.getElementById('loadingProgress') as HTMLElement;
const loadingText = document.getElementById('loadingText') as HTMLElement;
const debugPanel = document.getElementById('debugPanel') as HTMLElement;

// Debug elements
const debugFPS = document.getElementById('debugFPS') as HTMLElement;
const debugFrameTime = document.getElementById('debugFrameTime') as HTMLElement;
const debugEntities = document.getElementById('debugEntities') as HTMLElement;
const debugDrawCalls = document.getElementById('debugDrawCalls') as HTMLElement;
const debugTriangles = document.getElementById('debugTriangles') as HTMLElement;
const debugMemory = document.getElementById('debugMemory') as HTMLElement;

class Game {
  private engine: Engine;
  private canvas: HTMLCanvasElement;
  private isInitialized: boolean = false;
  private inputManager: InputManager;
  private playerEntityId: string | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    // Initialize engine
    const config: EngineConfig = {
      canvas: this.canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      targetFPS: 60,
      fixedTimeStep: 1 / 60,
      enableDebug: __DEV__,
      enableProfiling: __DEV__,
    };

    this.engine = new Engine(config);
    
    // Set up ECS systems
    this.engine.addSystem(new TransformSystem());
    this.engine.addSystem(new InputSystem());
    this.engine.addSystem(new PhysicsSystem());
    this.engine.addSystem(new CameraSystem(
      (pos) => this.engine.setCameraPosition(pos),
      (target) => this.engine.setCameraTarget(target)
    ));
    this.engine.addSystem(new RenderSystem((this.engine as any).renderer.scene));
    this.engine.addSystem(new TerrainSystem((this.engine as any).renderer.scene));
    this.engine.addSystem(new WeaponSystem());
    this.engine.addSystem(new AISystem());
    this.engine.addSystem(new AudioSystem());
    this.engine.addSystem(new HUDSystem());
    this.engine.addSystem(new DestructionSystem((this.engine as any).renderer.scene));
    
    // Set up input abstraction
    this.inputManager = new InputManager();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    
    // Focus events
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    
    // Visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  async initialize(): Promise<void> {
    try {
      await this.updateLoadingProgress(10, 'Initializing engine...');
      
      // Initialize core systems
      await this.updateLoadingProgress(20, 'Loading core systems...');
      await this.initializeCoreSystems();
      
      await this.updateLoadingProgress(40, 'Setting up game world...');
      await this.setupGameWorld();
      
      await this.updateLoadingProgress(60, 'Loading assets...');
      await this.loadAssets();
      
      await this.updateLoadingProgress(80, 'Initializing game systems...');
      await this.initializeGameSystems();
      
      await this.updateLoadingProgress(90, 'Finalizing...');
      await this.finalizeInitialization();
      
      await this.updateLoadingProgress(100, 'Ready!');
      
      // Hide loading screen
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        this.start();
      }, 500);
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.handleInitializationError(error);
    }
  }

  private async initializeCoreSystems(): Promise<void> {
    // Add core systems here
    // Example: this.engine.addSystem(new InputSystem());
    // Example: this.engine.addSystem(new PhysicsSystem());
    // Example: this.engine.addSystem(new RenderSystem());
  }

  private async setupGameWorld(): Promise<void> {
    // Set up initial camera position
    this.engine.setCameraPosition(new Vector3(0, 10, 20));
    this.engine.setCameraTarget(new Vector3(0, 0, 0));
    
    // Create initial entities
    this.createInitialEntities();
  }

  private createInitialEntities(): void {
    // Create player
    const player = this.engine.createEntity('Player');
    this.playerEntityId = player.id;
    
    this.engine.addComponent(player.id, new TransformComponent());
    this.engine.addComponent(player.id, new RenderComponent());
    this.engine.addComponent(player.id, new InputComponent());
    this.engine.addComponent(player.id, new PhysicsComponent());
    this.engine.addComponent(player.id, new CameraComponent());
    this.engine.addComponent(player.id, new WeaponComponent('rifle'));
    this.engine.addComponent(player.id, new AudioComponent());
    this.engine.addComponent(player.id, new HUDComponent());
    
    // Set camera to follow player
    const camera = this.engine.getComponent<CameraComponent>(player.id, 'CameraComponent');
    if (camera) {
      camera.targetEntityId = player.id;
    }
    
    // Create AI bots
    for (let i = 0; i < 3; i++) {
      const bot = this.engine.createEntity(`AI_Bot_${i}`);
      
      const t = new TransformComponent();
      t.position = new Vector3(
        (Math.random() - 0.5) * 40,
        1,
        (Math.random() - 0.5) * 40
      );
      this.engine.addComponent(bot.id, t);
      
      const r = new RenderComponent();
      r.color = 0xff0000;
      this.engine.addComponent(bot.id, r);
      
      this.engine.addComponent(bot.id, new InputComponent());
      this.engine.addComponent(bot.id, new PhysicsComponent());
      this.engine.addComponent(bot.id, new AIComponent());
      this.engine.addComponent(bot.id, new WeaponComponent('pistol'));
      this.engine.addComponent(bot.id, new AudioComponent());
    }
    
    // Create destructible objects
    const destructionSystem = this.engine.getSystem<DestructionSystem>('DestructionSystem');
    if (destructionSystem) {
      // Create some destructible walls
      destructionSystem.createDestructibleWall(
        new Vector3(-10, 0, -10),
        new Vector3(10, 0, -10),
        3,
        150
      );
      
      // Create a destructible building
      destructionSystem.createDestructibleBuilding(
        new Vector3(15, 0, 15),
        new Vector3(8, 6, 8),
        300
      );
    }
    
    // Create some test cubes
    for (let i = 0; i < 5; i++) {
      const testObject = this.engine.createEntity(`TestObject_${i}`);
      const t = new TransformComponent();
      t.position = new Vector3(i * 2 - 4, 2, 0);
      this.engine.addComponent(testObject.id, t);
      const r = new RenderComponent();
      r.color = 0xff0000 + i * 0x002200;
      this.engine.addComponent(testObject.id, r);
      this.engine.addComponent(testObject.id, new PhysicsComponent());
    }
  }

  private async loadAssets(): Promise<void> {
    // Load textures, models, sounds, etc.
    // This would typically involve asset loading systems
  }

  private async initializeGameSystems(): Promise<void> {
    // Initialize game-specific systems
    // Example: this.engine.addSystem(new BattleRoyaleSystem());
  }

  private async finalizeInitialization(): Promise<void> {
    this.isInitialized = true;
  }

  private start(): void {
    if (!this.isInitialized) {
      console.error('Game not initialized');
      return;
    }

    // Start the engine
    this.engine.start();
    
    // Start debug panel if in development
    if (__DEV__) {
      this.startDebugPanel();
    }
    
    console.log('Nexus Royale started successfully!');
  }

  private startDebugPanel(): void {
    debugPanel.classList.add('visible');
    
    // Update debug info every frame
    const updateDebug = () => {
      const stats = this.engine.stats;
      const renderStats = stats.renderStats;
      
      debugFPS.textContent = Math.round(stats.fps).toString();
      debugFrameTime.textContent = `${Math.round(stats.frameTime)}ms`;
      debugEntities.textContent = stats.worldStats.entityCount?.toString() || '0';
      debugDrawCalls.textContent = renderStats.drawCalls?.toString() || '0';
      debugTriangles.textContent = renderStats.triangles?.toString() || '0';
      
      const memoryMB = Math.round((stats.memory.used || 0) / 1024 / 1024);
      debugMemory.textContent = `${memoryMB}MB`;
      
      requestAnimationFrame(updateDebug);
    };
    
    updateDebug();
  }

  // Event handlers
  private handleKeyDown(event: KeyboardEvent): void {
    // Handle keyboard input
    switch (event.code) {
      case 'F3':
        if (__DEV__) {
          event.preventDefault();
          debugPanel.classList.toggle('visible');
        }
        break;
      case 'F11':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'Escape':
        event.preventDefault();
        this.handleEscape();
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key release
  }

  private handleMouseDown(event: MouseEvent): void {
    // Handle mouse input
  }

  private handleMouseUp(event: MouseEvent): void {
    // Handle mouse release
  }

  private handleMouseMove(event: MouseEvent): void {
    // Handle mouse movement
  }

  private handleWheel(event: WheelEvent): void {
    // Handle mouse wheel
    event.preventDefault();
  }

  private handleTouchStart(event: TouchEvent): void {
    // Handle touch input
  }

  private handleTouchEnd(event: TouchEvent): void {
    // Handle touch end
  }

  private handleTouchMove(event: TouchEvent): void {
    // Handle touch movement
    event.preventDefault();
  }

  private handleGamepadConnected(event: GamepadEvent): void {
    console.log('Gamepad connected:', event.gamepad);
  }

  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log('Gamepad disconnected:', event.gamepad);
  }

  private handleFocus(): void {
    // Resume game when window gains focus
    if (this.isInitialized) {
      this.engine.resume();
    }
  }

  private handleBlur(): void {
    // Pause game when window loses focus
    if (this.isInitialized) {
      this.engine.pause();
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.engine.pause();
    } else {
      this.engine.resume();
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  private handleEscape(): void {
    // Handle escape key (pause menu, etc.)
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  private async updateLoadingProgress(progress: number, text: string): Promise<void> {
    loadingProgress.style.width = `${progress}%`;
    loadingText.textContent = text;
    
    // Simulate some loading time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private handleInitializationError(error: any): void {
    loadingText.textContent = 'Failed to initialize game. Please refresh the page.';
    loadingText.style.color = '#ff6b6b';
    console.error('Game initialization failed:', error);
  }

  // Public methods
  getEngine(): Engine {
    return this.engine;
  }

  destroy(): void {
    this.engine.dispose();
    game = null;
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    game = new Game();
    await game.initialize();
  } catch (error) {
    console.error('Failed to create game:', error);
    loadingText.textContent = 'Failed to create game. Please refresh the page.';
    loadingText.style.color = '#ff6b6b';
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (game) {
    game.destroy();
  }
});

// Export for debugging
if (__DEV__) {
  (window as any).game = game;
  (window as any).Game = Game;
}