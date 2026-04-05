import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT } from '@/config/GameConfig';
import { tileToWorld } from '@/utils/IsometricUtils';

/**
 * Enhanced isometric tilemap renderer.
 * Draws terrain with depth, lighting, texture detail, and natural variation.
 */

// Seeded random for deterministic texture detail
function seededRandom(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Color manipulation helpers
function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF];
}

function rgbToHex(r: number, g: number, b: number): number {
  return ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
}

function lerpColor(c1: number, c2: number, t: number): number {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  );
}

function brighten(color: number, amount: number): number {
  const [r, g, b] = hexToRgb(color);
  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount),
  );
}

function darken(color: number, amount: number): number {
  return brighten(color, -amount);
}

// Enhanced terrain color palette
const PALETTE = {
  grass: {
    base: [0x3B9B54, 0x45A85E, 0x3E9E57, 0x42A35B],
    highlight: 0x5CBF76,
    shadow: 0x2D7A40,
    detail: [0x358E4C, 0x4DB067, 0x2F8444],
  },
  desert: {
    base: [0xD4A853, 0xCFA04D, 0xD9AD58, 0xC99A47],
    highlight: 0xE4BD6E,
    shadow: 0xAA8338,
    detail: [0xBF9344, 0xCCA24F, 0xB88D3F],
  },
  water: {
    deep: 0x1A5276,
    mid: 0x2471A3,
    shallow: 0x2E86C1,
    highlight: 0x5DADE2,
    foam: 0x85C1E9,
  },
  road: {
    base: [0x6B7280, 0x727984, 0x656E79],
    highlight: 0x8B939E,
    shadow: 0x4B5563,
    line: 0x9CA3AF,
  },
  ore: {
    crystal: [0xF97316, 0xFB923C, 0xEA580C],
    glow: 0xFED7AA,
    ground: 0x92400E,
  },
  cliff: 0x5C4033,
};

export class IsometricTilemap {
  private scene: Phaser.Scene;
  private baseLayer: Phaser.GameObjects.Graphics;
  private detailLayer: Phaser.GameObjects.Graphics;
  private waterLayer: Phaser.GameObjects.Graphics;
  private terrain: number[][];
  private mapWidth: number;
  private mapHeight: number;
  private waterPhase = 0;

  public worldBounds: { minX: number; minY: number; maxX: number; maxY: number };

