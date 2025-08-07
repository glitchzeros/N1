import * as THREE from 'three';

class NexusRoyaleGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.cubes = [];
    this.isRunning = false;
    
    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87CEEB); // Sky blue background
    
    // Add to DOM
    const container = document.getElementById('gameCanvas');
    container.appendChild(this.renderer.domElement);
    
    // Setup scene
    this.setupScene();
    this.setupLights();
    this.setupControls();
    
    // Start game
    this.start();
  }

  setupScene() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create animated cubes (representing players/objects)
    for (let i = 0; i < 15; i++) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({ 
        color: Math.random() * 0xffffff 
      });
      const cube = new THREE.Mesh(geometry, material);
      
      cube.position.set(
        (Math.random() - 0.5) * 40,
        0.5,
        (Math.random() - 0.5) * 40
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      
      this.cubes.push(cube);
      this.scene.add(cube);
    }

    // Create buildings
    for (let i = 0; i < 5; i++) {
      const buildingGeometry = new THREE.BoxGeometry(3, 8, 3);
      const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(
        (Math.random() - 0.5) * 60,
        4,
        (Math.random() - 0.5) * 60
      );
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);
    }

    // Create zone boundary (battle royale style)
    const zoneGeometry = new THREE.RingGeometry(45, 50, 32);
    const zoneMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const zone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    zone.rotation.x = -Math.PI / 2;
    this.scene.add(zone);
  }

  setupLights() {
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

  setupControls() {
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
        const radius = 15;
        const angleX = deltaX * 0.01;
        const angleY = deltaY * 0.01;
        
        this.camera.position.x = radius * Math.sin(angleX);
        this.camera.position.z = radius * Math.cos(angleX);
        this.camera.position.y = Math.max(5, Math.min(20, this.camera.position.y - angleY));
        
        this.camera.lookAt(0, 0, 0);
        
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    });

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      const speed = 1;
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

  start() {
    this.isRunning = true;
    this.camera.position.set(0, 15, 20);
    this.camera.lookAt(0, 0, 0);
    this.animate();
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    // Animate cubes (simulating players)
    this.cubes.forEach((cube, index) => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      cube.position.y = 0.5 + Math.sin(Date.now() * 0.001 + index) * 0.5;
      
      // Add some movement
      cube.position.x += Math.sin(Date.now() * 0.0005 + index) * 0.02;
      cube.position.z += Math.cos(Date.now() * 0.0005 + index) * 0.02;
    });

    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.isRunning = false;
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Simulate loading
  const loadingProgress = document.getElementById('loadingProgress');
  const loadingText = document.getElementById('loadingText');
  const loadingScreen = document.getElementById('loadingScreen');
  
  const loadingSteps = [
    { progress: 20, text: 'Loading Three.js engine...' },
    { progress: 40, text: 'Initializing 3D scene...' },
    { progress: 60, text: 'Setting up lighting...' },
    { progress: 80, text: 'Creating game objects...' },
    { progress: 100, text: 'Ready!' }
  ];
  
  for (const step of loadingSteps) {
    loadingProgress.style.width = step.progress + '%';
    loadingText.textContent = step.text;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Hide loading screen
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 500);
  
  // Create and start game
  const game = new NexusRoyaleGame();
  
  // Add UI overlay
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '20px';
  ui.style.left = '20px';
  ui.style.color = 'white';
  ui.style.fontFamily = 'Arial, sans-serif';
  ui.style.fontSize = '16px';
  ui.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  ui.style.zIndex = '100';
  ui.innerHTML = `
    <h2>NEXUS ROYALE</h2>
    <p><strong>Controls:</strong></p>
    <p>Mouse: Click and drag to rotate camera</p>
    <p>WASD: Move camera</p>
    <p>QE: Move camera up/down</p>
    <p><strong>Features:</strong></p>
    <p>• 3D battle royale environment</p>
    <p>• Animated player objects</p>
    <p>• Dynamic lighting and shadows</p>
    <p>• Interactive camera controls</p>
    <p>• Zone boundary visualization</p>
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
  stats.style.zIndex = '100';
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
      <div>Objects: ${game.cubes.length + 8}</div>
      <div>Shadows: Enabled</div>
    `;
    
    requestAnimationFrame(updateStats);
  }
  updateStats();
  
  // Export for debugging
  window.game = game;
  window.NexusRoyaleGame = NexusRoyaleGame;
});