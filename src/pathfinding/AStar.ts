/**
 * A* pathfinding on the isometric tile grid.
 * Returns a path as an array of TileCoords from start to goal.
 * Uses 8-directional movement with corner-cutting prevention.
 */

import type { TileCoord } from '@/utils/Types';
import type { NavGrid } from './NavGrid';

interface AStarNode {
  x: number;
  y: number;
  g: number;  // cost from start
  h: number;  // heuristic to goal
  f: number;  // g + h
  parent: AStarNode | null;
}

const SQRT2 = Math.SQRT2;

/** Octile distance heuristic (admissible for 8-directional movement) */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return (dx + dy) + (SQRT2 - 2) * Math.min(dx, dy);
}

/**
 * Find a path from start to goal on the nav grid.
 * Returns empty array if no path exists.
 * maxIterations prevents hanging on large/impossible searches.
 */
export function findPath(
  grid: NavGrid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  maxIterations = 2000,
): TileCoord[] {
  // Quick exit
  if (startX === goalX && startY === goalY) return [];
  if (!grid.isWalkable(goalX, goalY)) {
    // Find nearest walkable tile to goal
    const alt = findNearestWalkable(grid, goalX, goalY);
    if (!alt) return [];
    goalX = alt.tileX;
    goalY = alt.tileY;
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: startX, y: startY,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f (simple linear scan — fine for RTS grid sizes)
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i]!.f < openSet[bestIdx]!.f) {
        bestIdx = i;
      }
    }
    const current = openSet[bestIdx]!;
    openSet.splice(bestIdx, 1);

    // Goal reached
    if (current.x === goalX && current.y === goalY) {
      return reconstructPath(current);
    }

    const key = `${current.x},${current.y}`;
    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Expand neighbors
    const neighbors = grid.getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      const nKey = `${neighbor.tileX},${neighbor.tileY}`;
      if (closedSet.has(nKey)) continue;

      const isDiagonal = neighbor.tileX !== current.x && neighbor.tileY !== current.y;
      const moveCost = isDiagonal ? SQRT2 : 1;
      const g = current.g + moveCost;
      const h = heuristic(neighbor.tileX, neighbor.tileY, goalX, goalY);

      // Check if this path is better than existing
      const existingIdx = openSet.findIndex(n => n.x === neighbor.tileX && n.y === neighbor.tileY);
      if (existingIdx >= 0) {
        if (g < openSet[existingIdx]!.g) {
          openSet[existingIdx]!.g = g;
          openSet[existingIdx]!.f = g + h;
          openSet[existingIdx]!.parent = current;
        }
      } else {
        openSet.push({
          x: neighbor.tileX,
          y: neighbor.tileY,
          g, h, f: g + h,
          parent: current,
        });
      }
    }
  }

  return []; // No path found
}

function reconstructPath(node: AStarNode): TileCoord[] {
  const path: TileCoord[] = [];
  let current: AStarNode | null = node;
  while (current) {
    path.unshift({ tileX: current.x, tileY: current.y });
    current = current.parent;
  }
  // Remove start position (unit is already there)
  if (path.length > 0) path.shift();

  return smoothPath(path);
}

/** Remove redundant waypoints on straight lines */
function smoothPath(path: TileCoord[]): TileCoord[] {
  if (path.length <= 2) return path;

  const smoothed: TileCoord[] = [path[0]!];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1]!;
    const curr = path[i]!;
    const next = path[i + 1]!;

    // Keep waypoint if direction changes
    const dx1 = curr.tileX - prev.tileX;
    const dy1 = curr.tileY - prev.tileY;
    const dx2 = next.tileX - curr.tileX;
    const dy2 = next.tileY - curr.tileY;

    if (dx1 !== dx2 || dy1 !== dy2) {
      smoothed.push(curr);
    }
  }
  smoothed.push(path[path.length - 1]!);
  return smoothed;
}

/** Find nearest walkable tile using BFS */
function findNearestWalkable(grid: NavGrid, x: number, y: number, maxRange = 10): TileCoord | null {
  const visited = new Set<string>();
  const queue: TileCoord[] = [{ tileX: x, tileY: y }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.tileX},${current.tileY}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (Math.abs(current.tileX - x) > maxRange || Math.abs(current.tileY - y) > maxRange) continue;

    if (grid.isWalkable(current.tileX, current.tileY)) {
      return current;
    }

    const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of offsets) {
      queue.push({ tileX: current.tileX + dx!, tileY: current.tileY + dy! });
    }
  }
  return null;
}
