/**
 * Isometric coordinate transforms for the diamond grid.
 * Tile dimensions: 64×32 (2:1 ratio).
 * ALL tile operations must go through these functions.
 */

import { TILE_WIDTH, TILE_HEIGHT } from '@/config/GameConfig';
import type { TileCoord, WorldCoord, ScreenCoord } from './Types';

const HALF_W = TILE_WIDTH / 2;   // 32
const HALF_H = TILE_HEIGHT / 2;  // 16

/**
 * Convert tile coordinates to world (pixel) position.
 * Returns the center of the tile diamond.
 */
export function tileToWorld(tileX: number, tileY: number): WorldCoord {
  return {
    x: (tileX - tileY) * HALF_W,
    y: (tileX + tileY) * HALF_H,
  };
}

/**
 * Convert tile coordinate object to world position.
 */
export function tileCoordToWorld(tile: TileCoord): WorldCoord {
  return tileToWorld(tile.tileX, tile.tileY);
}

/**
 * Convert world (pixel) position to tile coordinates.
 * Returns fractional tile coords — use Math.floor for tile index.
 */
export function worldToTile(worldX: number, worldY: number): TileCoord {
  const tileX = (worldX / HALF_W + worldY / HALF_H) / 2;
  const tileY = (worldY / HALF_H - worldX / HALF_W) / 2;
  return { tileX, tileY };
}

/**
 * Convert world position to the nearest integer tile coordinate.
 */
export function worldToTileSnapped(worldX: number, worldY: number): TileCoord {
  const { tileX, tileY } = worldToTile(worldX, worldY);
  return { tileX: Math.floor(tileX), tileY: Math.floor(tileY) };
}

/**
 * Convert screen coordinates (accounting for camera) to world coordinates.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): WorldCoord {
  return {
    x: (screenX / zoom) + cameraX,
    y: (screenY / zoom) + cameraY,
  };
}

/**
 * Convert world coordinates to screen coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): ScreenCoord {
  return {
    screenX: (worldX - cameraX) * zoom,
    screenY: (worldY - cameraY) * zoom,
  };
}

/**
 * Convert screen click directly to tile coordinates.
 */
export function screenToTile(
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): TileCoord {
  const world = screenToWorld(screenX, screenY, cameraX, cameraY, zoom);
  return worldToTileSnapped(world.x, world.y);
}

/**
 * Check if a tile coordinate is within map bounds.
 */
export function isInBounds(tileX: number, tileY: number, mapWidth: number, mapHeight: number): boolean {
  return tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight;
}

/**
 * Get the depth value for isometric rendering.
 * Objects with higher worldY render in front (Rule 6).
 */
export function getDepth(worldY: number): number {
  return worldY;
}

/**
 * Get depth for a multi-tile building.
 * Uses the southern-most tile's Y for correct depth sorting.
 */
export function getBuildingDepth(tileX: number, tileY: number, footprintW: number, footprintH: number): number {
  const southTileX = tileX + footprintW - 1;
  const southTileY = tileY + footprintH - 1;
  const world = tileToWorld(southTileX, southTileY);
  return world.y;
}

/**
 * Calculate Manhattan distance on the iso grid.
 */
export function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Calculate Euclidean distance between two tile coords.
 */
export function tileDistanceEuclidean(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get the 8 neighboring tile coordinates.
 */
export function getNeighbors(tileX: number, tileY: number): TileCoord[] {
  return [
    { tileX: tileX,     tileY: tileY - 1 }, // N
    { tileX: tileX + 1, tileY: tileY - 1 }, // NE
    { tileX: tileX + 1, tileY: tileY     }, // E
    { tileX: tileX + 1, tileY: tileY + 1 }, // SE
    { tileX: tileX,     tileY: tileY + 1 }, // S
    { tileX: tileX - 1, tileY: tileY + 1 }, // SW
    { tileX: tileX - 1, tileY: tileY     }, // W
    { tileX: tileX - 1, tileY: tileY - 1 }, // NW
  ];
}

/**
 * Get the direction from one tile to another (8-directional).
 */
export function getDirection(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);

  const dirMap: Record<string, string> = {
    '0,-1': 'n',  '1,-1': 'ne', '1,0': 'e',  '1,1': 'se',
    '0,1': 's',   '-1,1': 'sw', '-1,0': 'w',  '-1,-1': 'nw',
  };

  return dirMap[`${dx},${dy}`] ?? 's';
}
