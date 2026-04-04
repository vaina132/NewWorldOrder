/**
 * Generic object pool to avoid GC pressure (Anti-lag Rule 3).
 * Pre-allocates objects and recycles them instead of creating/destroying.
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private active: T[] = [];

  constructor(
    private readonly factory: () => T,
    private readonly reset: (obj: T) => void,
    initialSize: number = 0
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  /** Get an object from the pool (or create a new one if empty) */
  acquire(): T {
    const obj = this.pool.pop() ?? this.factory();
    this.active.push(obj);
    return obj;
  }

  /** Return an object to the pool */
  release(obj: T): void {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  /** Release all active objects back to the pool */
  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.length = 0;
  }

  /** Number of objects currently in use */
  get activeCount(): number {
    return this.active.length;
  }

  /** Number of objects available in the pool */
  get availableCount(): number {
    return this.pool.length;
  }
}
