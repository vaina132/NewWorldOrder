/**
 * Sprite atlas generator — Creates minimalist geometric isometric sprites.
 * Generates a single PNG atlas + JSON frame data for Phaser.
 * Run: npm run generate-sprites
 *
 * Phase 1: terrain tiles only.
 * Future phases will add unit and building sprites.
 */

import { createCanvas, type Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

// Atlas layout
const COLUMNS = 8;
const PADDING = 2;

interface SpriteEntry {
  name: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

// Color helpers
function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 0xFF;
  const g = (hex >> 8) & 0xFF;
  const b = hex & 0xFF;
  return `rgb(${r},${g},${b})`;
}

// Draw an isometric diamond tile
function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string) {
  const hw = w / 2;
  const hh = h / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fill();
}

// --- Sprite definitions ---

const sprites: SpriteEntry[] = [
  // Terrain tiles
  {
    name: 'terrain_grass',
    width: TILE_W,
    height: TILE_H,
    draw: (ctx, x, y) => {
      drawDiamond(ctx, x + HALF_W, y + HALF_H, TILE_W, TILE_H, hexToRgb(0x4ADE80));
      // Subtle texture dots
      ctx.fillStyle = hexToRgb(0x22C55E);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + HALF_W + (Math.random() - 0.5) * 20, y + HALF_H + (Math.random() - 0.5) * 10, 2, 2);
      }
    },
  },
  {
    name: 'terrain_desert',
    width: TILE_W,
    height: TILE_H,
    draw: (ctx, x, y) => {
      drawDiamond(ctx, x + HALF_W, y + HALF_H, TILE_W, TILE_H, hexToRgb(0xFDE68A));
      ctx.fillStyle = hexToRgb(0xF59E0B);
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(x + HALF_W + (Math.random() - 0.5) * 20, y + HALF_H + (Math.random() - 0.5) * 10, 2, 1);
      }
    },
  },
  {
    name: 'terrain_water',
    width: TILE_W,
    height: TILE_H,
    draw: (ctx, x, y) => {
      drawDiamond(ctx, x + HALF_W, y + HALF_H, TILE_W, TILE_H, hexToRgb(0x3B82F6));
      // Wave lines
      ctx.strokeStyle = hexToRgb(0x60A5FA);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + HALF_W - 10, y + HALF_H - 2);
      ctx.lineTo(x + HALF_W + 10, y + HALF_H - 2);
      ctx.stroke();
    },
  },
  {
    name: 'terrain_road',
    width: TILE_W,
    height: TILE_H,
    draw: (ctx, x, y) => {
      drawDiamond(ctx, x + HALF_W, y + HALF_H, TILE_W, TILE_H, hexToRgb(0x9CA3AF));
    },
  },
  {
    name: 'terrain_ore',
    width: TILE_W,
    height: TILE_H,
    draw: (ctx, x, y) => {
      // Grass base with ore crystals
      drawDiamond(ctx, x + HALF_W, y + HALF_H, TILE_W, TILE_H, hexToRgb(0x4ADE80));
      ctx.fillStyle = hexToRgb(0xF97316);
      // Crystal clusters
      for (let i = 0; i < 4; i++) {
        const cx = x + HALF_W + (Math.random() - 0.5) * 24;
        const cy = y + HALF_H + (Math.random() - 0.5) * 10;
        ctx.fillRect(cx - 2, cy - 4, 4, 6);
      }
    },
  },

  // AC units (blue) — placeholder geometric shapes
  {
    name: 'ac_rifleman_idle_s',
    width: 32,
    height: 40,
    draw: (ctx, x, y) => {
      // Circle body
      ctx.fillStyle = hexToRgb(0x2563EB);
      ctx.beginPath();
      ctx.arc(x + 16, y + 24, 10, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = hexToRgb(0x60A5FA);
      ctx.beginPath();
      ctx.arc(x + 16, y + 12, 6, 0, Math.PI * 2);
      ctx.fill();
      // Weapon line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 22, y + 20);
      ctx.lineTo(x + 30, y + 14);
      ctx.stroke();
    },
  },
  {
    name: 'ip_conscript_idle_s',
    width: 32,
    height: 40,
    draw: (ctx, x, y) => {
      // Circle body
      ctx.fillStyle = hexToRgb(0xDC2626);
      ctx.beginPath();
      ctx.arc(x + 16, y + 24, 10, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = hexToRgb(0xF87171);
      ctx.beginPath();
      ctx.arc(x + 16, y + 12, 6, 0, Math.PI * 2);
      ctx.fill();
      // Weapon line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 22, y + 20);
      ctx.lineTo(x + 28, y + 16);
      ctx.stroke();
    },
  },

  // Vehicles
  {
    name: 'ac_light_tank_idle_s',
    width: 48,
    height: 32,
    draw: (ctx, x, y) => {
      // Body (isometric rectangle)
      ctx.fillStyle = hexToRgb(0x1E40AF);
      ctx.fillRect(x + 6, y + 10, 36, 18);
      // Turret
      ctx.fillStyle = hexToRgb(0x2563EB);
      ctx.fillRect(x + 14, y + 6, 16, 14);
      // Barrel
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 13);
      ctx.lineTo(x + 44, y + 10);
      ctx.stroke();
    },
  },
  {
    name: 'ip_heavy_tank_idle_s',
    width: 64,
    height: 40,
    draw: (ctx, x, y) => {
      // Body
      ctx.fillStyle = hexToRgb(0x991B1B);
      ctx.fillRect(x + 6, y + 14, 52, 22);
      // Turret
      ctx.fillStyle = hexToRgb(0xDC2626);
      ctx.fillRect(x + 18, y + 8, 24, 18);
      // Barrel
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 42, y + 17);
      ctx.lineTo(x + 60, y + 12);
      ctx.stroke();
    },
  },

  // Buildings
  {
    name: 'ac_power_plant',
    width: 128,
    height: 96,
    draw: (ctx, x, y) => {
      // Base diamond
      drawDiamond(ctx, x + 64, y + 64, 120, 56, hexToRgb(0x1E40AF));
      // Building box
      ctx.fillStyle = hexToRgb(0x2563EB);
      ctx.fillRect(x + 30, y + 20, 68, 44);
      // Roof
      ctx.fillStyle = hexToRgb(0x60A5FA);
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 20);
      ctx.lineTo(x + 64, y + 4);
      ctx.lineTo(x + 98, y + 20);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    name: 'ip_tesla_reactor',
    width: 128,
    height: 96,
    draw: (ctx, x, y) => {
      // Base diamond
      drawDiamond(ctx, x + 64, y + 64, 120, 56, hexToRgb(0x991B1B));
      // Building box
      ctx.fillStyle = hexToRgb(0xDC2626);
      ctx.fillRect(x + 30, y + 20, 68, 44);
      // Tesla coil top
      ctx.fillStyle = hexToRgb(0xF87171);
      ctx.beginPath();
      ctx.moveTo(x + 64, y + 2);
      ctx.lineTo(x + 50, y + 20);
      ctx.lineTo(x + 78, y + 20);
      ctx.closePath();
      ctx.fill();
    },
  },
];

