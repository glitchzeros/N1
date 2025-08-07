import { System } from '../System';
import { InputComponent } from '../components/InputComponent';
import { World } from '../World';

// Global input state (to be filled by platform input abstraction)
export const GlobalInput: Record<string, any> = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  fire: false,
  aim: false,
  sprint: false,
  crouch: false,
  reload: false,
  mouseX: 0,
  mouseY: 0,
  lookX: 0,
  lookY: 0,
};

export class InputSystem extends System {
  constructor() {
    super('InputSystem', 'critical', { all: ['InputComponent'] });
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;
    for (const entityId of this.entities) {
      const input = world.getComponent<InputComponent>(entityId, 'InputComponent');
      if (!input) continue;
      // Copy global input state to component
      input.state = { ...input.state, ...GlobalInput };
    }
  }
}