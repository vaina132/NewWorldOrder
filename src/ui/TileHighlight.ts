/**
 * Enhanced tile highlight — shows a glowing diamond on the tile under the cursor.
 */

import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from '@/config/GameConfig';
import { screenToWorld, worldToTileSnapped, tileToWorld, isInBounds } from '@/utils/IsometricUtils';

export class TileHighlight {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private coordText: Phaser.GameObjects.Text;
  private pulsePhase = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9000);

    this.coordText = scene.add.text(10, scene.cameras.main.height - 30, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#AAAAAA',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 },
    })
      .setScrollFactor(0)
      .setDepth(10000);
  }

  update(): void {
    this.graphics.clear();
    this.pulsePhase += 0.05;

    const pointer = this.scene.input.activePointer;
    const cam = this.scene.cameras.main;

    const world = screenToWorld(pointer.x, pointer.y, cam.scrollX, cam.scrollY, cam.zoom);
    const tile = worldToTileSnapped(world.x, world.y);

    if (!isInBounds(tile.tileX, tile.tileY, MAP_WIDTH, MAP_HEIGHT)) {
      this.coordText.setText('');
      return;
    }

    const tileWorld = tileToWorld(tile.tileX, tile.tileY);
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    // Pulsing alpha
    const pulseAlpha = 0.15 + Math.sin(this.pulsePhase) * 0.08;

    // Inner glow fill
    this.graphics.fillStyle(0xFFFFFF, pulseAlpha);
    this.graphics.beginPath();
    this.graphics.moveTo(tileWorld.x, tileWorld.y - halfH);
    this.graphics.lineTo(tileWorld.x + halfW, tileWorld.y);
    this.graphics.lineTo(tileWorld.x, tileWorld.y + halfH);
    this.graphics.lineTo(tileWorld.x - halfW, tileWorld.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Bright outline
    this.graphics.lineStyle(2, 0x60A5FA, 0.6 + Math.sin(this.pulsePhase) * 0.2);
    this.graphics.strokePath();

    // Corner dots
    const dotAlpha = 0.5 + Math.sin(this.pulsePhase * 1.5) * 0.3;
    this.graphics.fillStyle(0x60A5FA, dotAlpha);
    this.graphics.fillCircle(tileWorld.x, tileWorld.y - halfH, 2);
    this.graphics.fillCircle(tileWorld.x + halfW, tileWorld.y, 2);
    this.graphics.fillCircle(tileWorld.x, tileWorld.y + halfH, 2);
    this.graphics.fillCircle(tileWorld.x - halfW, tileWorld.y, 2);

    this.coordText.setText(`Tile: ${tile.tileX}, ${tile.tileY}`);
  }
}
