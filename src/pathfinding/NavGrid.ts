/**
 * Navigation grid for pathfinding.
 * Marks tiles as walkable/blocked based on terrain and occupied tiles.
 */

import type { TileCoord } from '@/utils/Types';

export class NavGrid {
  private walkable: boolean[][];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walkable = [];
    for (let y = 0; y < height; y++) {
      this.walkable[y] = new Array(width).fill(true);
    }
  }

  /** Initialize from terrain data. Water (2) and cliff tiles are unwalkable. */
  initFromTerrain(terrain: number[][]): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = terrain[y]?.[x];
        this.walkable[y]![x] = t !== 2; // water is unwalkable
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.walkable[y]![x]!;
  }

  setWalkable(x: number, y: number, value: boolean): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.walkable[y]![x] = value;
    }
  }

  /** Block tiles occupied by a building footprint */
  blockFootprint(tileX: number, tileY: number, w: number, h: number): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setWalkable(tileX + dx, tileY + dy, false);
      }
    }
  }

  /** Get walkable 8-directional neighbors */
  getNeighbors(x: number, y: number): TileCoord[] {
    const neighbors: TileCoord[] = [];
    const offsets = [
      [0, -1], [1, -1], [1, 0], [1, 1],
      [0, 1], [-1, 1], [-1, 0], [-1, -1],
    ];

    for (const [dx, dy] of offsets) {
      const nx = x + dx!;
      const ny = y + dy!;
      if (this.isWalkable(nx, ny)) {
        // For diagonal moves, check that both adjacent cardinal tiles are walkable
        // (prevents cutting corners)
        if (dx !== 0 && dy !== 0) {
          if (!this.isWalkable(x + dx!, y) || !this.isWalkable(x, y + dy!)) {
            continue;
          }
        }
        neighbors.push({ tileX: nx, tileY: ny });
      }
    }
    return neighbors;
  }
}
