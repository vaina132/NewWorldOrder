/**
 * ProductionSystem — Per-factory unit production queues.
 * Barracks → infantry, War Factory → vehicles.
 * Multiple same-type factories give −15% build time bonus each.
 */

import type { EntityManager } from './EntityManager';
import type { PlayerState } from './PlayerState';
import { Unit, type UnitConfig } from '@/entities/Unit';
import { getFaction } from '@/config/FactionRegistry';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import type { PlayerId, EntityId, TileCoord } from '@/utils/Types';

interface ProductionQueueItem {
  unitType: string;
  config: UnitConfig;
  progress: number;     // 0..1
  totalTime: number;    // seconds (after speed bonus)
  factoryId: EntityId;
}

/** Which building type produces which unit categories */
const FACTORY_MAP: Record<string, string[]> = {
  barracks: ['infantry'],
  war_factory: ['vehicle', 'heavyVehicle'],
  naval_yard: ['naval'],
  air_force_command: ['aircraft'],
};

const MULTI_FACTORY_BONUS = 0.15; // 15% faster per additional factory

export class ProductionSystem {
  private entityManager: EntityManager;
  private playerStates: Map<PlayerId, PlayerState>;

  // One queue per factory
  private queues = new Map<EntityId, ProductionQueueItem | null>();
  private rallyPoints = new Map<EntityId, TileCoord>();

  constructor(entityManager: EntityManager, playerStates: Map<PlayerId, PlayerState>) {
    this.entityManager = entityManager;
    this.playerStates = playerStates;
  }

  /** Start producing a unit at a factory */
  startProduction(playerId: PlayerId, unitType: string, factoryId: EntityId): boolean {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return false;

    const faction = getFaction(playerState.factionId);
    const config = faction.units[unitType];
    if (!config) return false;

    // Already producing at this factory?
    if (this.queues.get(factoryId)) return false;

    // Can afford?
    if (!playerState.spendCredits(config.cost)) return false;

    // Calculate build time with multi-factory bonus
    const factoryCount = this.countFactoriesOfType(playerId, factoryId);
    const timeMultiplier = Math.max(0.3, 1 - (factoryCount - 1) * MULTI_FACTORY_BONUS);
    const totalTime = config.buildTime * timeMultiplier;

    this.queues.set(factoryId, {
      unitType, config, progress: 0, totalTime, factoryId,
    });

    gameEvents.emit(GameEvents.PRODUCTION_STARTED, { playerId, unitType, factoryId });
    return true;
  }

  /** Cancel production at a factory, refund 50% */
  cancelProduction(factoryId: EntityId): void {
    const item = this.queues.get(factoryId);
    if (!item) return;

    const factory = this.entityManager.getEntity(factoryId);
    if (factory) {
      const playerState = this.playerStates.get(factory.ownerId);
      playerState?.addCredits(Math.floor(item.config.cost * 0.5));
    }
    this.queues.set(factoryId, null);
  }

  /** Set rally point for a factory */
  setRallyPoint(factoryId: EntityId, target: TileCoord): void {
    this.rallyPoints.set(factoryId, target);
  }

  /** Update all production queues */
  update(dt: number): void {
    for (const [factoryId, item] of this.queues) {
      if (!item) continue;

      const factory = this.entityManager.getEntity(factoryId);
      if (!factory?.alive) {
        this.queues.delete(factoryId);
        continue;
      }

      const playerState = this.playerStates.get(factory.ownerId);
      const speedMul = playerState?.productionSpeedMultiplier ?? 1;

      item.progress += (dt / item.totalTime) * speedMul;

      if (item.progress >= 1) {
        this.completeProduction(factoryId, item, factory.ownerId, factory.factionId);
      }
    }
  }

  private completeProduction(factoryId: EntityId, item: ProductionQueueItem, ownerId: PlayerId, factionId: import('@/utils/Types').FactionId): void {
    const factory = this.entityManager.getEntity(factoryId);
    if (!factory) return;

    // Spawn unit near factory exit
    const spawnX = factory.tileX + 2;
    const spawnY = factory.tileY + 2;

    const unit = this.entityManager.spawnUnit(ownerId, factionId, spawnX, spawnY, item.config);

    // Move to rally point if set
    const rally = this.rallyPoints.get(factoryId);
    if (rally && unit instanceof Unit) {
      // Rally point movement will be handled by CommandSystem in future
      // For now, units spawn at factory exit
    }

    // Clear queue
    this.queues.set(factoryId, null);
    gameEvents.emit(GameEvents.PRODUCTION_COMPLETED, { factoryId, unitType: item.unitType });
  }

  /** Count factories of the same building type owned by a player */
  private countFactoriesOfType(playerId: PlayerId, factoryId: EntityId): number {
    const factory = this.entityManager.getEntity(factoryId);
    if (!factory || factory.kind !== 'building') return 1;
    const building = factory as import('@/entities/Building').Building;
    let count = 0;
    for (const b of this.entityManager['buildings'].values()) {
      if (b.ownerId === playerId && b.alive && b.buildingType === building.buildingType) {
        count++;
      }
    }
    return Math.max(1, count);
  }

  /** Get production item for a factory */
  getProductionItem(factoryId: EntityId): ProductionQueueItem | null {
    return this.queues.get(factoryId) ?? null;
  }

  /** Get which unit types a building can produce */
  getProducibleUnits(buildingType: string, factionId: import('@/utils/Types').FactionId): UnitConfig[] {
    const categories = FACTORY_MAP[buildingType];
    if (!categories) return [];

    const faction = getFaction(factionId);
    return Object.values(faction.units).filter(u => categories.includes(u.category));
  }
}
