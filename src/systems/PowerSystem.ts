/**
 * PowerSystem — Calculates total power produced vs consumed per player.
 * Updates PlayerState with current power values.
 */

import type { EntityManager } from './EntityManager';
import type { PlayerState } from './PlayerState';
import type { PlayerId } from '@/utils/Types';

export class PowerSystem {
  private entityManager: EntityManager;
  private playerStates: Map<PlayerId, PlayerState>;

  constructor(entityManager: EntityManager, playerStates: Map<PlayerId, PlayerState>) {
    this.entityManager = entityManager;
    this.playerStates = playerStates;
  }

  /** Recalculate power for all players. Call after buildings are added/removed. */
  update(): void {
    // Accumulate power per player
    const produced = new Map<PlayerId, number>();
    const consumed = new Map<PlayerId, number>();

    for (const ps of this.playerStates.values()) {
      produced.set(ps.playerId, 0);
      consumed.set(ps.playerId, 0);
    }

    // Sum up all building power
    for (const entity of this.entityManager['buildings'].values()) {
      if (!entity.alive || entity.state !== 'active') continue;
      const pid = entity.ownerId;
      if (entity.powerProduced > 0) {
        produced.set(pid, (produced.get(pid) ?? 0) + entity.powerProduced);
      }
      if (entity.powerConsumed > 0) {
        consumed.set(pid, (consumed.get(pid) ?? 0) + entity.powerConsumed);
      }
    }

    // Update player states
    for (const ps of this.playerStates.values()) {
      ps.setPower(
        produced.get(ps.playerId) ?? 0,
        consumed.get(ps.playerId) ?? 0,
      );
    }
  }
}
