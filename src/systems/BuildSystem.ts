/**
 * BuildSystem — Manages building construction queues and placement.
 * One build queue per Construction Yard.
 */

import type { EntityManager } from './EntityManager';
import type { PlayerState } from './PlayerState';
import type { NavGrid } from '@/pathfinding/NavGrid';
import type { ResourceSystem } from './ResourceSystem';
import { Building, type BuildingConfig } from '@/entities/Building';
import { Harvester } from '@/entities/Harvester';
import { getFaction } from '@/config/FactionRegistry';
import { isInBounds, tileDistanceEuclidean } from '@/utils/IsometricUtils';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import type { PlayerId, FactionId, TileCoord, EntityId } from '@/utils/Types';

export interface BuildQueueItem {
  buildingType: string;
  config: BuildingConfig;
  progress: number;     // 0..1
  totalTime: number;    // seconds
  ready: boolean;
}

const BUILD_RADIUS = 6; // tiles from any owned building

export class BuildSystem {
  private entityManager: EntityManager;
  private navGrid: NavGrid;
  private resourceSystem: ResourceSystem;
  private playerStates: Map<PlayerId, PlayerState>;

  // One queue per player (single CY assumption for now)
  private buildQueues = new Map<PlayerId, BuildQueueItem | null>();

  // Track building placement mode
  private placementMode: { playerId: PlayerId; buildingType: string; config: BuildingConfig } | null = null;

  constructor(
    entityManager: EntityManager,
    navGrid: NavGrid,
    resourceSystem: ResourceSystem,
    playerStates: Map<PlayerId, PlayerState>,
  ) {
    this.entityManager = entityManager;
    this.navGrid = navGrid;
    this.resourceSystem = resourceSystem;
    this.playerStates = playerStates;
  }

  /** Start building something */
  startBuild(playerId: PlayerId, buildingType: string): boolean {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return false;

    const faction = getFaction(playerState.factionId);
    const config = faction.buildings[buildingType];
    if (!config) return false;

    // Already building?
    if (this.buildQueues.get(playerId)) return false;

    // Can afford?
    if (!playerState.spendCredits(config.cost)) return false;

    this.buildQueues.set(playerId, {
      buildingType,
      config,
      progress: 0,
      totalTime: config.buildTime,
      ready: false,
    });

    gameEvents.emit(GameEvents.PRODUCTION_STARTED, { playerId, buildingType });
    return true;
  }

  /** Cancel current build, refund 50% */
  cancelBuild(playerId: PlayerId): void {
    const item = this.buildQueues.get(playerId);
    if (!item) return;

    const playerState = this.playerStates.get(playerId);
    playerState?.addCredits(Math.floor(item.config.cost * 0.5));
    this.buildQueues.set(playerId, null);
  }

  /** Update build progress each tick */
  update(dt: number): void {
    for (const [playerId, item] of this.buildQueues) {
      if (!item || item.ready) continue;

      const playerState = this.playerStates.get(playerId);
      const speedMul = playerState?.productionSpeedMultiplier ?? 1;

      item.progress += (dt / item.totalTime) * speedMul;
      if (item.progress >= 1) {
        item.progress = 1;
        item.ready = true;
        gameEvents.emit(GameEvents.PRODUCTION_COMPLETED, { playerId, buildingType: item.buildingType });
      }
    }
  }

  /** Place a completed building on the map */
  placeBuilding(playerId: PlayerId, tileX: number, tileY: number): Building | null {
    const item = this.buildQueues.get(playerId);
    if (!item || !item.ready) return null;

    const playerState = this.playerStates.get(playerId);
    if (!playerState) return null;

    // Validate placement
    if (!this.isValidPlacement(playerId, playerState.factionId, tileX, tileY, item.config)) {
      return null;
    }

    // Spawn building
    const building = this.entityManager.spawnBuilding(
      playerId, playerState.factionId, tileX, tileY, item.config,
    );

    // Block nav grid
    this.navGrid.blockFootprint(tileX, tileY, item.config.footprintW, item.config.footprintH);

    // Clear queue
    this.buildQueues.set(playerId, null);

    // Special: Refinery spawns a free harvester
    if (item.buildingType === 'ore_refinery') {
      this.spawnFreeHarvester(playerId, playerState.factionId, tileX, tileY);
    }

    return building;
  }

  /** Spawn a free harvester next to a refinery */
  private spawnFreeHarvester(playerId: PlayerId, factionId: FactionId, refTileX: number, refTileY: number): void {
    const faction = getFaction(factionId);
    const harvesterType = factionId === 'ac' ? 'chrono_harvester' : 'war_harvester';
    const config = faction.units[harvesterType];
    if (!config) return;

    // Spawn adjacent to refinery
    const spawnX = refTileX + 3;
    const spawnY = refTileY + 1;

    const harvester = this.entityManager.spawnUnit(playerId, factionId, spawnX, spawnY, config);

    // If it's a Harvester, bind it
    if (harvester instanceof Harvester) {
      const playerState = this.playerStates.get(playerId);
      if (playerState) {
        harvester.setRefinery({ tileX: refTileX, tileY: refTileY });
        harvester.bind(this.resourceSystem, this.navGrid, playerState);
      }
    }
  }

  /** Check if a building can be placed at the given position */
  isValidPlacement(playerId: PlayerId, factionId: FactionId, tileX: number, tileY: number, config: BuildingConfig): boolean {
    const { footprintW, footprintH } = config;

    // Check all tiles in footprint
    for (let dy = 0; dy < footprintH; dy++) {
      for (let dx = 0; dx < footprintW; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;

        // In bounds?
        if (!isInBounds(tx, ty, this.navGrid.width, this.navGrid.height)) return false;

        // Walkable (not water, not occupied)?
        if (!this.navGrid.isWalkable(tx, ty)) return false;
      }
    }

    // Within build radius of an existing building?
    return this.isWithinBuildRadius(playerId, tileX, tileY);
  }

  /** Check if position is within build radius of any owned building */
  private isWithinBuildRadius(playerId: PlayerId, tileX: number, tileY: number): boolean {
    for (const building of this.entityManager['buildings'].values()) {
      if (building.ownerId !== playerId || !building.alive) continue;
      const dist = tileDistanceEuclidean(tileX, tileY, building.tileX, building.tileY);
      if (dist <= BUILD_RADIUS) return true;
    }
    return false;
  }

  /** Get current build queue item for a player */
  getBuildItem(playerId: PlayerId): BuildQueueItem | null {
    return this.buildQueues.get(playerId) ?? null;
  }

  /** Enter placement mode */
  enterPlacementMode(playerId: PlayerId): void {
    const item = this.buildQueues.get(playerId);
    if (!item?.ready) return;
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;
    this.placementMode = { playerId, buildingType: item.buildingType, config: item.config };
  }

  /** Get current placement mode */
  getPlacementMode() { return this.placementMode; }

  /** Exit placement mode */
  exitPlacementMode(): void {
    this.placementMode = null;
  }
}
