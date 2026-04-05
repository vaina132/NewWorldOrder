/**
 * AISystem — Controls AI opponent behavior.
 * Follows a scripted build order, produces army, attacks player.
 * Difficulty affects timing, resources, and decision-making.
 */

import type { EntityManager } from './EntityManager';
import type { BuildSystem } from './BuildSystem';
import type { ProductionSystem } from './ProductionSystem';
import type { PlayerState } from './PlayerState';
import type { CombatSystem } from './CombatSystem';
import { getFaction } from '@/config/FactionRegistry';
import { tileToWorld, tileDistanceEuclidean } from '@/utils/IsometricUtils';
import type { AIConfig } from '@/config/AIConfig';
import type { PlayerId, FactionId, EntityId } from '@/utils/Types';

type AIState = 'building_base' | 'producing_army' | 'attacking' | 'defending';

/** Fixed build order for AI */
const AI_BUILD_ORDER = [
  'power_plant', 'ore_refinery', 'barracks', 'power_plant',
  'war_factory', 'power_plant', 'ore_refinery',
];

/** Army composition priorities */
const ARMY_COMPOSITION: Record<FactionId, string[]> = {
  ac: ['rifleman', 'rifleman', 'light_tank', 'rifleman', 'light_tank', 'light_tank'],
  ip: ['conscript', 'conscript', 'conscript', 'heavy_tank', 'conscript', 'heavy_tank'],
};

export class AISystem {
  private entityManager: EntityManager;
  private buildSystem: BuildSystem;
  private productionSystem: ProductionSystem;
  private playerState: PlayerState;
  private combatSystem: CombatSystem;
  private config: AIConfig;
  private playerId: PlayerId;
  private factionId: FactionId;

  private state: AIState = 'building_base';
  private gameTime = 0;
  private lastAttackTime = 0;
  private buildOrderIndex = 0;
  private armyCompositionIndex = 0;
  private buildCooldown = 0;
  private produceCooldown = 0;

  // Track the enemy player
  private enemyPlayerId: PlayerId;

  constructor(
    entityManager: EntityManager,
    buildSystem: BuildSystem,
    productionSystem: ProductionSystem,
    playerState: PlayerState,
    combatSystem: CombatSystem,
    config: AIConfig,
    enemyPlayerId: PlayerId,
  ) {
    this.entityManager = entityManager;
    this.buildSystem = buildSystem;
    this.productionSystem = productionSystem;
    this.playerState = playerState;
    this.combatSystem = combatSystem;
    this.config = config;
    this.playerId = playerState.playerId;
    this.factionId = playerState.factionId;
    this.enemyPlayerId = enemyPlayerId;
  }

  update(dt: number): void {
    this.gameTime += dt;
    this.buildCooldown -= dt;
    this.produceCooldown -= dt;

    // AI resource bonus
    if (this.config.resourceMultiplier > 1) {
      this.playerState.addCredits(dt * 2 * (this.config.resourceMultiplier - 1));
    }

    switch (this.state) {
      case 'building_base':
        this.updateBuildBase();
        break;
      case 'producing_army':
        this.updateProduceArmy();
        break;
      case 'attacking':
        this.updateAttacking();
        break;
      case 'defending':
        this.updateDefending();
        break;
    }
  }

  private updateBuildBase(): void {
    if (this.buildCooldown > 0) return;

    if (this.buildOrderIndex < AI_BUILD_ORDER.length) {
      const buildingType = AI_BUILD_ORDER[this.buildOrderIndex]!;

      // Try to start building
      const item = this.buildSystem.getBuildItem(this.playerId);
      if (!item) {
        // Remap building type for IP faction
        const actualType = this.remapBuildingType(buildingType);
        if (this.buildSystem.startBuild(this.playerId, actualType)) {
          this.buildCooldown = 2; // Wait before next action
        }
      } else if (item.ready) {
        // Place building near base
        const placed = this.autoPlaceBuilding();
        if (placed) {
          this.buildOrderIndex++;
          this.buildCooldown = 1;
        }
      }
    } else {
      // Build order complete, start producing army
      this.state = 'producing_army';
    }
  }

