/**
 * Shows a diamond highlight on the tile under the mouse cursor.
 * Also displays tile coordinates in debug text.
 */

import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from '@/config/GameConfig';
import { screenToWorld, worldToTileSnapped, tileToWorld, isInBounds } from '@/utils/IsometricUtils';

export class TileHighlight {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private coordText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9000);

    this.coordText = scene.add.text(10, scene.cameras.main.height - 30, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#AAAAAA',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 4, y: 2 },
    })
      .setScrollFactor(0)
      .setDepth(10000);
  }

  update(): void {
    this.graphics.clear();

    const pointer = this.scene.input.activePointer;
    const cam = this.scene.cameras.main;

    const world = screenToWorld(pointer.x, pointer.y, cam.scrollX, cam.scrollY, cam.zoom);
    const tile = worldToTileSnapped(world.x, world.y);

    if (!isInBounds(tile.tileX, tile.tileY, MAP_WIDTH, MAP_HEIGHT)) {
      this.coordText.setText('');
      return;
    }

    // Draw diamond highlight
    const tileWorld = tileToWorld(tile.tileX, tile.tileY);
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    this.graphics.lineStyle(2, 0xFFFFFF, 0.5);
    this.graphics.fillStyle(0xFFFFFF, 0.1);
    this.graphics.beginPath();
    this.graphics.moveTo(tileWorld.x, tileWorld.y - halfH);
    this.graphics.lineTo(tileWorld.x + halfW, tileWorld.y);
    this.graphics.lineTo(tileWorld.x, tileWorld.y + halfH);
    this.graphics.lineTo(tileWorld.x - halfW, tileWorld.y);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    // Coordinate display
    this.coordText.setText(`Tile: ${tile.tileX}, ${tile.tileY}`);
  }
}
