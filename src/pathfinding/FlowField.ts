/**
 * Flow field pathfinding for efficient group movement.
 * When 5+ units target the same area, use a flow field instead of individual A* calls.
 * This respects the max 10 A* calls per tick budget (Anti-lag Rule).
 */

import type { TileCoord } from '@/utils/Types';
import type { NavGrid } from './NavGrid';

export interface FlowFieldData {
  targetX: number;
  targetY: number;
  field: Int8Array[];  // direction index per tile (0-7 = 8 directions, -1 = blocked)
  width: number;
  height: number;
}

// Direction offsets: N, NE, E, SE, S, SW, W, NW
const DIR_OFFSETS: [number, number][] = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/**
 * Generate a flow field from a target position.
 * All tiles point toward the target using BFS (Dijkstra with uniform cost).
 */
export function generateFlowField(
  grid: NavGrid,
  targetX: number,
  targetY: number,
): FlowFieldData {
  const { width, height } = grid;

  // Cost field (BFS distance from target)
  const cost: number[][] = [];
  const field: Int8Array[] = [];

  for (let y = 0; y < height; y++) {
    cost[y] = new Array(width).fill(Infinity);
    field[y] = new Int8Array(width).fill(-1);
  }

  // BFS from target
  cost[targetY]![targetX] = 0;
  const queue: [number, number][] = [[targetX, targetY]];
  let head = 0;

  while (head < queue.length) {
    const [cx, cy] = queue[head]!;
    head++;
    const currentCost = cost[cy]![cx]!;

    for (const [dx, dy] of DIR_OFFSETS) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (!grid.isWalkable(nx, ny)) continue;

      const isDiagonal = dx !== 0 && dy !== 0;
      const moveCost = isDiagonal ? 1.414 : 1;
      const newCost = currentCost + moveCost;

      if (newCost < cost[ny]![nx]!) {
        cost[ny]![nx] = newCost;
        queue.push([nx, ny]);
      }
    }
  }

  // Build direction field: each tile points toward its lowest-cost neighbor
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid.isWalkable(x, y) || (x === targetX && y === targetY)) continue;

      let bestDir = -1;
      let bestCost = cost[y]![x]!;

      for (let d = 0; d < 8; d++) {
        const [dx, dy] = DIR_OFFSETS[d]!;
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const nc = cost[ny]![nx]!;
        if (nc < bestCost) {
          bestCost = nc;
          bestDir = d;
        }
      }

      field[y]![x] = bestDir;
    }
  }

  return { targetX, targetY, field, width, height };
}

/**
 * Get the next tile position for a unit following the flow field.
 */
export function getFlowDirection(flowField: FlowFieldData, tileX: number, tileY: number): TileCoord | null {
  if (tileX < 0 || tileX >= flowField.width || tileY < 0 || tileY >= flowField.height) {
    return null;
  }

  const dir = flowField.field[tileY]![tileX]!;
  if (dir < 0 || dir > 7) return null;

  const [dx, dy] = DIR_OFFSETS[dir]!;
  return { tileX: tileX + dx, tileY: tileY + dy };
}
