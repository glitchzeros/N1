import * as THREE from 'three';
import { Vector3, Matrix4 } from '@/engine/core/math';

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  preserveDrawingBuffer?: boolean;
  logarithmicDepthBuffer?: boolean;
  stencil?: boolean;
  depth?: boolean;
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  frameTime: number;
  fps: number;
  memory: {
    geometries: number;
    textures: number;
  };
}

export class Renderer {
  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _config: RendererConfig;
  private _lastFrameTime: number;
  private _frameCount: number;
  private _fps: number;
  private _stats: RenderStats;

  constructor(config: RendererConfig) {
    this._config = config;
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._fps = 0;

    // Initialize Three.js renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? false,
      powerPreference: config.powerPreference ?? 'high-performance',
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
      logarithmicDepthBuffer: config.logarithmicDepthBuffer ?? false,
      stencil: config.stencil ?? false,
      depth: config.depth ?? true,
    });

    // Configure renderer
    this._renderer.setSize(config.width, config.height);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    // Initialize scene
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Initialize camera
    this._camera = new THREE.PerspectiveCamera(
      75, // FOV
      config.width / config.height, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    this._camera.position.set(0, 5, 10);
    this._camera.lookAt(0, 0, 0);

    // Initialize stats
    this._stats = {
      drawCalls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
      frameTime: 0,
      fps: 0,
      memory: {
        geometries: 0,
        textures: 0,
      },
    };
  }

  // Getters
  get renderer(): THREE.WebGLRenderer { return this._renderer; }
  get scene(): THREE.Scene { return this._scene; }
  get camera(): THREE.PerspectiveCamera { return this._camera; }
  get stats(): RenderStats { return this._stats; }

  // Scene management
  add(object: THREE.Object3D): void {
    this._scene.add(object);
  }

  remove(object: THREE.Object3D): void {
    this._scene.remove(object);
  }

  clear(): void {
    while (this._scene.children.length > 0) {
      this._scene.remove(this._scene.children[0]);
    }
  }

  // Camera management
  setCameraPosition(position: Vector3): void {
    this._camera.position.set(position.x, position.y, position.z);
  }

  setCameraTarget(target: Vector3): void {
    this._camera.lookAt(target.x, target.y, target.z);
  }

  setCameraFOV(fov: number): void {
    this._camera.fov = fov;
    this._camera.updateProjectionMatrix();
  }

  setCameraAspect(aspect: number): void {
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
  }

  // Rendering
  render(): void {
    const startTime = performance.now();

    // Update stats before rendering
    this._updateStats();

    // Render the scene
    this._renderer.render(this._scene, this._camera);

    // Update frame timing
    const endTime = performance.now();
    this._stats.frameTime = endTime - startTime;
    this._lastFrameTime = endTime;
    this._frameCount++;

    // Calculate FPS
    if (this._frameCount % 60 === 0) {
      this._fps = 1000 / this._stats.frameTime;
      this._stats.fps = this._fps;
    }
  }

  // Resize handling
  resize(width: number, height: number): void {
    this._config.width = width;
    this._config.height = height;
    
    this._renderer.setSize(width, height);
    this.setCameraAspect(width / height);
  }

  // Performance optimization
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (quality) {
      case 'low':
        this._renderer.setPixelRatio(1);
        this._renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      case 'high':
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      case 'ultra':
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
  }

  // Memory management
  dispose(): void {
    // Dispose of geometries
    this._scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    // Dispose of renderer
    this._renderer.dispose();
  }

  // Utility methods
  getWorldPosition(screenX: number, screenY: number, distance: number = 10): Vector3 {
    const vector = new THREE.Vector3();
    vector.setFromMatrixColumn(this._camera.matrix, 0);
    vector.crossVectors(this._camera.up, vector);
    vector.multiplyScalar(-1);

    const worldPosition = new THREE.Vector3();
    worldPosition.addScaledVector(vector, distance);
    worldPosition.add(this._camera.position);

    return new Vector3(worldPosition.x, worldPosition.y, worldPosition.z);
  }

  getScreenPosition(worldPosition: Vector3): { x: number; y: number } {
    const vector = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z);
    vector.project(this._camera);

    return {
      x: (vector.x * 0.5 + 0.5) * this._config.width,
      y: (-vector.y * 0.5 + 0.5) * this._config.height,
    };
  }

  // Private methods
  private _updateStats(): void {
    const info = this._renderer.info;
    this._stats.drawCalls = info.render.calls;
    this._stats.triangles = info.render.triangles;
    this._stats.points = info.render.points;
    this._stats.lines = info.render.lines;
    this._stats.memory.geometries = info.memory.geometries;
    this._stats.memory.textures = info.memory.textures;
  }

  // Debug
  enableDebugMode(): void {
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    this._scene.add(axesHelper);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    this._scene.add(gridHelper);
  }

  getDebugInfo(): {
    sceneChildren: number;
    rendererInfo: any;
    cameraInfo: {
      position: Vector3;
      fov: number;
      aspect: number;
      near: number;
      far: number;
    };
  } {
    return {
      sceneChildren: this._scene.children.length,
      rendererInfo: this._renderer.info,
      cameraInfo: {
        position: new Vector3(
          this._camera.position.x,
          this._camera.position.y,
          this._camera.position.z
        ),
        fov: this._camera.fov,
        aspect: this._camera.aspect,
        near: this._camera.near,
        far: this._camera.far,
      },
    };
  }
}