  constructor(scene: Phaser.Scene, terrain: number[][], mapWidth: number, mapHeight: number) {
    this.scene = scene;
    this.terrain = terrain;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    this.baseLayer = scene.add.graphics().setDepth(0);
    this.detailLayer = scene.add.graphics().setDepth(1);
    this.waterLayer = scene.add.graphics().setDepth(0.5);

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
    this.baseLayer.clear();
    this.detailLayer.clear();

    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const terrainType = this.terrain[y]![x]!;
        const world = tileToWorld(x, y);
        const seed = seededRandom(x, y);

        switch (terrainType) {
          case 0: this.drawGrassTile(world.x, world.y, halfW, halfH, x, y, seed); break;
          case 1: this.drawDesertTile(world.x, world.y, halfW, halfH, x, y, seed); break;
          case 2: this.drawWaterTile(world.x, world.y, halfW, halfH, x, y, seed); break;
          case 3: this.drawRoadTile(world.x, world.y, halfW, halfH, x, y, seed); break;
          case 4: this.drawOreTile(world.x, world.y, halfW, halfH, x, y, seed); break;
          default: this.drawGrassTile(world.x, world.y, halfW, halfH, x, y, seed); break;
        }
      }
    }

    // Initial water render
    this.renderWater();
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, hw: number, hh: number): void {
    g.beginPath();
    g.moveTo(cx, cy - hh);
    g.lineTo(cx + hw, cy);
    g.lineTo(cx, cy + hh);
    g.lineTo(cx - hw, cy);
    g.closePath();
  }

  // --- GRASS ---
  private drawGrassTile(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number, seed: number): void {
    const baseColor = PALETTE.grass.base[Math.floor(seed * 4)]!;

    // Main fill with subtle variation
    this.baseLayer.fillStyle(baseColor, 1);
    this.drawDiamond(this.baseLayer, cx, cy, hw, hh);
    this.baseLayer.fillPath();

    // Light edge (top-left feels lit)
    this.baseLayer.lineStyle(1, PALETTE.grass.highlight, 0.3);
    this.baseLayer.beginPath();
    this.baseLayer.moveTo(cx, cy - hh);
    this.baseLayer.lineTo(cx - hw, cy);
    this.baseLayer.strokePath();

    // Shadow edge (bottom-right)
    this.baseLayer.lineStyle(1, PALETTE.grass.shadow, 0.4);
    this.baseLayer.beginPath();
    this.baseLayer.moveTo(cx + hw, cy);
    this.baseLayer.lineTo(cx, cy + hh);
    this.baseLayer.strokePath();

    // Grass tufts
    const detailCount = 2 + Math.floor(seed * 3);
    for (let i = 0; i < detailCount; i++) {
      const s2 = seededRandom(tx * 7 + i, ty * 13 + i);
      const dx = (s2 - 0.5) * hw * 0.8;
      const dy = (seededRandom(tx + i * 3, ty + i * 7) - 0.5) * hh * 0.6;
      const detailColor = PALETTE.grass.detail[Math.floor(s2 * 3)]!;

      this.detailLayer.fillStyle(detailColor, 0.6);
      this.detailLayer.fillCircle(cx + dx, cy + dy, 1.5);
    }
  }

  // --- DESERT ---
  private drawDesertTile(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number, seed: number): void {
    const baseColor = PALETTE.desert.base[Math.floor(seed * 4)]!;

    this.baseLayer.fillStyle(baseColor, 1);
    this.drawDiamond(this.baseLayer, cx, cy, hw, hh);
    this.baseLayer.fillPath();

    // Light edge
    this.baseLayer.lineStyle(1, PALETTE.desert.highlight, 0.35);
    this.baseLayer.beginPath();
    this.baseLayer.moveTo(cx, cy - hh);
    this.baseLayer.lineTo(cx - hw, cy);
    this.baseLayer.strokePath();

    // Shadow
    this.baseLayer.lineStyle(1, PALETTE.desert.shadow, 0.35);
    this.baseLayer.beginPath();
    this.baseLayer.moveTo(cx + hw, cy);
    this.baseLayer.lineTo(cx, cy + hh);
    this.baseLayer.strokePath();

    // Sand grain texture
    for (let i = 0; i < 3; i++) {
      const s2 = seededRandom(tx * 11 + i, ty * 17 + i);
      const dx = (s2 - 0.5) * hw * 0.7;
      const dy = (seededRandom(tx + i * 5, ty + i * 11) - 0.5) * hh * 0.5;
      this.detailLayer.fillStyle(PALETTE.desert.detail[i % 3]!, 0.35);
      this.detailLayer.fillRect(cx + dx, cy + dy, 2, 1);
    }

    // Occasional rock
    if (seed > 0.85) {
      this.detailLayer.fillStyle(0x8B7355, 0.5);
      this.detailLayer.fillEllipse(cx + (seed - 0.5) * 10, cy + 2, 4, 2);
    }
  }

  // --- WATER ---
  private drawWaterTile(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number, seed: number): void {
    // Water rendered separately for animation
    // Draw a dark base here
    this.baseLayer.fillStyle(PALETTE.water.deep, 1);
    this.drawDiamond(this.baseLayer, cx, cy, hw, hh);
    this.baseLayer.fillPath();
  }

  renderWater(): void {
    this.waterLayer.clear();
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    this.waterPhase += 0.02;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.terrain[y]![x] !== 2) continue;

        const world = tileToWorld(x, y);
        const cx = world.x;
        const cy = world.y;
        const seed = seededRandom(x, y);

        // Animated water color
        const wave = Math.sin(this.waterPhase + x * 0.5 + y * 0.3) * 0.5 + 0.5;
        const waterColor = lerpColor(PALETTE.water.deep, PALETTE.water.shallow, wave * 0.4);

        this.waterLayer.fillStyle(waterColor, 0.9);
        this.waterLayer.beginPath();
        this.waterLayer.moveTo(cx, cy - halfH);
        this.waterLayer.lineTo(cx + halfW, cy);
        this.waterLayer.lineTo(cx, cy + halfH);
        this.waterLayer.lineTo(cx - halfW, cy);
        this.waterLayer.closePath();
        this.waterLayer.fillPath();

        // Wave highlights
        const waveX = Math.sin(this.waterPhase * 1.5 + x * 0.8 + y * 0.4) * 8;
        this.waterLayer.fillStyle(PALETTE.water.highlight, 0.25 + wave * 0.15);
        this.waterLayer.fillEllipse(cx + waveX, cy - 2, 12, 3);

        // Shore foam where water meets land
        if (this.isAdjacentToLand(x, y)) {
          this.waterLayer.fillStyle(PALETTE.water.foam, 0.3 + wave * 0.2);
          this.waterLayer.fillEllipse(cx + waveX * 0.5, cy + 3, 16, 4);
        }
      }
    }
  }

  // --- ROAD ---
  private drawRoadTile(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number, seed: number): void {
    const baseColor = PALETTE.road.base[Math.floor(seed * 3)]!;

    this.baseLayer.fillStyle(baseColor, 1);
    this.drawDiamond(this.baseLayer, cx, cy, hw, hh);
    this.baseLayer.fillPath();

    // Subtle border
    this.baseLayer.lineStyle(1, PALETTE.road.shadow, 0.3);
    this.drawDiamond(this.baseLayer, cx, cy, hw, hh);
    this.baseLayer.strokePath();

    // Road center line markings
    if (seed > 0.5) {
      this.detailLayer.fillStyle(PALETTE.road.line, 0.2);
      this.detailLayer.fillRect(cx - 3, cy - 1, 6, 1);
    }

    // Occasional crack
    if (seed > 0.8) {
      this.detailLayer.lineStyle(1, PALETTE.road.shadow, 0.25);
      this.detailLayer.beginPath();
      this.detailLayer.moveTo(cx - 4, cy - 2);
      this.detailLayer.lineTo(cx + 3, cy + 1);
      this.detailLayer.strokePath();
    }
  }

  // --- ORE ---
  private drawOreTile(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number, seed: number): void {
    // Grass base underneath
    this.drawGrassTile(cx, cy, hw, hh, tx, ty, seed);

    // Ore ground stain
    this.detailLayer.fillStyle(PALETTE.ore.ground, 0.25);
    this.detailLayer.fillEllipse(cx, cy, hw * 1.2, hh * 0.9);

    // Crystal clusters
    const crystalCount = 3 + Math.floor(seed * 4);
    for (let i = 0; i < crystalCount; i++) {
      const s = seededRandom(tx * 13 + i, ty * 19 + i);
      const s2 = seededRandom(tx + i * 7, ty + i * 11);
      const dx = (s - 0.5) * hw * 0.7;
      const dy = (s2 - 0.5) * hh * 0.5;
      const crystalColor = PALETTE.ore.crystal[i % 3]!;
      const height = 3 + s * 5;
      const width = 2 + s * 2;

      // Crystal body (tall trapezoid)
      this.detailLayer.fillStyle(crystalColor, 0.9);
      this.detailLayer.beginPath();
      this.detailLayer.moveTo(cx + dx - width / 2, cy + dy);
      this.detailLayer.lineTo(cx + dx - width / 4, cy + dy - height);
      this.detailLayer.lineTo(cx + dx + width / 4, cy + dy - height);
      this.detailLayer.lineTo(cx + dx + width / 2, cy + dy);
      this.detailLayer.closePath();
      this.detailLayer.fillPath();

      // Crystal highlight
      this.detailLayer.fillStyle(PALETTE.ore.glow, 0.4);
      this.detailLayer.fillRect(cx + dx - 0.5, cy + dy - height + 1, 1, height * 0.6);
    }

    // Ambient glow
    this.detailLayer.fillStyle(PALETTE.ore.crystal[0]!, 0.08);
    this.detailLayer.fillEllipse(cx, cy - 2, hw * 0.8, hh * 0.6);
  }

  // --- Helpers ---

  private isAdjacentToLand(tx: number, ty: number): boolean {
    const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of offsets) {
      const nx = tx + dx!;
      const ny = ty + dy!;
      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
        if (this.terrain[ny]![nx] !== 2) return true;
      }
    }
    return false;
  }

  /** Call each frame for water animation */
  updateWater(): void {
    this.renderWater();
  }

  getTerrainAt(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
      return -1;
    }
    return this.terrain[tileY]![tileX]!;
  }

  isWalkable(tileX: number, tileY: number): boolean {
    const terrain = this.getTerrainAt(tileX, tileY);
    return terrain !== -1 && terrain !== 2;
  }
}
