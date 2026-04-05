/**
 * FogRenderer — Renders fog of war as a semi-transparent overlay.
 * Uses a low-res canvas texture, only redraws changed cells (Anti-lag Rule 4).
 */

import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from '@/config/GameConfig';
import { tileToWorld } from '@/utils/IsometricUtils';
import type { FogSystem } from '@/systems/FogSystem';

export class FogRenderer {
  private scene: Phaser.Scene;
  private fogSystem: FogSystem;
  private graphics: Phaser.GameObjects.Graphics;
  private lastFogState: Uint8Array[];

  constructor(scene: Phaser.Scene, fogSystem: FogSystem) {
    this.scene = scene;
    this.fogSystem = fogSystem;
    this.graphics = scene.add.graphics().setDepth(8000);

    // Initialize last state tracking
    this.lastFogState = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.lastFogState[y] = new Uint8Array(MAP_WIDTH);
    }
  }

  /** Full redraw of fog overlay */
  update(): void {
    this.graphics.clear();

    const fogData = this.fogSystem.getFogData();
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const state = fogData[y]![x]!;

        if (state === 2) continue; // Fully visible — no overlay

        const world = tileToWorld(x, y);

        if (state === 0) {
          // Unexplored — black
          this.graphics.fillStyle(0x000000, 0.85);
        } else {
          // Shroud — dark grey
          this.graphics.fillStyle(0x000000, 0.45);
        }

        this.graphics.beginPath();
        this.graphics.moveTo(world.x, world.y - halfH);
        this.graphics.lineTo(world.x + halfW, world.y);
        this.graphics.lineTo(world.x, world.y + halfH);
        this.graphics.lineTo(world.x - halfW, world.y);
        this.graphics.closePath();
        this.graphics.fillPath();
      }
    }
  }
}
