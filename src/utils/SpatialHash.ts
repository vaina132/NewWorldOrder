/**
 * Spatial hash grid for efficient "find entities in range" queries.
 * Aligned to the isometric tile grid. Required for O(1) combat range checks
 * instead of O(n^2) brute force.
 */

import type { EntityId } from './Types';

export class SpatialHash {
  private cells = new Map<string, Set<EntityId>>();
  private entityCells = new Map<EntityId, string>();

  constructor(private readonly cellSize: number = 128) {}

  private key(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /** Insert or update an entity's position */
  update(id: EntityId, x: number, y: number): void {
    const newKey = this.key(x, y);
    const oldKey = this.entityCells.get(id);

    if (oldKey === newKey) return;

    // Remove from old cell
    if (oldKey) {
      const oldCell = this.cells.get(oldKey);
      oldCell?.delete(id);
      if (oldCell?.size === 0) this.cells.delete(oldKey);
    }

    // Add to new cell
    let cell = this.cells.get(newKey);
    if (!cell) {
      cell = new Set();
      this.cells.set(newKey, cell);
    }
    cell.add(id);
    this.entityCells.set(id, newKey);
  }

  /** Remove an entity */
  remove(id: EntityId): void {
    const key = this.entityCells.get(id);
    if (key) {
      const cell = this.cells.get(key);
      cell?.delete(id);
      if (cell?.size === 0) this.cells.delete(key);
      this.entityCells.delete(id);
    }
  }

  /** Query all entities within a radius of a world position */
  queryRadius(x: number, y: number, radius: number): EntityId[] {
    const results: EntityId[] = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (cell) {
          for (const id of cell) {
            results.push(id);
          }
        }
      }
    }
    return results;
  }

  /** Query all entities within a rectangle */
  queryRect(x: number, y: number, width: number, height: number): EntityId[] {
    return this.queryRadius(x + width / 2, y + height / 2, Math.max(width, height) / 2);
  }

  /** Clear all data */
  clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }
}
