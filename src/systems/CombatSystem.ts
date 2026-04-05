/**
 * CombatSystem — Handles attacking, damage dealing, auto-attack, and death.
 * Uses SpatialHash for efficient range queries.
 * Uses DamageTable for armor multipliers.
 */

import { Unit } from '@/entities/Unit';
import { Building } from '@/entities/Building';
import type { Entity } from '@/entities/Entity';
import type { EntityManager } from './EntityManager';
import type { PlayerState } from './PlayerState';
import { calculateDamage } from '@/config/DamageTable';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { findPath } from '@/pathfinding/AStar';
import { distance } from '@/utils/MathUtils';
import type { NavGrid } from '@/pathfinding/NavGrid';
import type { EntityId, PlayerId } from '@/utils/Types';

export class CombatSystem {
  private entityManager: EntityManager;
  private playerStates: Map<PlayerId, PlayerState>;
  private navGrid: NavGrid | null = null;
  private projectileSpawner: ((fromX: number, fromY: number, toX: number, toY: number, color: number) => void) | null = null;

  constructor(entityManager: EntityManager, playerStates: Map<PlayerId, PlayerState>) {
    this.entityManager = entityManager;
    this.playerStates = playerStates;
  }

  setNavGrid(navGrid: NavGrid): void {
    this.navGrid = navGrid;
  }

  /** Set callback for spawning visual projectiles */
  setProjectileSpawner(fn: (fromX: number, fromY: number, toX: number, toY: number, color: number) => void): void {
    this.projectileSpawner = fn;
  }

  /** Main update — process attacks and auto-attack for all units */
  update(dt: number): void {
    for (const unit of this.entityManager.getAllUnits()) {
      if (!unit.alive || unit.dps <= 0) continue;

      // If unit has an attack target, try to attack it
      if (unit.attackTarget) {
        this.processAttack(unit, unit.attackTarget, dt);
        continue;
      }

      // Auto-attack: units in guard or idle state attack nearby enemies
      if (unit.fsm.is('idle') || unit.fsm.is('guarding')) {
        const enemy = this.findNearestEnemy(unit);
        if (enemy) {
          unit.attackTarget = enemy.id;
          this.processAttack(unit, enemy.id, dt);
        }
      }
    }

    // Remove dead entities
    const deadIds: EntityId[] = [];
    for (const unit of this.entityManager.getAllUnits()) {
      if (!unit.alive) deadIds.push(unit.id);
    }
    for (const id of deadIds) {
      this.entityManager.destroy(id);
    }
  }

  /** Process a single unit attacking a target */
  private processAttack(attacker: Unit, targetId: EntityId, dt: number): void {
    const target = this.entityManager.getEntity(targetId);
    if (!target || !target.alive) {
      attacker.attackTarget = null;
      return;
    }

    const rangePx = attacker.range * 32;
    const dist = distance(attacker.worldX, attacker.worldY, target.worldX, target.worldY);

    // Out of range? Move toward target
    if (dist > rangePx) {
      if (!attacker.isMoving && this.navGrid) {
        const path = findPath(this.navGrid, attacker.tileX, attacker.tileY, target.tileX, target.tileY);
        if (path.length > 0) attacker.startMoving(path);
      }
      return;
    }

    // In range — deal damage
    const armorType = target instanceof Unit ? target.armor :
                      target instanceof Building ? 'building' as const : 'none' as const;

    const rawDamage = attacker.dps * dt;
    const finalDamage = calculateDamage(rawDamage, attacker.damageType, armorType);

    target.takeDamage(finalDamage);

    // Spawn visual projectile
    if (this.projectileSpawner) {
      const color = attacker.factionId === 'ac' ? 0x60A5FA : 0xF87171;
      this.projectileSpawner(attacker.worldX, attacker.worldY, target.worldX, target.worldY, color);
    }

    gameEvents.emit(GameEvents.DAMAGE_DEALT, {
      attackerId: attacker.id,
      targetId: target.id,
      damage: finalDamage,
    });

    // Track kills for veterancy
    if (!target.alive && target instanceof Unit) {
      attacker.kills++;
    }

    // If target died, clear attack target
    if (!target.alive) {
      attacker.attackTarget = null;
    }
  }

  /** Find nearest enemy unit within sight range */
  private findNearestEnemy(unit: Unit): Entity | null {
    const sightPx = unit.sightRange * 32;
    const nearby = this.entityManager.getEntitiesInRadius(unit.worldX, unit.worldY, sightPx);

    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const entity of nearby) {
      if (entity.ownerId === unit.ownerId) continue; // Same team
      if (!entity.alive) continue;

      const d = distance(unit.worldX, unit.worldY, entity.worldX, entity.worldY);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = entity;
      }
    }
    return nearest;
  }

  /** Issue an attack command (from CommandSystem) */
  attackTarget(attackerIds: EntityId[], targetId: EntityId): void {
    for (const id of attackerIds) {
      const unit = this.entityManager.getUnit(id);
      if (unit?.alive) {
        unit.attackTarget = targetId;
        unit.fsm.transition('attacking');
      }
    }
  }
}
