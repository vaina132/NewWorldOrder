/**
 * EntityManager — Creates, tracks, updates, and destroys all entities.
 * Central registry for all game objects.
 */

import Phaser from 'phaser';
import { Entity } from '@/entities/Entity';
import { Unit, type UnitConfig } from '@/entities/Unit';
import { Building, type BuildingConfig } from '@/entities/Building';
import { SpatialHash } from '@/utils/SpatialHash';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { getDepth } from '@/utils/IsometricUtils';
import type { EntityId, PlayerId, FactionId } from '@/utils/Types';
import { entityId } from '@/utils/Types';

export class EntityManager {
  private entities = new Map<EntityId, Entity>();
  private units = new Map<EntityId, Unit>();
  private buildings = new Map<EntityId, Building>();
  private nextId = 1;
  private scene: Phaser.Scene;
  readonly spatialHash = new SpatialHash(128);

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private generateId(): EntityId {
    return entityId(this.nextId++);
  }

  /** Spawn a unit on the map */
  spawnUnit(
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    config: UnitConfig,
  ): Unit {
    const id = this.generateId();
    const unit = new Unit(id, ownerId, factionId, tileX, tileY, config);

    // Create sprite
    const sprite = this.scene.add.sprite(unit.worldX, unit.worldY, 'game-atlas', config.spriteKey);
    sprite.setDepth(getDepth(unit.worldY));
    sprite.setOrigin(0.5, 0.8); // Anchor near feet
    unit.sprite = sprite;

    this.entities.set(id, unit);
    this.units.set(id, unit);
    this.spatialHash.update(id, unit.worldX, unit.worldY);

    gameEvents.emit(GameEvents.UNIT_CREATED, { id, unit });
    return unit;
  }

  /** Spawn a building on the map */
  spawnBuilding(
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    config: BuildingConfig,
  ): Building {
    const id = this.generateId();
    const building = new Building(id, ownerId, factionId, tileX, tileY, config);

    const sprite = this.scene.add.sprite(building.worldX, building.worldY, 'game-atlas', config.spriteKey);
    sprite.setDepth(getDepth(building.worldY));
    sprite.setOrigin(0.5, 0.8);
    building.sprite = sprite;

    this.entities.set(id, building);
    this.buildings.set(id, building);

    gameEvents.emit(GameEvents.BUILDING_PLACED, { id, building });
    return building;
  }

  /** Update all entities (called during fixed tick) */
  updateTick(dt: number): void {
    for (const unit of this.units.values()) {
      if (!unit.alive) continue;
      unit.savePreviousPosition();
      unit.update(dt);
      this.spatialHash.update(unit.id, unit.worldX, unit.worldY);
    }
  }

  /** Update sprite positions for rendering (called every frame with interpolation alpha) */
  updateRender(alpha: number): void {
    for (const entity of this.entities.values()) {
      if (!entity.alive || !entity.sprite) continue;
      const pos = entity.getInterpolatedPosition(alpha);
      entity.sprite.setPosition(pos.x, pos.y);
      entity.sprite.setDepth(getDepth(pos.y));
    }
  }

  /** Destroy an entity */
  destroy(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    entity.alive = false;
    entity.sprite?.destroy();
    entity.sprite = null;

    this.entities.delete(id);
    this.units.delete(id);
    this.buildings.delete(id);
    this.spatialHash.remove(id);

    if (entity.kind === 'unit') {
      gameEvents.emit(GameEvents.UNIT_DESTROYED, { id });
    } else if (entity.kind === 'building') {
      gameEvents.emit(GameEvents.BUILDING_DESTROYED, { id });
    }
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  getUnit(id: EntityId): Unit | undefined {
    return this.units.get(id);
  }

  getAllUnits(): IterableIterator<Unit> {
    return this.units.values();
  }

  getUnitsByOwner(ownerId: PlayerId): Unit[] {
    const result: Unit[] = [];
    for (const unit of this.units.values()) {
      if (unit.ownerId === ownerId && unit.alive) {
        result.push(unit);
      }
    }
    return result;
  }

  /** Get all entities within world-space radius */
  getEntitiesInRadius(worldX: number, worldY: number, radius: number): Entity[] {
    const ids = this.spatialHash.queryRadius(worldX, worldY, radius);
    const result: Entity[] = [];
    for (const id of ids) {
      const entity = this.entities.get(id);
      if (entity?.alive) result.push(entity);
    }
    return result;
  }

  get unitCount(): number {
    return this.units.size;
  }

  get entityCount(): number {
    return this.entities.size;
  }
}
