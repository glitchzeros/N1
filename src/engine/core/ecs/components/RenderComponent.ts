import { Component } from '../Component';

export class RenderComponent extends Component {
  meshType: 'cube' | 'sphere' | 'terrain' = 'cube';
  color: number = 0xffffff;
  visible: boolean = true;

  toJSON() {
    return {
      meshType: this.meshType,
      color: this.color,
      visible: this.visible,
    };
  }

  fromJSON(json: any) {
    this.meshType = json.meshType;
    this.color = json.color;
    this.visible = json.visible;
  }
}