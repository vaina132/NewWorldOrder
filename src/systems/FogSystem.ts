/**
 * FogSystem — Tile-based fog of war (Anti-lag Rule 4).
 * States: 0 = unexplored (black), 1 = shroud (seen before), 2 = visible (in sight now)
 * Only recomputes when units move. Uses 2D array, not per-pixel.
 */

import { MAP_WIDTH, MAP_HEIGHT } from '@/config/GameConfig';
import type { EntityManager } from './EntityManager';
import type { PlayerId } from '@/utils/Types';

export class FogSystem {
  private fog: Uint8Array[];  // [y][x] = 0/1/2
  private playerId: PlayerId;
  private entityManager: EntityManager;
  readonly width = MAP_WIDTH;
  readonly height = MAP_HEIGHT;

  constructor(playerId: PlayerId, entityManager: EntityManager) {
    this.playerId = playerId;
    this.entityManager = entityManager;

    // Initialize all as unexplored
    this.fog = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.fog[y] = new Uint8Array(MAP_WIDTH);
    }
  }

  /** Recalculate visibility based on unit/building positions */
  update(): void {
    // Reset visible to shroud (keep explored areas as shroud)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.fog[y]![x] === 2) {
          this.fog[y]![x] = 1; // Was visible, now shroud
        }
      }
    }

    // Reveal around all owned units
    for (const unit of this.entityManager.getAllUnits()) {
      if (unit.ownerId !== this.playerId || !unit.alive) continue;
      this.revealAround(unit.tileX, unit.tileY, unit.sightRange);
    }

    // Reveal around all owned buildings
    for (const building of this.entityManager['buildings'].values() as IterableIterator<import('@/entities/Building').Building>) {
      if (building.ownerId !== this.playerId || !building.alive) continue;
      this.revealAround(building.tileX, building.tileY, building.sightRange);
    }
  }

  private revealAround(cx: number, cy: number, radius: number): void {
    const r = Math.ceil(radius);
    const r2 = radius * radius;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.fog[y]![x] = 2; // Visible
        }
      }
    }
  }

  /** Get fog state at a tile */
  getState(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.fog[y]![x]!;
  }

  /** Check if a tile is currently visible */
  isVisible(x: number, y: number): boolean {
    return this.getState(x, y) === 2;
  }

  /** Check if a tile has been explored (seen at least once) */
  isExplored(x: number, y: number): boolean {
    return this.getState(x, y) >= 1;
  }

  /** Get the raw fog array for rendering */
  getFogData(): Uint8Array[] {
    return this.fog;
  }
}
