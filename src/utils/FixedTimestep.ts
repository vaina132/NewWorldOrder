/**
 * Fixed timestep accumulator for deterministic game logic.
 * Logic runs at 20Hz (TICK_RATE), rendering at 60 FPS with interpolation.
 * Uses accumulator pattern to avoid spiral-of-death.
 */

import { TICK_INTERVAL } from '@/config/GameConfig';

export class FixedTimestep {
  private accumulator = 0;
  private currentTick = 0;
  private readonly maxAccumulator: number;

  /** Interpolation alpha: 0..1 between previous and current state */
  public alpha = 0;

  constructor(
    private readonly tickInterval: number = TICK_INTERVAL,
    maxFrameSkip = 5
  ) {
    // Cap accumulator to prevent spiral-of-death
    this.maxAccumulator = tickInterval * maxFrameSkip;
  }

  /**
   * Call each frame with delta time in ms.
   * Returns the number of logic ticks to run this frame.
   */
  update(deltaMs: number): number {
    // Clamp to prevent spiral-of-death after tab suspension
    this.accumulator += Math.min(deltaMs, this.maxAccumulator);

    let ticks = 0;
    while (this.accumulator >= this.tickInterval) {
      this.accumulator -= this.tickInterval;
      this.currentTick++;
      ticks++;
    }

    // Interpolation alpha for rendering between ticks
    this.alpha = this.accumulator / this.tickInterval;

    return ticks;
  }

  getTick(): number {
    return this.currentTick;
  }

  getAlpha(): number {
    return this.alpha;
  }

  reset(): void {
    this.accumulator = 0;
    this.currentTick = 0;
    this.alpha = 0;
  }
}
