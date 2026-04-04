/**
 * PlayerState — Per-player state: credits, power, faction.
 * Isolated per player (multiplayer-ready architecture).
 */

import type { PlayerId, FactionId, PowerState } from '@/utils/Types';
import { gameEvents, GameEvents } from '@/utils/EventBus';

export class PlayerState {
  readonly playerId: PlayerId;
  readonly factionId: FactionId;

  private _credits: number;
  private _powerProduced = 0;
  private _powerConsumed = 0;

  constructor(playerId: PlayerId, factionId: FactionId, startingCredits: number = 10000) {
    this.playerId = playerId;
    this.factionId = factionId;
    this._credits = startingCredits;
  }

  // --- Credits ---

  get credits(): number { return this._credits; }

  addCredits(amount: number): void {
    this._credits += amount;
    gameEvents.emit(GameEvents.CREDITS_CHANGED, {
      playerId: this.playerId, credits: this._credits,
    });
  }

  spendCredits(amount: number): boolean {
    if (this._credits < amount) return false;
    this._credits -= amount;
    gameEvents.emit(GameEvents.CREDITS_CHANGED, {
      playerId: this.playerId, credits: this._credits,
    });
    return true;
  }

  canAfford(amount: number): boolean {
    return this._credits >= amount;
  }

  // --- Power ---

  get powerProduced(): number { return this._powerProduced; }
  get powerConsumed(): number { return this._powerConsumed; }

  get powerPercent(): number {
    if (this._powerConsumed === 0) return 100;
    return Math.round((this._powerProduced / this._powerConsumed) * 100);
  }

  get powerState(): PowerState {
    const pct = this.powerPercent;
    if (pct >= 100) return 'full';
    if (pct > 0) return 'low';
    return 'off';
  }

  setPower(produced: number, consumed: number): void {
    const oldState = this.powerState;
    this._powerProduced = produced;
    this._powerConsumed = consumed;
    const newState = this.powerState;

    gameEvents.emit(GameEvents.POWER_CHANGED, {
      playerId: this.playerId,
      produced, consumed,
      percent: this.powerPercent,
      state: newState,
    });

    if (newState !== oldState) {
      if (newState === 'low') gameEvents.emit(GameEvents.POWER_LOW, { playerId: this.playerId });
      if (newState === 'off') gameEvents.emit(GameEvents.POWER_OFF, { playerId: this.playerId });
    }
  }

  /** Production speed multiplier based on power state */
  get productionSpeedMultiplier(): number {
    switch (this.powerState) {
      case 'full': return 1;
      case 'low': return 0.5;
      case 'off': return 0;
    }
  }
}
