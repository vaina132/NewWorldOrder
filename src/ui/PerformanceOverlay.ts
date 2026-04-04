import Phaser from 'phaser';
import { TARGET_FPS, MAX_DRAW_CALLS, MAX_ACTIVE_SPRITES } from '@/config/GameConfig';

/**
 * Debug performance overlay — toggle with F3.
 * Shows FPS, tick rate, draw calls, memory, and performance budget status.
 */
export class PerformanceOverlay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private visible = false;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private displayFps = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.text = scene.add.text(10, 10, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00FF00',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 8, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(10000)
      .setVisible(false);

    // F3 to toggle
    scene.input.keyboard?.on('keydown-F3', () => {
      this.visible = !this.visible;
      this.text.setVisible(this.visible);
    });
  }

  update(delta: number, logicTicks: number, currentTick: number): void {
    if (!this.visible) return;

    // Calculate FPS (averaged over 0.5s)
    this.frameCount++;
    this.fpsAccumulator += delta;
    if (this.fpsAccumulator >= 500) {
      this.displayFps = Math.round((this.frameCount / this.fpsAccumulator) * 1000);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    const fpsColor = this.displayFps >= TARGET_FPS - 5 ? '#00FF00' : this.displayFps >= 30 ? '#FFFF00' : '#FF0000';

    // Get renderer info
    const renderer = this.scene.game.renderer;
    let drawCalls = 0;
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      drawCalls = (renderer as unknown as { drawCount?: number }).drawCount ?? 0;
    }

    // Memory (if available)
    const perf = performance as { memory?: { usedJSHeapSize: number } };
    const memMB = perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : -1;

    const lines = [
      `FPS: ${this.displayFps} ${this.displayFps < 30 ? '!! RED LINE !!' : ''}`,
      `Logic Tick: ${currentTick} (${logicTicks} this frame)`,
      `Draw Calls: ${drawCalls} / ${MAX_DRAW_CALLS}`,
      `Sprites: - / ${MAX_ACTIVE_SPRITES}`,
      memMB >= 0 ? `Memory: ${memMB} MB` : '',
      `Zoom: ${this.scene.cameras.main.zoom.toFixed(1)}x`,
      `Camera: ${Math.round(this.scene.cameras.main.scrollX)}, ${Math.round(this.scene.cameras.main.scrollY)}`,
    ].filter(Boolean);

    this.text.setText(lines.join('\n'));
    this.text.setColor(fpsColor);
  }
}
