import { Entity, EntityId } from './Entity';
import { Component, ComponentRegistry } from './Component';
import { System, SystemPriority } from './System';

export interface WorldStats {
  entityCount: number;
  componentCount: number;
  systemCount: number;
  activeEntities: number;
  activeComponents: number;
  activeSystems: number;
  totalMemoryUsage: number;
  lastUpdateTime: number;
  averageUpdateTime: number;
  maxUpdateTime: number;
  minUpdateTime: number;
}

export class World {
  private _entities: Map<EntityId, Entity>;
  private _components: Map<EntityId, Map<string, Component>>;
  private _systems: Map<string, System>;
  private _systemOrder: System[];
  private _pendingEntities: Set<EntityId>;
  private _pendingRemovals: Set<EntityId>;
  private _lastUpdateTime: number;
  private _updateCount: number;
  private _totalUpdateTime: number;
  private _maxUpdateTime: number;
  private _minUpdateTime: number;
  private _fixedTimeStep: number;
  private _accumulator: number;

  constructor(fixedTimeStep = 1 / 60) {
    this._entities = new Map();
    this._components = new Map();
    this._systems = new Map();
    this._systemOrder = [];
    this._pendingEntities = new Set();
    this._pendingRemovals = new Set();
    this._lastUpdateTime = 0;
    this._updateCount = 0;
    this._totalUpdateTime = 0;
    this._maxUpdateTime = 0;
    this._minUpdateTime = Infinity;
    this._fixedTimeStep = fixedTimeStep;
    this._accumulator = 0;
  }

  // Entity management
  createEntity(name = 'Entity'): Entity {
    const entity = new Entity(name);
    this._entities.set(entity.id, entity);
    this._components.set(entity.id, new Map());
    this._pendingEntities.add(entity.id);
    return entity;
  }

  destroyEntity(entityId: EntityId): boolean {
    const entity = this._entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Mark for removal
    this._pendingRemovals.add(entityId);
    entity.destroy();
    return true;
  }

  getEntity(entityId: EntityId): Entity | undefined {
    return this._entities.get(entityId);
  }

  hasEntity(entityId: EntityId): boolean {
    return this._entities.has(entityId);
  }

  // Component management
  addComponent<T extends Component>(entityId: EntityId, component: T): boolean {
    const entity = this._entities.get(entityId);
    if (!entity || !entity.isActive()) {
      return false;
    }

    const entityComponents = this._components.get(entityId);
    if (!entityComponents) {
      return false;
    }

    const componentType = component.getComponentType();
    entityComponents.set(componentType, component);
    component.onAttach(entityId);

    // Notify systems about the new component
    this._notifySystemsOfComponentChange(entityId, componentType, true);

    return true;
  }

  removeComponent(entityId: EntityId, componentType: string): boolean {
    const entityComponents = this._components.get(entityId);
    if (!entityComponents) {
      return false;
    }

    const component = entityComponents.get(componentType);
    if (!component) {
      return false;
    }

    component.onDetach();
    entityComponents.delete(componentType);

    // Notify systems about the component removal
    this._notifySystemsOfComponentChange(entityId, componentType, false);

    return true;
  }

  getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined {
    const entityComponents = this._components.get(entityId);
    return entityComponents?.get(componentType) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentType: string): boolean {
    const entityComponents = this._components.get(entityId);
    return entityComponents?.has(componentType) ?? false;
  }

  getComponents(entityId: EntityId): Map<string, Component> | undefined {
    return this._components.get(entityId);
  }

  // System management
  addSystem(system: System): void {
    this._systems.set(system.name, system);
    this._updateSystemOrder();
    system.onInitialize?.();
  }

  removeSystem(systemName: string): boolean {
    const system = this._systems.get(systemName);
    if (!system) {
      return false;
    }

    system.onShutdown?.();
    this._systems.delete(systemName);
    this._updateSystemOrder();
    return true;
  }

  getSystem<T extends System>(systemName: string): T | undefined {
    return this._systems.get(systemName) as T | undefined;
  }

  hasSystem(systemName: string): boolean {
    return this._systems.has(systemName);
  }

  // Update loop
  update(deltaTime: number): void {
    const startTime = performance.now();

    // Process pending entity changes
    this._processPendingChanges();

    // Update systems
    for (const system of this._systemOrder) {
      if (system.isActive()) {
        system.update(deltaTime);
      }
    }

    // Fixed timestep updates
    this._accumulator += deltaTime;
    while (this._accumulator >= this._fixedTimeStep) {
      for (const system of this._systemOrder) {
        if (system.isActive()) {
          system.fixedUpdate(this._fixedTimeStep);
        }
      }
      this._accumulator -= this._fixedTimeStep;
    }

    // Late updates
    for (const system of this._systemOrder) {
      if (system.isActive()) {
        system.lateUpdate(deltaTime);
      }
    }

    const endTime = performance.now();
    this._lastUpdateTime = endTime - startTime;
    this._updateCount++;
    this._totalUpdateTime += this._lastUpdateTime;
    this._maxUpdateTime = Math.max(this._maxUpdateTime, this._lastUpdateTime);
    this._minUpdateTime = Math.min(this._minUpdateTime, this._lastUpdateTime);
  }

