/**
 * Harvester entity — Automatically gathers ore and returns to refinery.
 * FSM: IDLE → MOVING_TO_ORE → HARVESTING → RETURNING → UNLOADING → repeat
 */

import { Unit, type UnitConfig } from './Unit';
import { StateMachine } from '@/utils/StateMachine';
import { tileToWorld } from '@/utils/IsometricUtils';
import { distance } from '@/utils/MathUtils';
import { findPath } from '@/pathfinding/AStar';
import type { EntityId, PlayerId, FactionId, TileCoord } from '@/utils/Types';
import type { ResourceSystem } from '@/systems/ResourceSystem';
import type { NavGrid } from '@/pathfinding/NavGrid';
import type { PlayerState } from '@/systems/PlayerState';

export type HarvesterState = 'idle' | 'moving_to_ore' | 'harvesting' | 'returning' | 'unloading';

const CARGO_CAPACITY = 1000;      // max ore cargo
const HARVEST_RATE = 70;          // ore per second
const UNLOAD_RATE = 200;          // ore per second
const HARVEST_RANGE = 1.5;        // tiles

export class Harvester extends Unit {
  harvesterFsm: StateMachine<HarvesterState, Harvester>;

  cargo = 0;
  cargoIsGem = false;
  targetOre: TileCoord | null = null;
  refineryTile: TileCoord | null = null;

  private resourceSystem: ResourceSystem | null = null;
  private navGrid: NavGrid | null = null;
  private playerState: PlayerState | null = null;

  constructor(
    id: EntityId,
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    config: UnitConfig,
  ) {
    super(id, ownerId, factionId, tileX, tileY, config);

    this.harvesterFsm = new StateMachine<HarvesterState, Harvester>('idle', this);
    this.harvesterFsm
      .addState('idle', {
        onEnter: (h) => { h.findOreAndGo(); },
      })
      .addState('moving_to_ore', {
        onUpdate: (h, dt) => { h.updateMoveToOre(dt); },
      })
      .addState('harvesting', {
        onUpdate: (h, dt) => { h.updateHarvesting(dt); },
      })
      .addState('returning', {
        onUpdate: (h, dt) => { h.updateReturning(dt); },
      })
      .addState('unloading', {
        onUpdate: (h, dt) => { h.updateUnloading(dt); },
      });
  }

  /** Bind to game systems (called after construction) */
  bind(resourceSystem: ResourceSystem, navGrid: NavGrid, playerState: PlayerState): void {
    this.resourceSystem = resourceSystem;
    this.navGrid = navGrid;
    this.playerState = playerState;
    this.harvesterFsm.start();
  }

  /** Set home refinery position */
  setRefinery(tile: TileCoord): void {
    this.refineryTile = tile;
  }

  override update(dt: number): void {
    this.harvesterFsm.update(dt);
    // Also update base movement via parent FSM
    super.update(dt);
  }

  private findOreAndGo(): void {
    if (!this.resourceSystem || !this.navGrid) return;

    const ore = this.resourceSystem.findNearestOre(this.tileX, this.tileY);
    if (!ore) return; // No ore available

    this.targetOre = ore;
    const path = findPath(this.navGrid, this.tileX, this.tileY, ore.tileX, ore.tileY);
    if (path.length > 0) {
      this.startMoving(path);
      this.harvesterFsm.transition('moving_to_ore');
    }
  }

  private updateMoveToOre(_dt: number): void {
    if (!this.targetOre) {
      this.harvesterFsm.transition('idle');
      return;
    }

    // Check if we've arrived near the ore
    const oreWorld = tileToWorld(this.targetOre.tileX, this.targetOre.tileY);
    const dist = distance(this.worldX, this.worldY, oreWorld.x, oreWorld.y);

    if (dist < HARVEST_RANGE * 32) {
      this.stop();
      this.harvesterFsm.transition('harvesting');
    }

    // If path completed but not at ore (path was blocked), try again
    if (!this.isMoving && this.fsm.is('idle')) {
      this.harvesterFsm.transition('idle'); // Will re-search
    }
  }

  private updateHarvesting(dt: number): void {
    if (!this.resourceSystem || !this.targetOre) {
      this.harvesterFsm.transition('idle');
      return;
    }

    // Harvest ore
    const harvestAmount = HARVEST_RATE * dt;
    const harvested = this.resourceSystem.harvest(this.targetOre.tileX, this.targetOre.tileY, harvestAmount);

    if (harvested > 0) {
      this.cargo += harvested;
      const field = this.resourceSystem.getOreAt(this.targetOre.tileX, this.targetOre.tileY);
      if (field) this.cargoIsGem = field.isGem;
    }

    // Full cargo? Return to refinery
    if (this.cargo >= CARGO_CAPACITY) {
      this.cargo = CARGO_CAPACITY;
      this.goToRefinery();
      return;
    }

    // Ore depleted? Find new ore or return if we have cargo
    if (harvested <= 0) {
      if (this.cargo > 0) {
        this.goToRefinery();
      } else {
        this.harvesterFsm.transition('idle'); // Find new ore
      }
    }
  }

  private goToRefinery(): void {
    if (!this.refineryTile || !this.navGrid) return;

    const path = findPath(this.navGrid, this.tileX, this.tileY, this.refineryTile.tileX, this.refineryTile.tileY);
    if (path.length > 0) {
      this.startMoving(path);
      this.harvesterFsm.transition('returning');
    }
  }

  private updateReturning(_dt: number): void {
    if (!this.refineryTile) return;

    const refWorld = tileToWorld(this.refineryTile.tileX, this.refineryTile.tileY);
    const dist = distance(this.worldX, this.worldY, refWorld.x, refWorld.y);

    if (dist < 2 * 32) {
      this.stop();
      this.harvesterFsm.transition('unloading');
    }

    if (!this.isMoving && this.fsm.is('idle')) {
      // Path completed
      this.harvesterFsm.transition('unloading');
    }
  }

  private updateUnloading(dt: number): void {
    if (!this.playerState || !this.resourceSystem) return;

    const unloadAmount = Math.min(UNLOAD_RATE * dt, this.cargo);
    this.cargo -= unloadAmount;

    const creditValue = this.resourceSystem.getOreValue(unloadAmount, this.cargoIsGem);
    this.playerState.addCredits(creditValue);

    if (this.cargo <= 0) {
      this.cargo = 0;
      this.harvesterFsm.transition('idle'); // Go get more ore
    }
  }

  get cargoPercent(): number {
    return this.cargo / CARGO_CAPACITY;
  }
}
