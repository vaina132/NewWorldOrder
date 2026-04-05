/**
 * SuperweaponSystem — Manages superweapon charge timers and execution.
 * AC: Marine Force Drop (5-min cooldown, paradrops 8 elite marines)
 * IP: Nuclear Missile Silo (7-min cooldown, massive AOE + radiation zone)
 */

import Phaser from 'phaser';
import type { EntityManager } from './EntityManager';
import type { PlayerState } from './PlayerState';
import { getFaction } from '@/config/FactionRegistry';
import { tileToWorld } from '@/utils/IsometricUtils';
import { gameEvents } from '@/utils/EventBus';
import type { PlayerId, FactionId, TileCoord, EntityId } from '@/utils/Types';

export interface SuperweaponState {
  type: 'marine_drop' | 'nuclear_missile';
  playerId: PlayerId;
  chargeTime: number;     // total seconds to charge
  currentCharge: number;  // seconds charged so far
  ready: boolean;
  buildingId: EntityId;
}

const MARINE_DROP_COOLDOWN = 300;    // 5 minutes
const NUCLEAR_COOLDOWN = 420;        // 7 minutes
const MARINE_DROP_COUNT = 8;
const NUKE_DAMAGE = 500;
const NUKE_RADIUS = 6;              // tiles
const RADIATION_DURATION = 30;       // seconds
const RADIATION_DPS = 3;

export class SuperweaponSystem {
  private entityManager: EntityManager;
  private playerStates: Map<PlayerId, PlayerState>;
  private superweapons: SuperweaponState[] = [];
  private scene: Phaser.Scene;

  // Radiation zones
  private radiationZones: { tileX: number; tileY: number; radius: number; remaining: number }[] = [];

  constructor(scene: Phaser.Scene, entityManager: EntityManager, playerStates: Map<PlayerId, PlayerState>) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.playerStates = playerStates;
  }

  /** Register a superweapon building */
  registerSuperweapon(type: 'marine_drop' | 'nuclear_missile', playerId: PlayerId, buildingId: EntityId): void {
    const chargeTime = type === 'marine_drop' ? MARINE_DROP_COOLDOWN : NUCLEAR_COOLDOWN;
    this.superweapons.push({
      type, playerId, chargeTime, currentCharge: 0, ready: false, buildingId,
    });
  }

  /** Update charge timers */
  update(dt: number): void {
    for (const sw of this.superweapons) {
      // Check building still exists
      const building = this.entityManager.getEntity(sw.buildingId);
      if (!building?.alive) continue;

      if (!sw.ready) {
        sw.currentCharge += dt;
        if (sw.currentCharge >= sw.chargeTime) {
          sw.ready = true;
          sw.currentCharge = sw.chargeTime;
        }
      }
    }

    // Update radiation zones
    for (let i = this.radiationZones.length - 1; i >= 0; i--) {
      const zone = this.radiationZones[i]!;
      zone.remaining -= dt;
      if (zone.remaining <= 0) {
        this.radiationZones.splice(i, 1);
        continue;
      }

      // Damage units in radiation zone
      const centerWorld = tileToWorld(zone.tileX, zone.tileY);
      const entities = this.entityManager.getEntitiesInRadius(centerWorld.x, centerWorld.y, zone.radius * 32);
      for (const entity of entities) {
        entity.takeDamage(RADIATION_DPS * dt);
      }
    }
  }

  /** Fire a superweapon at a target location */
  fire(playerId: PlayerId, target: TileCoord): boolean {
    const sw = this.superweapons.find(s => s.playerId === playerId && s.ready);
    if (!sw) return false;

    if (sw.type === 'marine_drop') {
      this.executeMarineDrop(playerId, target);
    } else if (sw.type === 'nuclear_missile') {
      this.executeNuclearStrike(playerId, target);
    }

    // Reset cooldown
    sw.ready = false;
    sw.currentCharge = 0;
    return true;
  }

  private executeMarineDrop(playerId: PlayerId, target: TileCoord): void {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    const faction = getFaction(playerState.factionId);
    const marineConfig = faction.units['rifleman']; // Marines use rifleman config with elite stats
    if (!marineConfig) return;

    // Spawn 8 marines around target
    for (let i = 0; i < MARINE_DROP_COUNT; i++) {
      const offsetX = (i % 4) - 1;
      const offsetY = Math.floor(i / 4) - 1;
      const unit = this.entityManager.spawnUnit(
        playerId, playerState.factionId,
        target.tileX + offsetX, target.tileY + offsetY,
        { ...marineConfig, unitType: 'marine', maxHp: 200 },
      );
      // Marines arrive as elite
      unit.veterancy = 'elite';
      unit.kills = 7;
    }

    // Visual: parachute effect
    const world = tileToWorld(target.tileX, target.tileY);
    const text = this.scene.add.text(world.x, world.y - 40, 'MARINE DROP!', {
      fontFamily: 'monospace', fontSize: '14px', color: '#60A5FA', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9999);

    this.scene.tweens.add({
      targets: text, alpha: 0, y: world.y - 80, duration: 2000,
      onComplete: () => text.destroy(),
    });
  }

  private executeNuclearStrike(playerId: PlayerId, target: TileCoord): void {
    const world = tileToWorld(target.tileX, target.tileY);

    // Damage all entities in radius
    const entities = this.entityManager.getEntitiesInRadius(world.x, world.y, NUKE_RADIUS * 32);
    for (const entity of entities) {
      entity.takeDamage(NUKE_DAMAGE);
    }

    // Create radiation zone
    this.radiationZones.push({
      tileX: target.tileX, tileY: target.tileY,
      radius: NUKE_RADIUS, remaining: RADIATION_DURATION,
    });

    // Visual: explosion
    const flash = this.scene.add.circle(world.x, world.y, 10, 0xFFFFFF, 1).setDepth(9999);
    this.scene.tweens.add({
      targets: flash, scale: 20, alpha: 0, duration: 1000,
      onComplete: () => flash.destroy(),
    });

    const text = this.scene.add.text(world.x, world.y - 60, 'NUCLEAR STRIKE!', {
      fontFamily: 'monospace', fontSize: '16px', color: '#FF0000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9999);

    this.scene.tweens.add({
      targets: text, alpha: 0, y: world.y - 100, duration: 3000,
      onComplete: () => text.destroy(),
    });
  }

  /** Get all superweapon states for a player */
  getPlayerSuperweapons(playerId: PlayerId): SuperweaponState[] {
    return this.superweapons.filter(s => s.playerId === playerId);
  }

  /** Get radiation zones (for rendering) */
  getRadiationZones() { return this.radiationZones; }
}