  // Query methods
  query(query: { all?: string[]; any?: string[]; none?: string[] }): EntityId[] {
    const results: EntityId[] = [];

    for (const [entityId, entity] of this._entities) {
      if (!entity.isActive()) continue;

      const entityComponents = this._components.get(entityId);
      if (!entityComponents) continue;

      const componentTypes = new Set(entityComponents.keys());
      if (this._matchesQuery(componentTypes, query)) {
        results.push(entityId);
      }
    }

    return results;
  }

  // Utility methods
  clear(): void {
    // Shutdown all systems
    for (const system of this._systems.values()) {
      system.onShutdown?.();
    }

    // Clear all data
    this._entities.clear();
    this._components.clear();
    this._systems.clear();
    this._systemOrder = [];
    this._pendingEntities.clear();
    this._pendingRemovals.clear();
  }

  getStats(): WorldStats {
    let activeEntities = 0;
    let activeComponents = 0;
    let totalMemoryUsage = 0;

    for (const entity of this._entities.values()) {
      if (entity.isActive()) {
        activeEntities++;
        const entityComponents = this._components.get(entity.id);
        if (entityComponents) {
          activeComponents += entityComponents.size;
        }
      }
    }

    return {
      entityCount: this._entities.size,
      componentCount: this._getTotalComponentCount(),
      systemCount: this._systems.size,
      activeEntities,
      activeComponents,
      activeSystems: this._getActiveSystemCount(),
      totalMemoryUsage,
      lastUpdateTime: this._lastUpdateTime,
      averageUpdateTime: this._updateCount > 0 ? this._totalUpdateTime / this._updateCount : 0,
      maxUpdateTime: this._maxUpdateTime,
      minUpdateTime: this._minUpdateTime === Infinity ? 0 : this._minUpdateTime,
    };
  }

  // Private methods
  private _processPendingChanges(): void {
    // Process entity additions
    for (const entityId of this._pendingEntities) {
      const entity = this._entities.get(entityId);
      const entityComponents = this._components.get(entityId);
      
      if (entity && entityComponents) {
        const componentTypes = new Set(entityComponents.keys());
        
        // Check which systems should track this entity
        for (const system of this._systems.values()) {
          if (system.matchesQuery(componentTypes)) {
            system.addEntity(entityId);
          }
        }
      }
    }
    this._pendingEntities.clear();

    // Process entity removals
    for (const entityId of this._pendingRemovals) {
      // Remove from all systems
      for (const system of this._systems.values()) {
        system.removeEntity(entityId);
      }

      // Clean up entity data
      this._entities.delete(entityId);
      this._components.delete(entityId);
    }
    this._pendingRemovals.clear();
  }

  private _notifySystemsOfComponentChange(entityId: EntityId, componentType: string, added: boolean): void {
    const entity = this._entities.get(entityId);
    if (!entity || !entity.isActive()) return;

    const entityComponents = this._components.get(entityId);
    if (!entityComponents) return;

    const componentTypes = new Set(entityComponents.keys());

    for (const system of this._systems.values()) {
      const matches = system.matchesQuery(componentTypes);
      const hasEntity = system.hasEntity(entityId);

      if (matches && !hasEntity) {
        system.addEntity(entityId);
      } else if (!matches && hasEntity) {
        system.removeEntity(entityId);
      }
    }
  }

  private _updateSystemOrder(): void {
    const priorityOrder: SystemPriority[] = ['critical', 'high', 'normal', 'low'];
    
    this._systemOrder = Array.from(this._systems.values()).sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.priority);
      const bIndex = priorityOrder.indexOf(b.priority);
      return aIndex - bIndex;
    });
  }

  private _matchesQuery(componentTypes: Set<string>, query: { all?: string[]; any?: string[]; none?: string[] }): boolean {
    // Check 'all' requirements
    if (query.all) {
      for (const componentType of query.all) {
        if (!componentTypes.has(componentType)) {
          return false;
        }
      }
    }

    // Check 'any' requirements
    if (query.any && query.any.length > 0) {
      let hasAny = false;
      for (const componentType of query.any) {
        if (componentTypes.has(componentType)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) {
        return false;
      }
    }

    // Check 'none' requirements
    if (query.none) {
      for (const componentType of query.none) {
        if (componentTypes.has(componentType)) {
          return false;
        }
      }
    }

    return true;
  }

  private _getTotalComponentCount(): number {
    let count = 0;
    for (const entityComponents of this._components.values()) {
      count += entityComponents.size;
    }
    return count;
  }

  private _getActiveSystemCount(): number {
    let count = 0;
    for (const system of this._systems.values()) {
      if (system.isActive()) {
        count++;
      }
    }
    return count;
  }

  // Serialization
  toJSON(): {
    entities: Record<EntityId, any>;
    systems: Record<string, any>;
    stats: WorldStats;
  } {
    const entities: Record<EntityId, any> = {};
    for (const [entityId, entity] of this._entities) {
      const entityComponents = this._components.get(entityId);
      const components: Record<string, any> = {};
      
      if (entityComponents) {
        for (const [componentType, component] of entityComponents) {
          components[componentType] = component.toJSON();
        }
      }

      entities[entityId] = {
        entity: entity.toJSON(),
        components,
      };
    }

    const systems: Record<string, any> = {};
    for (const [systemName, system] of this._systems) {
      systems[systemName] = system.toJSON();
    }

    return {
      entities,
      systems,
      stats: this.getStats(),
    };
  }
}