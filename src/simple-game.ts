import * as THREE from 'three';

class SimpleGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cubes: THREE.Mesh[] = [];
  private isRunning = false;

  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add renderer to DOM
    const container = document.getElementById('gameCanvas');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    this.setupScene();
    this.setupLights();
    this.setupControls();
  }

  private setupScene(): void {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create cubes
    for (let i = 0; i < 10; i++) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ 
        color: Math.random() * 0xffffff 
      });
      const cube = new THREE.Mesh(geometry, material);
      
      cube.position.set(
        (Math.random() - 0.5) * 20,
        0.5,
        (Math.random() - 0.5) * 20
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      
      this.cubes.push(cube);
      this.scene.add(cube);
    }

    // Create a larger building
    const buildingGeometry = new THREE.BoxGeometry(4, 6, 4);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(8, 3, 8);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);
  }

  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    this.scene.add(directionalLight);
  }

  private setupControls(): void {
    // Mouse controls
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    this.renderer.domElement.addEventListener('mousedown', (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (isMouseDown) {
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        
        // Rotate camera around the scene
        const radius = 10;
        const angleX = deltaX * 0.01;
        const angleY = deltaY * 0.01;
        
        this.camera.position.x = radius * Math.sin(angleX);
        this.camera.position.z = radius * Math.cos(angleX);
        this.camera.position.y = Math.max(2, Math.min(15, this.camera.position.y - angleY));
        
        this.camera.lookAt(0, 0, 0);
        
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    });

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      const speed = 0.5;
      switch (event.code) {
        case 'KeyW':
          this.camera.position.z -= speed;
          break;
        case 'KeyS':
          this.camera.position.z += speed;
          break;
        case 'KeyA':
          this.camera.position.x -= speed;
          break;
        case 'KeyD':
          this.camera.position.x += speed;
          break;
        case 'KeyQ':
          this.camera.position.y += speed;
          break;
        case 'KeyE':
          this.camera.position.y -= speed;
          break;
      }
      this.camera.lookAt(0, 0, 0);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public start(): void {
    this.isRunning = true;
    this.animate();
  }

  private animate(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    // Animate cubes
    this.cubes.forEach((cube, index) => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      cube.position.y = 0.5 + Math.sin(Date.now() * 0.001 + index) * 0.5;
    });

    this.renderer.render(this.scene, this.camera);
  }

  public stop(): void {
    this.isRunning = false;
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Hide loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }

  // Create and start game
  const game = new SimpleGame();
  game.start();

  // Add some UI
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '20px';
  ui.style.left = '20px';
  ui.style.color = 'white';
  ui.style.fontFamily = 'Arial, sans-serif';
  ui.style.fontSize = '16px';
  ui.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  ui.innerHTML = `
    <h2>Nexus Royale - 3D Demo</h2>
    <p><strong>Controls:</strong></p>
    <p>Mouse: Click and drag to rotate camera</p>
    <p>WASD: Move camera</p>
    <p>QE: Move camera up/down</p>
    <p><strong>Features:</strong></p>
    <p>• 3D scene with lighting and shadows</p>
    <p>• Animated cubes</p>
    <p>• Interactive camera controls</p>
    <p>• Responsive design</p>
  `;
  document.body.appendChild(ui);

  // Add performance stats
  const stats = document.createElement('div');
  stats.style.position = 'absolute';
  stats.style.top = '20px';
  stats.style.right = '20px';
  stats.style.color = 'white';
  stats.style.fontFamily = 'monospace';
  stats.style.fontSize = '14px';
  stats.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  document.body.appendChild(stats);

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  function updateStats() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }

    stats.innerHTML = `
      <div>FPS: ${fps}</div>
      <div>Resolution: ${window.innerWidth}x${window.innerHeight}</div>
      <div>Objects: ${game['cubes'].length + 3}</div>
    `;

    requestAnimationFrame(updateStats);
  }
  updateStats();
});

// Export for debugging
(window as any).SimpleGame = SimpleGame;