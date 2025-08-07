import { Component } from '../Component';

export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  fire: boolean;
  aim: boolean;
  sprint: boolean;
  crouch: boolean;
  mouseX: number;
  mouseY: number;
  lookX: number;
  lookY: number;
};

export class InputComponent extends Component {
  state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    fire: false,
    aim: false,
    sprint: false,
    crouch: false,
    mouseX: 0,
    mouseY: 0,
    lookX: 0,
    lookY: 0,
  };

  toJSON() {
    return { ...this.state };
  }

  fromJSON(json: any) {
    this.state = { ...this.state, ...json };
  }
}