/** Core game configuration constants */

// Isometric tile dimensions (2:1 diamond ratio)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// Default map size in tiles
export const MAP_WIDTH = 48;
export const MAP_HEIGHT = 48;

// Simulation tick rate (Hz) — game logic runs at this rate
export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE; // 50ms

// Render target
export const TARGET_FPS = 60;

// Performance budgets
export const MAX_DRAW_CALLS = 50;
export const MAX_ACTIVE_SPRITES = 300;
export const MAX_PATHFINDING_PER_TICK = 10;
export const MAX_MEMORY_MB = 200;

// Camera
export const CAMERA_PAN_SPEED = 600; // pixels per second
export const CAMERA_EDGE_SCROLL_ZONE = 20; // pixels from edge
export const CAMERA_ZOOM_MIN = 0.5;
export const CAMERA_ZOOM_MAX = 2.0;
export const CAMERA_ZOOM_STEP = 0.1;

// UI — RA2-style right sidebar
export const SIDEBAR_WIDTH = 220;

// Faction colors
export const FACTION_COLORS = {
  ac: { primary: 0x2563EB, secondary: 0x1E40AF, accent: 0x60A5FA },
  ip: { primary: 0xDC2626, secondary: 0x991B1B, accent: 0xF87171 },
  neutral: { primary: 0xF59E0B, secondary: 0xD97706, accent: 0xFCD34D },
} as const;

// Terrain colors
export const TERRAIN_COLORS = {
  grass: { base: 0x4ADE80, texture: 0x22C55E },
  desert: { base: 0xFDE68A, texture: 0xF59E0B },
  water: { base: 0x3B82F6, texture: 0x60A5FA },
  road: { base: 0x9CA3AF, texture: 0x6B7280 },
  ore: 0xF97316,
} as const;

// Sprite sizes
export const SPRITE_SIZES = {
  terrain: { width: 64, height: 32 },
  infantry: { width: 32, height: 40 },
  vehicle: { width: 48, height: 32 },
  heavyVehicle: { width: 64, height: 40 },
  buildingSmall: { width: 128, height: 96 },
  buildingLarge: { width: 192, height: 144 },
  aircraft: { width: 40, height: 40 },
  projectile: { width: 8, height: 8 },
  explosion: { width: 64, height: 64 },
} as const;
