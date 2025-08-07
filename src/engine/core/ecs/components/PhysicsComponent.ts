import { Component } from '../Component';
import { Vector3 } from '../../math';

export type ColliderType = 'box' | 'sphere' | 'capsule' | 'mesh';

export class PhysicsComponent extends Component {
  velocity: Vector3 = new Vector3();
  acceleration: Vector3 = new Vector3();
  mass: number = 1;
  collider: ColliderType = 'box';
  restitution: number = 0.2;
  friction: number = 0.8;
  ccd: boolean = false;
  isStatic: boolean = false;

  toJSON() {
    return {
      velocity: this.velocity.toJSON(),
      acceleration: this.acceleration.toJSON(),
      mass: this.mass,
      collider: this.collider,
      restitution: this.restitution,
      friction: this.friction,
      ccd: this.ccd,
      isStatic: this.isStatic,
    };
  }

  fromJSON(json: any) {
    this.velocity = Vector3.fromJSON(json.velocity);
    this.acceleration = Vector3.fromJSON(json.acceleration);
    this.mass = json.mass;
    this.collider = json.collider;
    this.restitution = json.restitution;
    this.friction = json.friction;
    this.ccd = json.ccd;
    this.isStatic = json.isStatic;
  }
}