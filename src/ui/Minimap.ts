/**
 * Minimap — Low-res overview of the entire map in the sidebar.
 * Click to navigate camera. Shows terrain and unit dots.
 */

import Phaser from 'phaser';
import { TERRAIN_COLORS, FACTION_COLORS, MAP_WIDTH, MAP_HEIGHT } from '@/config/GameConfig';
import { tileToWorld } from '@/utils/IsometricUtils';
import type { IsometricTilemap } from '@/rendering/IsometricTilemap';
import type { EntityManager } from '@/systems/EntityManager';

export class Minimap {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private tilemap: IsometricTilemap;
  private entityManager: EntityManager;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private scaleX: number;
  private scaleY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, tilemap: IsometricTilemap, entityManager: EntityManager) {
    this.scene = scene;
    this.tilemap = tilemap;
    this.entityManager = entityManager;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = Math.floor(width * 0.6); // Maintain aspect ratio
    this.scaleX = width / MAP_WIDTH;
    this.scaleY = this.height / MAP_HEIGHT;

    // Background
    scene.add.rectangle(x, y, width, this.height, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10001);

    this.graphics = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(10002);

    // Click to navigate
    const hitZone = scene.add.zone(x, y, width, this.height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10003)
      .setInteractive();

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tileX = Math.floor((pointer.x - x) / this.scaleX);
      const tileY = Math.floor((pointer.y - y) / this.scaleY);
      const world = tileToWorld(tileX, tileY);
      scene.cameras.main.centerOn(world.x, world.y);
    });
  }

  update(): void {
    this.graphics.clear();

    // Draw terrain dots
    for (let ty = 0; ty < MAP_HEIGHT; ty += 2) {
      for (let tx = 0; tx < MAP_WIDTH; tx += 2) {
        const terrain = this.tilemap.getTerrainAt(tx, ty);
        let color: number = TERRAIN_COLORS.grass.base;
        if (terrain === 1) color = TERRAIN_COLORS.desert.base;
        else if (terrain === 2) color = TERRAIN_COLORS.water.base;
        else if (terrain === 3) color = TERRAIN_COLORS.road.base;
        else if (terrain === 4) color = TERRAIN_COLORS.ore;

        this.graphics.fillStyle(color, 0.8);
        this.graphics.fillRect(
          this.x + tx * this.scaleX,
          this.y + ty * this.scaleY,
          this.scaleX * 2,
          this.scaleY * 2,
        );
      }
    }

    // Draw unit dots
    for (const unit of this.entityManager.getAllUnits()) {
      if (!unit.alive) continue;
      const color = unit.factionId === 'ac' ? FACTION_COLORS.ac.primary : FACTION_COLORS.ip.primary;
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(
        this.x + unit.tileX * this.scaleX,
        this.y + unit.tileY * this.scaleY,
        3, 3,
      );
    }

    // Draw camera viewport rectangle
    const cam = this.scene.cameras.main;
    const bounds = this.tilemap.worldBounds;
    const mapPixelW = bounds.maxX - bounds.minX;
    const mapPixelH = bounds.maxY - bounds.minY;

    if (mapPixelW > 0 && mapPixelH > 0) {
      const viewX = ((cam.scrollX - bounds.minX) / mapPixelW) * this.width;
      const viewY = ((cam.scrollY - bounds.minY) / mapPixelH) * this.height;
      const viewW = (cam.width / cam.zoom / mapPixelW) * this.width;
      const viewH = (cam.height / cam.zoom / mapPixelH) * this.height;

      this.graphics.lineStyle(1, 0xFFFFFF, 0.8);
      this.graphics.strokeRect(this.x + viewX, this.y + viewY, viewW, viewH);
    }
  }
}
