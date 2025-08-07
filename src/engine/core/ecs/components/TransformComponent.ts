import { Component } from '../Component';
import { Vector3, Quaternion } from '../../math';

export class TransformComponent extends Component {
  position: Vector3 = new Vector3();
  rotation: Quaternion = new Quaternion();
  scale: Vector3 = new Vector3(1, 1, 1);

  toJSON() {
    return {
      position: this.position.toJSON(),
      rotation: this.rotation.toJSON(),
      scale: this.scale.toJSON(),
    };
  }

  fromJSON(json: any) {
    this.position = Vector3.fromJSON(json.position);
    this.rotation = Quaternion.fromJSON(json.rotation);
    this.scale = Vector3.fromJSON(json.scale);
  }
}