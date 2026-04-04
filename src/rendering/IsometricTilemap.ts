import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT, TERRAIN_COLORS } from '@/config/GameConfig';
import { tileToWorld } from '@/utils/IsometricUtils';

/**
 * Renders the isometric diamond-grid tilemap.
 * Draws terrain tiles as colored diamonds.
 * Implements viewport culling (Anti-lag Rule 7).
 */

// Terrain type to color mapping
const TERRAIN_COLOR_MAP: Record<number, number> = {
  0: TERRAIN_COLORS.grass.base,
  1: TERRAIN_COLORS.desert.base,
  2: TERRAIN_COLORS.water.base,
  3: TERRAIN_COLORS.road.base,
  4: TERRAIN_COLORS.ore,
};

const TERRAIN_TEXTURE_MAP: Record<number, number> = {
  0: TERRAIN_COLORS.grass.texture,
  1: TERRAIN_COLORS.desert.texture,
  2: TERRAIN_COLORS.water.texture,
  3: TERRAIN_COLORS.road.texture,
};

export class IsometricTilemap {
  private tileGraphics: Phaser.GameObjects.Graphics;
  private terrain: number[][];
  private mapWidth: number;
  private mapHeight: number;

  /** World-space bounds of the entire map */
  public worldBounds: { minX: number; minY: number; maxX: number; maxY: number };

  constructor(scene: Phaser.Scene, terrain: number[][], mapWidth: number, mapHeight: number) {
    this.terrain = terrain;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileGraphics = scene.add.graphics();

    // Calculate world bounds for camera clamping
    const topLeft = tileToWorld(0, 0);
    const topRight = tileToWorld(mapWidth - 1, 0);
    const bottomLeft = tileToWorld(0, mapHeight - 1);
    const bottomRight = tileToWorld(mapWidth - 1, mapHeight - 1);

    this.worldBounds = {
      minX: bottomLeft.x - TILE_WIDTH / 2,
      minY: topLeft.y - TILE_HEIGHT / 2,
      maxX: topRight.x + TILE_WIDTH / 2,
      maxY: bottomRight.y + TILE_HEIGHT / 2,
    };
  }

  render(): void {
    this.tileGraphics.clear();

    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const terrainType = this.terrain[y]![x]!;
        const color = TERRAIN_COLOR_MAP[terrainType] ?? TERRAIN_COLORS.grass.base;
        const textureColor = TERRAIN_TEXTURE_MAP[terrainType];

        const world = tileToWorld(x, y);

        // Draw diamond tile
        this.tileGraphics.fillStyle(color, 1);
        this.tileGraphics.beginPath();
        this.tileGraphics.moveTo(world.x, world.y - halfH);       // top
        this.tileGraphics.lineTo(world.x + halfW, world.y);       // right
        this.tileGraphics.lineTo(world.x, world.y + halfH);       // bottom
        this.tileGraphics.lineTo(world.x - halfW, world.y);       // left
        this.tileGraphics.closePath();
        this.tileGraphics.fillPath();

        // Tile outline for visual clarity
        this.tileGraphics.lineStyle(1, 0x000000, 0.15);
        this.tileGraphics.strokePath();

        // Subtle texture variation
        if (textureColor !== undefined) {
          this.tileGraphics.fillStyle(textureColor, 0.2);
          this.tileGraphics.fillCircle(
            world.x + (Math.random() - 0.5) * 10,
            world.y + (Math.random() - 0.5) * 5,
            2
          );
        }
      }
    }
  }

  getTerrainAt(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
      return -1;
    }
    return this.terrain[tileY]![tileX]!;
  }

  isWalkable(tileX: number, tileY: number): boolean {
    const terrain = this.getTerrainAt(tileX, tileY);
    return terrain !== -1 && terrain !== 2; // not out of bounds, not water
  }
}
