import { Component } from '../Component';
import { Vector3 } from '../../math';

export type CameraMode = 'follow' | 'free' | 'orbit';

export class CameraComponent extends Component {
  mode: CameraMode = 'follow';
  targetEntityId: string | null = null;
  offset: Vector3 = new Vector3(0, 5, -10);
  fov: number = 75;
  near: number = 0.1;
  far: number = 1000;

  toJSON() {
    return {
      mode: this.mode,
      targetEntityId: this.targetEntityId,
      offset: this.offset.toJSON(),
      fov: this.fov,
      near: this.near,
      far: this.far,
    };
  }

  fromJSON(json: any) {
    this.mode = json.mode;
    this.targetEntityId = json.targetEntityId;
    this.offset = Vector3.fromJSON(json.offset);
    this.fov = json.fov;
    this.near = json.near;
    this.far = json.far;
  }
}