import { Entity, EntityId } from './Entity';

export abstract class Component {
  protected _entityId: EntityId | null = null;
  protected _active: boolean = true;
  protected _createdAt: number;
  protected _lastModified: number;

  constructor() {
    this._createdAt = performance.now();
    this._lastModified = this._createdAt;
  }

  // Getters
  get entityId(): EntityId | null { return this._entityId; }
  get active(): boolean { return this._active; }
  get createdAt(): number { return this._createdAt; }
  get lastModified(): number { return this._lastModified; }

  // Setters
  set active(value: boolean) {
    this._active = value;
    this._lastModified = performance.now();
  }

  // Lifecycle methods
  onAttach(entityId: EntityId): void {
    this._entityId = entityId;
    this._lastModified = performance.now();
  }

  onDetach(): void {
    this._entityId = null;
    this._lastModified = performance.now();
  }

  activate(): void {
    this._active = true;
    this._lastModified = performance.now();
  }

  deactivate(): void {
    this._active = false;
    this._lastModified = performance.now();
  }

  // Update lifecycle
  onUpdate?(deltaTime: number): void;
  onFixedUpdate?(fixedDeltaTime: number): void;
  onLateUpdate?(deltaTime: number): void;

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

  // Type information
  static getComponentType(): string {
    return this.name;
  }

  getComponentType(): string {
    return (this.constructor as typeof Component).getComponentType();
  }

  // Serialization
  abstract toJSON(): Record<string, any>;
  abstract fromJSON(json: Record<string, any>): void;

  // Debug
  toString(): string {
    return `${this.getComponentType()}(${this._entityId?.slice(0, 8)}..., active: ${this._active})`;
  }
}

// Type-safe component constructor
export type ComponentConstructor<T extends Component> = new () => T;

// Component type registry for type safety
export class ComponentRegistry {
  private static _components = new Map<string, ComponentConstructor<Component>>();

  static register<T extends Component>(componentClass: ComponentConstructor<T>): void {
    const typeName = componentClass.getComponentType();
    this._components.set(typeName, componentClass);
  }

  static get<T extends Component>(typeName: string): ComponentConstructor<T> | undefined {
    return this._components.get(typeName) as ComponentConstructor<T> | undefined;
  }

  static has(typeName: string): boolean {
    return this._components.has(typeName);
  }

  static getAllTypes(): string[] {
    return Array.from(this._components.keys());
  }

  static create<T extends Component>(typeName: string): T | null {
    const constructor = this.get<T>(typeName);
    return constructor ? new constructor() : null;
  }
}