// --- Atlas generation ---

function generateAtlas() {
  const rows = Math.ceil(sprites.length / COLUMNS);

  // Calculate atlas dimensions (use max sprite size per cell)
  const cellW = Math.max(...sprites.map(s => s.width)) + PADDING * 2;
  const cellH = Math.max(...sprites.map(s => s.height)) + PADDING * 2;
  const atlasW = cellW * COLUMNS;
  const atlasH = cellH * rows;

  const canvas = createCanvas(atlasW, atlasH) as unknown as Canvas;
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

  // Transparent background
  ctx.clearRect(0, 0, atlasW, atlasH);

  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};

  sprites.forEach((sprite, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = col * cellW + PADDING;
    const y = row * cellH + PADDING;

    sprite.draw(ctx, x, y);

    frames[sprite.name] = {
      frame: { x, y, w: sprite.width, h: sprite.height },
    };
  });

  // Write PNG
  const outDir = path.resolve(__dirname, '../public/assets/sprites');
  fs.mkdirSync(outDir, { recursive: true });

  const pngBuffer = (canvas as unknown as { toBuffer: (format: string) => Buffer }).toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, 'game-atlas.png'), pngBuffer);

  // Write JSON atlas
  const atlasJson = {
    frames,
    meta: {
      image: 'game-atlas.png',
      format: 'RGBA8888',
      size: { w: atlasW, h: atlasH },
      scale: 1,
    },
  };
  fs.writeFileSync(path.join(outDir, 'game-atlas.json'), JSON.stringify(atlasJson, null, 2));

  console.log(`Atlas generated: ${atlasW}x${atlasH}, ${sprites.length} sprites`);
  console.log(`Output: ${outDir}/game-atlas.{png,json}`);
}

generateAtlas();
