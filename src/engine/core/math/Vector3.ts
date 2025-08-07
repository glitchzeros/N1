import { vec3 } from 'gl-matrix';

export class Vector3 {
  private _data: Float32Array;

  constructor(x = 0, y = 0, z = 0) {
    this._data = new Float32Array([x, y, z]);
  }

  // Getters and setters
  get x(): number { return this._data[0]; }
  set x(value: number) { this._data[0] = value; }

  get y(): number { return this._data[1]; }
  set y(value: number) { this._data[1] = value; }

  get z(): number { return this._data[2]; }
  set z(value: number) { this._data[2] = value; }

  get data(): Float32Array { return this._data; }

  // Static constructors
  static zero(): Vector3 { return new Vector3(0, 0, 0); }
  static one(): Vector3 { return new Vector3(1, 1, 1); }
  static up(): Vector3 { return new Vector3(0, 1, 0); }
  static down(): Vector3 { return new Vector3(0, -1, 0); }
  static left(): Vector3 { return new Vector3(-1, 0, 0); }
  static right(): Vector3 { return new Vector3(1, 0, 0); }
  static forward(): Vector3 { return new Vector3(0, 0, -1); }
  static back(): Vector3 { return new Vector3(0, 0, 1); }

  // Basic operations
  set(x: number, y: number, z: number): Vector3 {
    this._data[0] = x;
    this._data[1] = y;
    this._data[2] = z;
    return this;
  }

  copy(other: Vector3): Vector3 {
    this._data[0] = other._data[0];
    this._data[1] = other._data[1];
    this._data[2] = other._data[2];
    return this;
  }

  clone(): Vector3 {
    return new Vector3(this._data[0], this._data[1], this._data[2]);
  }

  // Arithmetic operations
  add(other: Vector3): Vector3 {
    vec3.add(this._data, this._data, other._data);
    return this;
  }

  sub(other: Vector3): Vector3 {
    vec3.subtract(this._data, this._data, other._data);
    return this;
  }

  mul(other: Vector3): Vector3 {
    vec3.multiply(this._data, this._data, other._data);
    return this;
  }

  div(other: Vector3): Vector3 {
    vec3.divide(this._data, this._data, other._data);
    return this;
  }

  scale(scalar: number): Vector3 {
    vec3.scale(this._data, this._data, scalar);
    return this;
  }

  // Mathematical operations
  length(): number {
    return vec3.length(this._data);
  }

  lengthSquared(): number {
    return vec3.squaredLength(this._data);
  }

  distance(other: Vector3): number {
    return vec3.distance(this._data, other._data);
  }

  distanceSquared(other: Vector3): number {
    return vec3.squaredDistance(this._data, other._data);
  }

  normalize(): Vector3 {
    vec3.normalize(this._data, this._data);
    return this;
  }

  dot(other: Vector3): number {
    return vec3.dot(this._data, other._data);
  }

  cross(other: Vector3): Vector3 {
    vec3.cross(this._data, this._data, other._data);
    return this;
  }

  lerp(other: Vector3, t: number): Vector3 {
    vec3.lerp(this._data, this._data, other._data, t);
    return this;
  }

  slerp(other: Vector3, t: number): Vector3 {
    vec3.slerp(this._data, this._data, other._data, t);
    return this;
  }

  // Utility methods
  equals(other: Vector3, epsilon = 0.0001): boolean {
    return vec3.equals(this._data, other._data) ||
           (Math.abs(this._data[0] - other._data[0]) < epsilon &&
            Math.abs(this._data[1] - other._data[1]) < epsilon &&
            Math.abs(this._data[2] - other._data[2]) < epsilon);
  }

  isZero(epsilon = 0.0001): boolean {
    return this.lengthSquared() < epsilon * epsilon;
  }

  clamp(min: Vector3, max: Vector3): Vector3 {
    vec3.max(this._data, this._data, min._data);
    vec3.min(this._data, this._data, max._data);
    return this;
  }

  clampLength(maxLength: number): Vector3 {
    const len = this.length();
    if (len > maxLength) {
      this.scale(maxLength / len);
    }
    return this;
  }

  // Conversion methods
  toArray(): [number, number, number] {
    return [this._data[0], this._data[1], this._data[2]];
  }

  toThreeVector(): { x: number; y: number; z: number } {
    return { x: this._data[0], y: this._data[1], z: this._data[2] };
  }

  // Serialization
  toJSON(): { x: number; y: number; z: number } {
    return { x: this._data[0], y: this._data[1], z: this._data[2] };
  }

  static fromJSON(json: { x: number; y: number; z: number }): Vector3 {
    return new Vector3(json.x, json.y, json.z);
  }

  // Debug
  toString(): string {
    return `Vector3(${this._data[0].toFixed(3)}, ${this._data[1].toFixed(3)}, ${this._data[2].toFixed(3)})`;
  }
}