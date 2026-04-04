/**
 * ResourceDisplay — Shows credits counter and power bar.
 * Positioned in the right sidebar below the minimap.
 */

import Phaser from 'phaser';
import type { PlayerState } from '@/systems/PlayerState';

export class ResourceDisplay {
  private creditsText: Phaser.GameObjects.Text;
  private powerText: Phaser.GameObjects.Text;
  private powerBar: Phaser.GameObjects.Graphics;
  private playerState: PlayerState;
  private x: number;
  private y: number;
  private width: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, playerState: PlayerState) {
    this.playerState = playerState;
    this.x = x;
    this.y = y;
    this.width = width;

    // Credits
    this.creditsText = scene.add.text(x, y, '₡ 10000', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#FCD34D',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(10001);

    // Power bar background
    this.powerBar = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(10001);

    // Power text
    this.powerText = scene.add.text(x, y + 24, 'Power: 100%', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00FF00',
    }).setScrollFactor(0).setDepth(10002);
  }

  update(): void {
    // Credits
    this.creditsText.setText(`₡ ${Math.floor(this.playerState.credits)}`);

    // Power
    const pct = this.playerState.powerPercent;
    const produced = this.playerState.powerProduced;
    const consumed = this.playerState.powerConsumed;

    let powerColor = '#00FF00';
    let barColor = 0x00FF00;
    if (pct < 100) { powerColor = '#FFFF00'; barColor = 0xFFFF00; }
    if (pct < 50) { powerColor = '#FF0000'; barColor = 0xFF0000; }

    this.powerText.setText(`⚡ ${produced}/${consumed} (${pct}%)`);
    this.powerText.setColor(powerColor);

    // Power bar
    this.powerBar.clear();
    const barY = this.y + 42;
    const barW = this.width;
    const barH = 6;

    // Background
    this.powerBar.fillStyle(0x333333, 1);
    this.powerBar.fillRect(this.x, barY, barW, barH);

    // Fill
    const fillW = Math.min(1, pct / 100) * barW;
    this.powerBar.fillStyle(barColor, 1);
    this.powerBar.fillRect(this.x, barY, fillW, barH);
  }
}