  private updateProduceArmy(): void {
    if (this.produceCooldown > 0) return;

    // Count current army
    const myUnits = this.entityManager.getUnitsByOwner(this.playerId);
    const armyUnits = myUnits.filter(u => u.unitType !== 'chrono_harvester' && u.unitType !== 'war_harvester');

    if (armyUnits.length >= this.config.maxArmySize) {
      // Army is large enough, attack!
      if (this.gameTime >= this.config.firstAttackTime ||
          this.gameTime - this.lastAttackTime >= this.config.attackInterval) {
        this.state = 'attacking';
        this.launchAttack();
      }
      return;
    }

    // Find a factory to produce from
    const factories = this.findFactories();
    if (factories.length === 0) return;

    // Pick next unit type from composition
    const composition = ARMY_COMPOSITION[this.factionId] ?? ['conscript'];
    const unitType = composition[this.armyCompositionIndex % composition.length]!;
    this.armyCompositionIndex++;

    // Try to produce at first available factory
    for (const factoryId of factories) {
      if (this.productionSystem.startProduction(this.playerId, unitType, factoryId)) {
        this.produceCooldown = 1;
        break;
      }
    }

    // Also keep building if we have money
    if (this.playerState.credits > 3000 && !this.buildSystem.getBuildItem(this.playerId)) {
      this.buildSystem.startBuild(this.playerId, this.remapBuildingType('power_plant'));
    }
  }

  private updateAttacking(): void {
    // Check if army is mostly dead, retreat
    const myUnits = this.entityManager.getUnitsByOwner(this.playerId);
    const armyUnits = myUnits.filter(u => u.unitType !== 'chrono_harvester' && u.unitType !== 'war_harvester');

    if (armyUnits.length < 3) {
      this.state = 'producing_army';
      this.lastAttackTime = this.gameTime;
      return;
    }

    // Continue producing while attacking
    this.updateProduceArmy();
  }

  private updateDefending(): void {
    // For now, same as producing
    this.updateProduceArmy();
  }

  private launchAttack(): void {
    const myUnits = this.entityManager.getUnitsByOwner(this.playerId);
    const armyUnits = myUnits.filter(u =>
      u.unitType !== 'chrono_harvester' && u.unitType !== 'war_harvester' && u.alive
    );

    if (armyUnits.length === 0) return;

    // Find enemy buildings
    const enemyUnits = this.entityManager.getUnitsByOwner(this.enemyPlayerId);
    let targetX = 24;
    let targetY = 24;

    // Target enemy base area
    for (const building of this.entityManager['buildings'].values() as IterableIterator<import('@/entities/Building').Building>) {
      if (building.ownerId === this.enemyPlayerId && building.alive) {
        targetX = building.tileX;
        targetY = building.tileY;
        break;
      }
    }

    // Send all army units to attack
    for (const unit of armyUnits) {
      if (unit.fsm.is('idle') || unit.fsm.is('guarding')) {
        // Simple attack-move: just move toward enemy base
        unit.startMoving([{ tileX: targetX, tileY: targetY }]);
      }
    }

    this.lastAttackTime = this.gameTime;
  }

  private autoPlaceBuilding(): boolean {
    // Find a valid placement spot near existing buildings
    for (const building of this.entityManager['buildings'].values() as IterableIterator<import('@/entities/Building').Building>) {
      if (building.ownerId !== this.playerId || !building.alive) continue;

      // Try spots around this building
      const offsets = [[3, 0], [0, 3], [-3, 0], [0, -3], [3, 3], [-3, 3]];
      for (const [dx, dy] of offsets) {
        const tx = building.tileX + dx!;
        const ty = building.tileY + dy!;

        const placed = this.buildSystem.placeBuilding(this.playerId, tx, ty);
        if (placed) return true;
      }
    }
    return false;
  }

  private findFactories(): EntityId[] {
    const factories: EntityId[] = [];
    for (const building of this.entityManager['buildings'].values() as IterableIterator<import('@/entities/Building').Building>) {
      if (building.ownerId !== this.playerId || !building.alive) continue;
      if (building.buildingType === 'barracks' || building.buildingType === 'war_factory') {
        factories.push(building.id);
      }
    }
    return factories;
  }

  private remapBuildingType(type: string): string {
    if (this.factionId === 'ip') {
      if (type === 'power_plant') return 'tesla_reactor';
    }
    return type;
  }
}
