/**
 * Building entity — structures placed on the map.
 */

import { Entity } from './Entity';
import type { EntityId, PlayerId, FactionId } from '@/utils/Types';

export interface BuildingConfig {
  buildingType: string;
  maxHp: number;
  footprintW: number;   // tiles wide
  footprintH: number;   // tiles tall
  powerProduced: number;
  powerConsumed: number;
  cost: number;
  buildTime: number;     // seconds
  spriteKey: string;
  sightRange: number;
}

export type BuildingState = 'placing' | 'constructing' | 'active' | 'selling' | 'destroyed';

export class Building extends Entity {
  readonly buildingType: string;
  readonly footprintW: number;
  readonly footprintH: number;
  readonly powerProduced: number;
  readonly powerConsumed: number;
  readonly cost: number;
  readonly sightRange: number;

  state: BuildingState = 'active';
  constructionProgress = 1; // 0..1, 1 = complete

  constructor(
    id: EntityId,
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    config: BuildingConfig,
  ) {
    super(id, 'building', ownerId, factionId, tileX, tileY, config.maxHp, config.spriteKey);

    this.buildingType = config.buildingType;
    this.footprintW = config.footprintW;
    this.footprintH = config.footprintH;
    this.powerProduced = config.powerProduced;
    this.powerConsumed = config.powerConsumed;
    this.cost = config.cost;
    this.sightRange = config.sightRange;
  }

  update(_dt: number): void {
    // Building updates (construction progress, etc.) will be handled by BuildSystem
  }

  /** Net power contribution (positive = produces, negative = consumes) */
  getNetPower(): number {
    if (this.state !== 'active') return 0;
    return this.powerProduced - this.powerConsumed;
  }
}
