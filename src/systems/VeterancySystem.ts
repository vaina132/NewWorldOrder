/**
 * VeterancySystem — Tracks kills and promotes units.
 * Rookie → Veteran (3 kills: +25%) → Elite (7 kills: +50%, self-heal)
 */

import type { EntityManager } from './EntityManager';

const VETERAN_KILLS = 3;
const ELITE_KILLS = 7;
const VETERAN_BONUS = 0.25;
const ELITE_BONUS = 0.50;
const ELITE_HEAL_RATE = 1; // HP per second

export class VeterancySystem {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  update(dt: number): void {
    for (const unit of this.entityManager.getAllUnits()) {
      if (!unit.alive) continue;

      // Check for promotion
      if (unit.veterancy === 'rookie' && unit.kills >= VETERAN_KILLS) {
        unit.veterancy = 'veteran';
        // Apply bonus (+25% HP and damage are handled by reading veterancy in combat)
        unit.maxHp = Math.round(unit.maxHp * (1 + VETERAN_BONUS));
        unit.hp = Math.min(unit.hp + Math.round(unit.maxHp * VETERAN_BONUS), unit.maxHp);
      }

      if (unit.veterancy === 'veteran' && unit.kills >= ELITE_KILLS) {
        unit.veterancy = 'elite';
        unit.maxHp = Math.round(unit.maxHp * (1 + ELITE_BONUS) / (1 + VETERAN_BONUS));
        unit.hp = Math.min(unit.hp + Math.round(unit.maxHp * 0.25), unit.maxHp);
      }

      // Elite self-heal
      if (unit.veterancy === 'elite' && unit.hp < unit.maxHp) {
        unit.hp = Math.min(unit.maxHp, unit.hp + ELITE_HEAL_RATE * dt);
      }
    }
  }
}
