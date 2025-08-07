import { Entity, EntityId } from './Entity';
import { Component } from './Component';

export type SystemPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SystemQuery {
  all?: string[];
  any?: string[];
  none?: string[];
}

export abstract class System {
  protected _name: string;
  protected _priority: SystemPriority;
  protected _active: boolean;
  protected _enabled: boolean;
  protected _query: SystemQuery;
  protected _entities: Set<EntityId>;
  protected _lastUpdateTime: number;
  protected _updateCount: number;
  protected _totalUpdateTime: number;
  protected _maxUpdateTime: number;
  protected _minUpdateTime: number;

  constructor(name: string, priority: SystemPriority = 'normal', query: SystemQuery = {}) {
    this._name = name;
    this._priority = priority;
    this._active = true;
    this._enabled = true;
    this._query = query;
    this._entities = new Set();
    this._lastUpdateTime = 0;
    this._updateCount = 0;
    this._totalUpdateTime = 0;
    this._maxUpdateTime = 0;
    this._minUpdateTime = Infinity;
  }

  // Getters
  get name(): string { return this._name; }
  get priority(): SystemPriority { return this._priority; }
  get active(): boolean { return this._active; }
  get enabled(): boolean { return this._enabled; }
  get query(): SystemQuery { return this._query; }
  get entities(): Set<EntityId> { return this._entities; }
  get entityCount(): number { return this._entities.size; }

  // Performance metrics
  get lastUpdateTime(): number { return this._lastUpdateTime; }
  get updateCount(): number { return this._updateCount; }
  get averageUpdateTime(): number {
    return this._updateCount > 0 ? this._totalUpdateTime / this._updateCount : 0;
  }
  get maxUpdateTime(): number { return this._maxUpdateTime; }
  get minUpdateTime(): number { return this._minUpdateTime === Infinity ? 0 : this._minUpdateTime; }

  // Setters
  set active(value: boolean) { this._active = value; }
  set enabled(value: boolean) { this._enabled = value; }

  // Lifecycle methods
  onInitialize?(): void;
  onShutdown?(): void;

  onEntityAdded?(entityId: EntityId): void;
  onEntityRemoved?(entityId: EntityId): void;

  // Update methods
  update(deltaTime: number): void {
    if (!this._active || !this._enabled || this._entities.size === 0) {
      return;
    }

    const startTime = performance.now();
    
    try {
      this.onUpdate(deltaTime);
    } catch (error) {
      console.error(`Error in system ${this._name}:`, error);
    }

    const endTime = performance.now();
    this._lastUpdateTime = endTime - startTime;
    this._updateCount++;
    this._totalUpdateTime += this._lastUpdateTime;
    this._maxUpdateTime = Math.max(this._maxUpdateTime, this._lastUpdateTime);
    this._minUpdateTime = Math.min(this._minUpdateTime, this._lastUpdateTime);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (!this._active || !this._enabled || this._entities.size === 0) {
      return;
    }

    try {
      this.onFixedUpdate?.(fixedDeltaTime);
    } catch (error) {
      console.error(`Error in system ${this._name} fixedUpdate:`, error);
    }
  }

  lateUpdate(deltaTime: number): void {
    if (!this._active || !this._enabled || this._entities.size === 0) {
      return;
    }

    try {
      this.onLateUpdate?.(deltaTime);
    } catch (error) {
      console.error(`Error in system ${this._name} lateUpdate:`, error);
    }
  }

  // Abstract update method that systems must implement
  protected abstract onUpdate(deltaTime: number): void;

  // Entity management
  addEntity(entityId: EntityId): void {
    if (!this._entities.has(entityId)) {
      this._entities.add(entityId);
      this.onEntityAdded?.(entityId);
    }
  }

  removeEntity(entityId: EntityId): void {
    if (this._entities.has(entityId)) {
      this._entities.delete(entityId);
      this.onEntityRemoved?.(entityId);
    }
  }

  hasEntity(entityId: EntityId): boolean {
    return this._entities.has(entityId);
  }

  clearEntities(): void {
    this._entities.clear();
  }

  // Query validation
  matchesQuery(entityComponents: Set<string>): boolean {
    // Check 'all' requirements
    if (this._query.all) {
      for (const componentType of this._query.all) {
        if (!entityComponents.has(componentType)) {
          return false;
        }
      }
    }

    // Check 'any' requirements
    if (this._query.any && this._query.any.length > 0) {
      let hasAny = false;
      for (const componentType of this._query.any) {
        if (entityComponents.has(componentType)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) {
        return false;
      }
    }

    // Check 'none' requirements
    if (this._query.none) {
      for (const componentType of this._query.none) {
        if (entityComponents.has(componentType)) {
          return false;
        }
      }
    }

    return true;
  }

  // Performance monitoring
  resetMetrics(): void {
    this._updateCount = 0;
    this._totalUpdateTime = 0;
    this._maxUpdateTime = 0;
    this._minUpdateTime = Infinity;
  }

  getPerformanceReport(): {
    name: string;
    entityCount: number;
    updateCount: number;
    averageUpdateTime: number;
    maxUpdateTime: number;
    minUpdateTime: number;
    lastUpdateTime: number;
  } {
    return {
      name: this._name,
      entityCount: this._entities.size,
      updateCount: this._updateCount,
      averageUpdateTime: this.averageUpdateTime,
      maxUpdateTime: this._maxUpdateTime,
      minUpdateTime: this._minUpdateTime,
      lastUpdateTime: this._lastUpdateTime,
    };
  }

  // Utility methods
  isActive(): boolean {
    return this._active && this._enabled;
  }

  // Serialization
  toJSON(): {
    name: string;
    priority: SystemPriority;
    active: boolean;
    enabled: boolean;
    query: SystemQuery;
    entityCount: number;
    performance: ReturnType<System['getPerformanceReport']>;
  } {
    return {
      name: this._name,
      priority: this._priority,
      active: this._active,
      enabled: this._enabled,
      query: this._query,
      entityCount: this._entities.size,
      performance: this.getPerformanceReport(),
    };
  }

  // Debug
  toString(): string {
    return `System(${this._name}, priority: ${this._priority}, entities: ${this._entities.size}, active: ${this._active})`;
  }
}