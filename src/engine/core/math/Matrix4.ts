import { mat4, vec3, quat } from 'gl-matrix';
import { Vector3 } from './Vector3';
import { Quaternion } from './Quaternion';

export class Matrix4 {
  private _data: Float32Array;

  constructor() {
    this._data = new Float32Array(16);
    this.identity();
  }

  get data(): Float32Array { return this._data; }

  // Static constructors
  static identity(): Matrix4 {
    const matrix = new Matrix4();
    matrix.identity();
    return matrix;
  }

  static translation(x: number, y: number, z: number): Matrix4 {
    const matrix = new Matrix4();
    matrix.setTranslation(x, y, z);
    return matrix;
  }

  static rotation(quaternion: Quaternion): Matrix4 {
    const matrix = new Matrix4();
    matrix.setRotation(quaternion);
    return matrix;
  }

  static scale(x: number, y: number, z: number): Matrix4 {
    const matrix = new Matrix4();
    matrix.setScale(x, y, z);
    return matrix;
  }

  static lookAt(eye: Vector3, target: Vector3, up: Vector3 = Vector3.up()): Matrix4 {
    const matrix = new Matrix4();
    matrix.setLookAt(eye, target, up);
    return matrix;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
    const matrix = new Matrix4();
    matrix.setPerspective(fov, aspect, near, far);
    return matrix;
  }

  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    const matrix = new Matrix4();
    matrix.setOrthographic(left, right, bottom, top, near, far);
    return matrix;
  }

  // Basic operations
  identity(): Matrix4 {
    mat4.identity(this._data);
    return this;
  }

  copy(other: Matrix4): Matrix4 {
    mat4.copy(this._data, other._data);
    return this;
  }

  clone(): Matrix4 {
    const matrix = new Matrix4();
    matrix.copy(this);
    return matrix;
  }

  // Transformation setters
  setTranslation(x: number, y: number, z: number): Matrix4 {
    mat4.fromTranslation(this._data, [x, y, z]);
    return this;
  }

  setRotation(quaternion: Quaternion): Matrix4 {
    mat4.fromQuat(this._data, quaternion.data);
    return this;
  }

  setScale(x: number, y: number, z: number): Matrix4 {
    mat4.fromScaling(this._data, [x, y, z]);
    return this;
  }

  setLookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    mat4.lookAt(this._data, eye.data, target.data, up.data);
    return this;
  }

  setPerspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
    mat4.perspective(this._data, fov, aspect, near, far);
    return this;
  }

  setOrthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    mat4.ortho(this._data, left, right, bottom, top, near, far);
    return this;
  }

  // Transformation operations
  translate(x: number, y: number, z: number): Matrix4 {
    mat4.translate(this._data, this._data, [x, y, z]);
    return this;
  }

  rotate(angle: number, axis: Vector3): Matrix4 {
    mat4.rotate(this._data, this._data, angle, axis.data);
    return this;
  }

  rotateX(angle: number): Matrix4 {
    mat4.rotateX(this._data, this._data, angle);
    return this;
  }

  rotateY(angle: number): Matrix4 {
    mat4.rotateY(this._data, this._data, angle);
    return this;
  }

  rotateZ(angle: number): Matrix4 {
    mat4.rotateZ(this._data, this._data, angle);
    return this;
  }

  scale(x: number, y: number, z: number): Matrix4 {
    mat4.scale(this._data, this._data, [x, y, z]);
    return this;
  }

  // Mathematical operations
  multiply(other: Matrix4): Matrix4 {
    mat4.multiply(this._data, this._data, other._data);
    return this;
  }

  multiplyLeft(other: Matrix4): Matrix4 {
    mat4.multiply(this._data, other._data, this._data);
    return this;
  }

  inverse(): Matrix4 {
    mat4.invert(this._data, this._data);
    return this;
  }

  transpose(): Matrix4 {
    mat4.transpose(this._data, this._data);
    return this;
  }

  determinant(): number {
    return mat4.determinant(this._data);
  }

  // Decomposition
  getTranslation(): Vector3 {
    const translation = vec3.create();
    mat4.getTranslation(translation, this._data);
    return new Vector3(translation[0], translation[1], translation[2]);
  }

  getRotation(): Quaternion {
    const rotation = quat.create();
    mat4.getRotation(rotation, this._data);
    return new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
  }

  getScale(): Vector3 {
    const scale = vec3.create();
    mat4.getScaling(scale, this._data);
    return new Vector3(scale[0], scale[1], scale[2]);
  }

  // Vector transformations
  transformPoint(point: Vector3): Vector3 {
    const result = vec3.create();
    vec3.transformMat4(result, point.data, this._data);
    return new Vector3(result[0], result[1], result[2]);
  }

  transformDirection(direction: Vector3): Vector3 {
    const result = vec3.create();
    vec3.transformMat4(result, direction.data, this._data);
    vec3.normalize(result, result);
    return new Vector3(result[0], result[1], result[2]);
  }

  transformNormal(normal: Vector3): Vector3 {
    const result = vec3.create();
    const inverse = mat4.create();
    mat4.invert(inverse, this._data);
    mat4.transpose(inverse, inverse);
    vec3.transformMat4(result, normal.data, inverse);
    vec3.normalize(result, result);
    return new Vector3(result[0], result[1], result[2]);
  }

  // Utility methods
  equals(other: Matrix4, epsilon = 0.0001): boolean {
    for (let i = 0; i < 16; i++) {
      if (Math.abs(this._data[i] - other._data[i]) >= epsilon) {
        return false;
      }
    }
    return true;
  }

  isIdentity(epsilon = 0.0001): boolean {
    const identity = mat4.create();
    mat4.identity(identity);
    return this.equals(new Matrix4().copy({ data: identity } as Matrix4), epsilon);
  }

  // Conversion methods
  toArray(): number[] {
    return Array.from(this._data);
  }

  toThreeMatrix(): { elements: number[] } {
    return { elements: this.toArray() };
  }

  // Serialization
  toJSON(): { data: number[] } {
    return { data: this.toArray() };
  }

  static fromJSON(json: { data: number[] }): Matrix4 {
    const matrix = new Matrix4();
    for (let i = 0; i < 16; i++) {
      matrix._data[i] = json.data[i] || 0;
    }
    return matrix;
  }

  // Debug
  toString(): string {
    const elements = this.toArray();
    return `Matrix4([
      ${elements.slice(0, 4).map(x => x.toFixed(3)).join(', ')}
      ${elements.slice(4, 8).map(x => x.toFixed(3)).join(', ')}
      ${elements.slice(8, 12).map(x => x.toFixed(3)).join(', ')}
      ${elements.slice(12, 16).map(x => x.toFixed(3)).join(', ')}
    ])`;
  }
}