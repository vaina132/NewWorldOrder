/**
 * Generic finite state machine with typed states and events.
 * Used by Harvesters, Combat Units, Buildings, Aircraft, Superweapons.
 */

export interface StateHandlers<_S extends string, C> {
  onEnter?(context: C): void;
  onUpdate?(context: C, dt: number): void;
  onExit?(context: C): void;
}

export class StateMachine<S extends string, C> {
  private currentState: S;
  private states = new Map<S, StateHandlers<S, C>>();
  private context: C;

  constructor(initialState: S, context: C) {
    this.currentState = initialState;
    this.context = context;
  }

  addState(state: S, handlers: StateHandlers<S, C>): this {
    this.states.set(state, handlers);
    return this;
  }

  start(): void {
    const handlers = this.states.get(this.currentState);
    handlers?.onEnter?.(this.context);
  }

  transition(newState: S): void {
    if (newState === this.currentState) return;

    const oldHandlers = this.states.get(this.currentState);
    oldHandlers?.onExit?.(this.context);

    this.currentState = newState;

    const newHandlers = this.states.get(this.currentState);
    newHandlers?.onEnter?.(this.context);
  }

  update(dt: number): void {
    const handlers = this.states.get(this.currentState);
    handlers?.onUpdate?.(this.context, dt);
  }

  getState(): S {
    return this.currentState;
  }

  is(state: S): boolean {
    return this.currentState === state;
  }
}
