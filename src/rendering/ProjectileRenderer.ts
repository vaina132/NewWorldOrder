/**
 * ProjectileRenderer — Visual-only projectile effects using object pooling.
 * Projectiles travel from attacker to target and disappear on impact.
 * Pure rendering — no game logic.
 */

import Phaser from 'phaser';

interface ActiveProjectile {
  graphics: Phaser.GameObjects.Arc;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
}

const POOL_SIZE = 100;
const PROJECTILE_SPEED = 800; // pixels per second

export class ProjectileRenderer {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Arc[] = [];
  private active: ActiveProjectile[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Pre-allocate projectile sprites
    for (let i = 0; i < POOL_SIZE; i++) {
      const dot = scene.add.circle(0, 0, 3, 0xFFFFFF)
        .setVisible(false)
        .setDepth(9500);
      this.pool.push(dot);
    }
  }

  /** Spawn a visual projectile */
  spawn(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const dot = this.pool.pop();
    if (!dot) return; // Pool exhausted

    dot.setPosition(fromX, fromY);
    dot.setFillStyle(color);
    dot.setVisible(true);

    this.active.push({
      graphics: dot,
      fromX, fromY, toX, toY,
      progress: 0,
      speed: PROJECTILE_SPEED,
    });
  }

  /** Update projectile positions each frame */
  update(delta: number): void {
    const dt = delta / 1000;
    const toRemove: number[] = [];

    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i]!;
      const dx = p.toX - p.fromX;
      const dy = p.toY - p.fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) {
        toRemove.push(i);
        continue;
      }

      p.progress += (p.speed * dt) / dist;

      if (p.progress >= 1) {
        toRemove.push(i);
        // Impact flash
        this.spawnImpact(p.toX, p.toY);
      } else {
        const x = p.fromX + dx * p.progress;
        const y = p.fromY + dy * p.progress;
        p.graphics.setPosition(x, y);
      }
    }

    // Return completed projectiles to pool
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i]!;
      const p = this.active[idx]!;
      p.graphics.setVisible(false);
      this.pool.push(p.graphics);
      this.active.splice(idx, 1);
    }
  }

  private spawnImpact(x: number, y: number): void {
    // Brief flash effect
    const flash = this.scene.add.circle(x, y, 6, 0xFFFF00, 0.8)
      .setDepth(9500);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  get activeCount(): number {
    return this.active.length;
  }
}
