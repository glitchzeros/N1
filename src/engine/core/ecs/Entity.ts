import { v4 as uuidv4 } from 'uuid';

export type EntityId = string;

export class Entity {
  private _id: EntityId;
  private _name: string;
  private _active: boolean;
  private _createdAt: number;
  private _lastModified: number;

  constructor(name = 'Entity') {
    this._id = uuidv4();
    this._name = name;
    this._active = true;
    this._createdAt = performance.now();
    this._lastModified = this._createdAt;
  }

  // Getters
  get id(): EntityId { return this._id; }
  get name(): string { return this._name; }
  get active(): boolean { return this._active; }
  get createdAt(): number { return this._createdAt; }
  get lastModified(): number { return this._lastModified; }

  // Setters
  set name(value: string) {
    this._name = value;
    this._lastModified = performance.now();
  }

  set active(value: boolean) {
    this._active = value;
    this._lastModified = performance.now();
  }

  // Lifecycle methods
  activate(): void {
    this._active = true;
    this._lastModified = performance.now();
  }

  deactivate(): void {
    this._active = false;
    this._lastModified = performance.now();
  }

  destroy(): void {
    this._active = false;
    this._lastModified = performance.now();
  }

  // Utility methods
  isActive(): boolean {
    return this._active;
  }

  getAge(): number {
    return performance.now() - this._createdAt;
  }

  getTimeSinceModified(): number {
    return performance.now() - this._lastModified;
  }

  // Serialization
  toJSON(): {
    id: EntityId;
    name: string;
    active: boolean;
    createdAt: number;
    lastModified: number;
  } {
    return {
      id: this._id,
      name: this._name,
      active: this._active,
      createdAt: this._createdAt,
      lastModified: this._lastModified,
    };
  }

  static fromJSON(json: {
    id: EntityId;
    name: string;
    active: boolean;
    createdAt: number;
    lastModified: number;
  }): Entity {
    const entity = new Entity(json.name);
    entity._id = json.id;
    entity._active = json.active;
    entity._createdAt = json.createdAt;
    entity._lastModified = json.lastModified;
    return entity;
  }

  // Debug
  toString(): string {
    return `Entity(${this._id.slice(0, 8)}..., "${this._name}", active: ${this._active})`;
  }
}