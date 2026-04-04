/**
 * ResourceSystem — Manages ore fields on the map.
 * Ore depletes when harvested, slowly regenerates over time.
 * Gems have higher value but don't regenerate.
 */

import type { TileCoord } from '@/utils/Types';
import { tileDistanceEuclidean } from '@/utils/IsometricUtils';

export interface OreField {
  tileX: number;
  tileY: number;
  amount: number;
  maxAmount: number;
  isGem: boolean;         // Gems: 2x value, no regen
  regenRate: number;      // ore per second (0 for gems)
}

const ORE_REGEN_RATE = 2;       // ore per second
const ORE_START_AMOUNT = 1000;
const GEM_START_AMOUNT = 500;
const ORE_VALUE_PER_UNIT = 1;   // credits per ore unit when processed
const GEM_VALUE_MULTIPLIER = 2;

export class ResourceSystem {
  private oreFields = new Map<string, OreField>();

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  /** Initialize ore fields from terrain data */
  initFromTerrain(terrain: number[][], mapW: number, mapH: number): void {
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const t = terrain[y]?.[x];
        if (t === 4) {
          // Ore
          this.oreFields.set(this.key(x, y), {
            tileX: x, tileY: y,
            amount: ORE_START_AMOUNT, maxAmount: ORE_START_AMOUNT,
            isGem: false, regenRate: ORE_REGEN_RATE,
          });
        } else if (t === 5) {
          // Gems
          this.oreFields.set(this.key(x, y), {
            tileX: x, tileY: y,
            amount: GEM_START_AMOUNT, maxAmount: GEM_START_AMOUNT,
            isGem: true, regenRate: 0,
          });
        }
      }
    }
  }

  /** Add an ore field manually (for map generation) */
  addOreField(x: number, y: number, isGem = false): void {
    const amount = isGem ? GEM_START_AMOUNT : ORE_START_AMOUNT;
    this.oreFields.set(this.key(x, y), {
      tileX: x, tileY: y,
      amount, maxAmount: amount,
      isGem, regenRate: isGem ? 0 : ORE_REGEN_RATE,
    });
  }

  /** Harvest ore from a tile. Returns amount harvested. */
  harvest(x: number, y: number, maxAmount: number): number {
    const field = this.oreFields.get(this.key(x, y));
    if (!field || field.amount <= 0) return 0;

    const harvested = Math.min(maxAmount, field.amount);
    field.amount -= harvested;
    return harvested;
  }

  /** Get the credit value of harvested ore */
  getOreValue(amount: number, isGem: boolean): number {
    return amount * ORE_VALUE_PER_UNIT * (isGem ? GEM_VALUE_MULTIPLIER : 1);
  }

  /** Find nearest ore field with resources to a position */
  findNearestOre(fromX: number, fromY: number): TileCoord | null {
    let nearest: TileCoord | null = null;
    let nearestDist = Infinity;

    for (const field of this.oreFields.values()) {
      if (field.amount <= 0) continue;
      const dist = tileDistanceEuclidean(fromX, fromY, field.tileX, field.tileY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { tileX: field.tileX, tileY: field.tileY };
      }
    }
    return nearest;
  }

  /** Get ore field at position */
  getOreAt(x: number, y: number): OreField | undefined {
    return this.oreFields.get(this.key(x, y));
  }

  /** Check if a tile has ore */
  hasOre(x: number, y: number): boolean {
    const field = this.oreFields.get(this.key(x, y));
    return field != null && field.amount > 0;
  }

  /** Update: regenerate ore fields */
  update(dt: number): void {
    for (const field of this.oreFields.values()) {
      if (field.regenRate > 0 && field.amount < field.maxAmount) {
        field.amount = Math.min(field.maxAmount, field.amount + field.regenRate * dt);
      }
    }
  }

  /** Get all ore fields (for rendering) */
  getAllOreFields(): IterableIterator<OreField> {
    return this.oreFields.values();
  }
}
