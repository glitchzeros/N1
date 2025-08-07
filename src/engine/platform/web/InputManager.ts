import { GlobalInput } from '@/engine/core/ecs/systems/InputSystem';

const DEAD_ZONE = 0.15;

export class InputManager {
  constructor() {
    this.setupKeyboard();
    this.setupMouse();
    this.setupGamepad();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': GlobalInput.forward = true; break;
        case 'KeyS': GlobalInput.backward = true; break;
        case 'KeyA': GlobalInput.left = true; break;
        case 'KeyD': GlobalInput.right = true; break;
        case 'Space': GlobalInput.jump = true; break;
        case 'ShiftLeft': GlobalInput.sprint = true; break;
        case 'ControlLeft': GlobalInput.crouch = true; break;
        case 'KeyR': GlobalInput.reload = true; break;
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': GlobalInput.forward = false; break;
        case 'KeyS': GlobalInput.backward = false; break;
        case 'KeyA': GlobalInput.left = false; break;
        case 'KeyD': GlobalInput.right = false; break;
        case 'Space': GlobalInput.jump = false; break;
        case 'ShiftLeft': GlobalInput.sprint = false; break;
        case 'ControlLeft': GlobalInput.crouch = false; break;
        case 'KeyR': GlobalInput.reload = false; break;
      }
    });
  }

  private setupMouse() {
    window.addEventListener('mousemove', (e) => {
      GlobalInput.mouseX = e.clientX;
      GlobalInput.mouseY = e.clientY;
      // Update look direction for FPS camera
      const sensitivity = 0.002;
      GlobalInput.lookX += e.movementX * sensitivity;
      GlobalInput.lookY += e.movementY * sensitivity;
      GlobalInput.lookY = Math.max(-Math.PI/2, Math.min(Math.PI/2, GlobalInput.lookY));
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) GlobalInput.fire = true;
      if (e.button === 2) GlobalInput.aim = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) GlobalInput.fire = false;
      if (e.button === 2) GlobalInput.aim = false;
    });
  }

  private setupGamepad() {
    const pollGamepad = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (pads[0]) {
        const gp = pads[0];
        // Left stick
        const lx = Math.abs(gp.axes[0]) > DEAD_ZONE ? gp.axes[0] : 0;
        const ly = Math.abs(gp.axes[1]) > DEAD_ZONE ? gp.axes[1] : 0;
        GlobalInput.left = lx < -DEAD_ZONE;
        GlobalInput.right = lx > DEAD_ZONE;
        GlobalInput.forward = ly < -DEAD_ZONE;
        GlobalInput.backward = ly > DEAD_ZONE;
        // Buttons
        GlobalInput.jump = !!gp.buttons[0]?.pressed;
        GlobalInput.fire = !!gp.buttons[7]?.pressed;
        GlobalInput.aim = !!gp.buttons[6]?.pressed;
        GlobalInput.sprint = !!gp.buttons[1]?.pressed;
        GlobalInput.crouch = !!gp.buttons[2]?.pressed;
        GlobalInput.reload = !!gp.buttons[3]?.pressed;
      }
      requestAnimationFrame(pollGamepad);
    };
    pollGamepad();
  }
}