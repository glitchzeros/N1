import { Component } from '../Component';

export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  fire: boolean;
  aim: boolean;
  sprint: boolean;
  crouch: boolean;
  reload: boolean;
  mouseX: number;
  mouseY: number;
  lookX: number;
  lookY: number;
};

export class InputComponent extends Component {
  state: InputState = {
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

  toJSON() {
    return { ...this.state };
  }

  fromJSON(json: any) {
    this.state = { ...this.state, ...json };
  }
}