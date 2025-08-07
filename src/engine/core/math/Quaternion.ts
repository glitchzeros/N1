import { quat, vec3 } from 'gl-matrix';
import { Vector3 } from './Vector3';

export class Quaternion {
  private _data: Float32Array;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this._data = new Float32Array([x, y, z, w]);
  }

  // Getters and setters
  get x(): number { return this._data[0]; }
  set x(value: number) { this._data[0] = value; }

  get y(): number { return this._data[1]; }
  set y(value: number) { this._data[1] = value; }

  get z(): number { return this._data[2]; }
  set z(value: number) { this._data[2] = value; }

  get w(): number { return this._data[3]; }
  set w(value: number) { this._data[3] = value; }

  get data(): Float32Array { return this._data; }

  // Static constructors
  static identity(): Quaternion { return new Quaternion(0, 0, 0, 1); }
  static zero(): Quaternion { return new Quaternion(0, 0, 0, 0); }

  // Basic operations
  set(x: number, y: number, z: number, w: number): Quaternion {
    this._data[0] = x;
    this._data[1] = y;
    this._data[2] = z;
    this._data[3] = w;
    return this;
  }

  copy(other: Quaternion): Quaternion {
    this._data[0] = other._data[0];
    this._data[1] = other._data[1];
    this._data[2] = other._data[2];
    this._data[3] = other._data[3];
    return this;
  }

  clone(): Quaternion {
    return new Quaternion(this._data[0], this._data[1], this._data[2], this._data[3]);
  }

  // Mathematical operations
  conjugate(): Quaternion {
    quat.conjugate(this._data, this._data);
    return this;
  }

  inverse(): Quaternion {
    quat.invert(this._data, this._data);
    return this;
  }

  normalize(): Quaternion {
    quat.normalize(this._data, this._data);
    return this;
  }

  length(): number {
    return quat.length(this._data);
  }

  lengthSquared(): number {
    return quat.squaredLength(this._data);
  }

  dot(other: Quaternion): number {
    return quat.dot(this._data, other._data);
  }

  // Rotation operations
  multiply(other: Quaternion): Quaternion {
    quat.multiply(this._data, this._data, other._data);
    return this;
  }

  rotateX(angle: number): Quaternion {
    quat.rotateX(this._data, this._data, angle);
    return this;
  }

  rotateY(angle: number): Quaternion {
    quat.rotateY(this._data, this._data, angle);
    return this;
  }

  rotateZ(angle: number): Quaternion {
    quat.rotateZ(this._data, this._data, angle);
    return this;
  }

  setAxisAngle(axis: Vector3, angle: number): Quaternion {
    quat.setAxisAngle(this._data, axis.data, angle);
    return this;
  }

  getAxisAngle(): { axis: Vector3; angle: number } {
    const axis = new Float32Array(3);
    const angle = quat.getAxisAngle(axis, this._data);
    return {
      axis: new Vector3(axis[0], axis[1], axis[2]),
      angle
    };
  }

  // Euler angles
  setEuler(x: number, y: number, z: number): Quaternion {
    quat.fromEuler(this._data, x * 180 / Math.PI, y * 180 / Math.PI, z * 180 / Math.PI);
    return this;
  }

  getEuler(): Vector3 {
    const euler = new Float32Array(3);
    quat.toEuler(euler, this._data);
    return new Vector3(
      euler[0] * Math.PI / 180,
      euler[1] * Math.PI / 180,
      euler[2] * Math.PI / 180
    );
  }

  // Look-at rotation
  lookAt(eye: Vector3, target: Vector3, up: Vector3 = Vector3.up()): Quaternion {
    const matrix = new Float32Array(16);
    const eyeVec = vec3.create();
    const targetVec = vec3.create();
    const upVec = vec3.create();
    
    vec3.copy(eyeVec, eye.data);
    vec3.copy(targetVec, target.data);
    vec3.copy(upVec, up.data);
    
    // Create look-at matrix
    const z = vec3.create();
    const x = vec3.create();
    const y = vec3.create();
    
    vec3.subtract(z, eyeVec, targetVec);
    vec3.normalize(z, z);
    
    vec3.cross(x, upVec, z);
    vec3.normalize(x, x);
    
    vec3.cross(y, z, x);
    
    // Convert to quaternion
    matrix[0] = x[0]; matrix[4] = x[1]; matrix[8] = x[2]; matrix[12] = 0;
    matrix[1] = y[0]; matrix[5] = y[1]; matrix[9] = y[2]; matrix[13] = 0;
    matrix[2] = z[0]; matrix[6] = z[1]; matrix[10] = z[2]; matrix[14] = 0;
    matrix[3] = 0; matrix[7] = 0; matrix[11] = 0; matrix[15] = 1;
    
    quat.fromMat4(this._data, matrix);
    return this;
  }

  // Spherical linear interpolation
  slerp(other: Quaternion, t: number): Quaternion {
    quat.slerp(this._data, this._data, other._data, t);
    return this;
  }

  // Vector rotation
  rotateVector(vector: Vector3): Vector3 {
    const result = new Float32Array(3);
    quat.rotateVector(result, this._data, vector.data);
    return new Vector3(result[0], result[1], result[2]);
  }

  // Utility methods
  equals(other: Quaternion, epsilon = 0.0001): boolean {
    return quat.equals(this._data, other._data) ||
           (Math.abs(this._data[0] - other._data[0]) < epsilon &&
            Math.abs(this._data[1] - other._data[1]) < epsilon &&
            Math.abs(this._data[2] - other._data[2]) < epsilon &&
            Math.abs(this._data[3] - other._data[3]) < epsilon);
  }

  isIdentity(epsilon = 0.0001): boolean {
    return Math.abs(this._data[0]) < epsilon &&
           Math.abs(this._data[1]) < epsilon &&
           Math.abs(this._data[2]) < epsilon &&
           Math.abs(this._data[3] - 1) < epsilon;
  }

  // Conversion methods
  toArray(): [number, number, number, number] {
    return [this._data[0], this._data[1], this._data[2], this._data[3]];
  }

  toThreeQuaternion(): { x: number; y: number; z: number; w: number } {
    return { x: this._data[0], y: this._data[1], z: this._data[2], w: this._data[3] };
  }

  // Serialization
  toJSON(): { x: number; y: number; z: number; w: number } {
    return { x: this._data[0], y: this._data[1], z: this._data[2], w: this._data[3] };
  }

  static fromJSON(json: { x: number; y: number; z: number; w: number }): Quaternion {
    return new Quaternion(json.x, json.y, json.z, json.w);
  }

  // Debug
  toString(): string {
    return `Quaternion(${this._data[0].toFixed(3)}, ${this._data[1].toFixed(3)}, ${this._data[2].toFixed(3)}, ${this._data[3].toFixed(3)})`;
  }
}