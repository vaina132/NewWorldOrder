/**
 * Base entity class for all game objects (units, buildings, projectiles).
 * Stores position as both tile coords and world coords.
 * Includes interpolation state for smooth rendering between logic ticks.
 */

import type { EntityId, PlayerId, WorldCoord, FactionId, EntityKind } from '@/utils/Types';
import { tileToWorld } from '@/utils/IsometricUtils';
import { lerp } from '@/utils/MathUtils';

export abstract class Entity {
  readonly id: EntityId;
  readonly kind: EntityKind;
  readonly ownerId: PlayerId;
  readonly factionId: FactionId;

  // Tile position
  tileX: number;
  tileY: number;

  // World position (current tick)
  worldX: number;
  worldY: number;

  // Previous world position (for render interpolation)
  prevWorldX: number;
  prevWorldY: number;

  // Stats
  maxHp: number;
  hp: number;
  alive = true;

  // Sprite key in atlas
  spriteKey: string;

  // Phaser sprite reference (set by EntityManager)
  sprite: Phaser.GameObjects.Sprite | null = null;

  constructor(
    id: EntityId,
    kind: EntityKind,
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    maxHp: number,
    spriteKey: string,
  ) {
    this.id = id;
    this.kind = kind;
    this.ownerId = ownerId;
    this.factionId = factionId;
    this.tileX = tileX;
    this.tileY = tileY;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.spriteKey = spriteKey;

    const world = tileToWorld(tileX, tileY);
    this.worldX = world.x;
    this.worldY = world.y;
    this.prevWorldX = world.x;
    this.prevWorldY = world.y;
  }

  /** Save current position as previous (call before logic tick moves entity) */
  savePreviousPosition(): void {
    this.prevWorldX = this.worldX;
    this.prevWorldY = this.worldY;
  }

  /** Set world position from tile coords */
  setTilePosition(tileX: number, tileY: number): void {
    this.tileX = tileX;
    this.tileY = tileY;
    const world = tileToWorld(tileX, tileY);
    this.worldX = world.x;
    this.worldY = world.y;
  }

  /** Set world position directly (for smooth movement between tiles) */
  setWorldPosition(x: number, y: number): void {
    this.worldX = x;
    this.worldY = y;
  }

  /** Get interpolated world position for rendering */
  getInterpolatedPosition(alpha: number): WorldCoord {
    return {
      x: lerp(this.prevWorldX, this.worldX, alpha),
      y: lerp(this.prevWorldY, this.worldY, alpha),
    };
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  getHpPercent(): number {
    return this.hp / this.maxHp;
  }

  abstract update(dt: number): void;
}
