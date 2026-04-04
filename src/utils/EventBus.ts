/**
 * Typed event bus for decoupled system communication.
 * All cross-system events flow through here — never direct imports between systems.
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventEntry {
  callback: EventCallback<never>;
  context?: unknown;
  once: boolean;
}

export class EventBus {
  private listeners = new Map<string, EventEntry[]>();

  on<T>(event: string, callback: EventCallback<T>, context?: unknown): this {
    const entries = this.listeners.get(event) ?? [];
    entries.push({ callback: callback as EventCallback<never>, context, once: false });
    this.listeners.set(event, entries);
    return this;
  }

  once<T>(event: string, callback: EventCallback<T>, context?: unknown): this {
    const entries = this.listeners.get(event) ?? [];
    entries.push({ callback: callback as EventCallback<never>, context, once: true });
    this.listeners.set(event, entries);
    return this;
  }

  off<T>(event: string, callback?: EventCallback<T>): this {
    if (!callback) {
      this.listeners.delete(event);
      return this;
    }
    const entries = this.listeners.get(event);
    if (entries) {
      this.listeners.set(
        event,
        entries.filter(e => e.callback !== callback)
      );
    }
    return this;
  }

  emit<T>(event: string, data: T): this {
    const entries = this.listeners.get(event);
    if (!entries) return this;

    const remaining: EventEntry[] = [];
    for (const entry of entries) {
      (entry.callback as EventCallback<T>).call(entry.context, data);
      if (!entry.once) {
        remaining.push(entry);
      }
    }
    this.listeners.set(event, remaining);
    return this;
  }

  clear(): void {
    this.listeners.clear();
  }
}

/** Global game event bus — import and use everywhere */
export const gameEvents = new EventBus();

/**
 * Event type constants for type-safe event usage.
 * Add new events here as systems are built.
 */
export const GameEvents = {
  // Core
  TICK: 'tick',

  // Commands
  COMMAND_ISSUED: 'command:issued',

  // Units
  UNIT_CREATED: 'unit:created',
  UNIT_DESTROYED: 'unit:destroyed',
  UNIT_SELECTED: 'unit:selected',
  UNIT_DESELECTED: 'unit:deselected',
  UNIT_MOVED: 'unit:moved',

  // Buildings
  BUILDING_PLACED: 'building:placed',
  BUILDING_COMPLETED: 'building:completed',
  BUILDING_DESTROYED: 'building:destroyed',

  // Economy
  CREDITS_CHANGED: 'credits:changed',
  ORE_DEPOSITED: 'ore:deposited',

  // Power
  POWER_CHANGED: 'power:changed',
  POWER_LOW: 'power:low',
  POWER_OFF: 'power:off',

  // Combat
  ATTACK_STARTED: 'attack:started',
  DAMAGE_DEALT: 'damage:dealt',

  // Production
  PRODUCTION_STARTED: 'production:started',
  PRODUCTION_COMPLETED: 'production:completed',

  // Fog
  FOG_UPDATED: 'fog:updated',
} as const;
