/**
 * Unit entity — infantry, vehicles, aircraft.
 * Has movement, combat stats, and a state machine.
 */

import { Entity } from './Entity';
import { StateMachine } from '@/utils/StateMachine';
import { tileToWorld } from '@/utils/IsometricUtils';
import { distance } from '@/utils/MathUtils';
import type { EntityId, PlayerId, FactionId, ArmorType, DamageType, UnitCategory, Direction, TileCoord } from '@/utils/Types';

export type UnitState = 'idle' | 'moving' | 'attacking' | 'guarding' | 'patrolling' | 'dead';

export interface UnitConfig {
  unitType: string;
  category: UnitCategory;
  maxHp: number;
  speed: number;            // tiles per second
  armor: ArmorType;
  damageType: DamageType;
  dps: number;
  range: number;            // tiles
  cost: number;
  buildTime: number;        // seconds
  spriteKey: string;
  sightRange: number;       // tiles
}

export class Unit extends Entity {
  readonly unitType: string;
  readonly category: UnitCategory;
  readonly speed: number;
  readonly armor: ArmorType;
  readonly damageType: DamageType;
  readonly dps: number;
  readonly range: number;
  readonly cost: number;
  readonly sightRange: number;

  // State machine
  fsm: StateMachine<UnitState, Unit>;

  // Movement
  path: TileCoord[] = [];
  pathIndex = 0;
  moveTargetX = 0;
  moveTargetY = 0;
  isMoving = false;
  direction: Direction = 's';

  // Combat
  attackTarget: EntityId | null = null;
  kills = 0;
  veterancy: 'rookie' | 'veteran' | 'elite' = 'rookie';

  // Guard/Patrol
  guardPosition: TileCoord | null = null;
  patrolWaypoints: TileCoord[] = [];
  patrolIndex = 0;

  // Selection
  selected = false;

  constructor(
    id: EntityId,
    ownerId: PlayerId,
    factionId: FactionId,
    tileX: number,
    tileY: number,
    config: UnitConfig,
  ) {
    super(id, 'unit', ownerId, factionId, tileX, tileY, config.maxHp, config.spriteKey);

    this.unitType = config.unitType;
    this.category = config.category;
    this.speed = config.speed;
    this.armor = config.armor;
    this.damageType = config.damageType;
    this.dps = config.dps;
    this.range = config.range;
    this.cost = config.cost;
    this.sightRange = config.sightRange;

    // Initialize FSM
    this.fsm = new StateMachine<UnitState, Unit>('idle', this);
    this.fsm
      .addState('idle', {
        onEnter: (unit) => {
          unit.isMoving = false;
          unit.path = [];
          unit.pathIndex = 0;
        },
      })
      .addState('moving', {
        onUpdate: (unit, dt) => {
          unit.updateMovement(dt);
        },
      })
      .addState('attacking', {})
      .addState('guarding', {
        onEnter: (unit) => {
          unit.isMoving = false;
          unit.guardPosition = { tileX: unit.tileX, tileY: unit.tileY };
        },
      })
      .addState('patrolling', {
        onUpdate: (unit, dt) => {
          unit.updatePatrol(dt);
        },
      })
      .addState('dead', {
        onEnter: (unit) => {
          unit.alive = false;
        },
      });

    this.fsm.start();
  }

  update(dt: number): void {
    this.fsm.update(dt);
  }

  /** Start moving along a path */
  startMoving(path: TileCoord[]): void {
    if (path.length === 0) return;
    this.path = path;
    this.pathIndex = 0;
    this.setNextWaypoint();
    this.fsm.transition('moving');
    this.isMoving = true;
  }

  /** Stop all movement */
  stop(): void {
    this.fsm.transition('idle');
    this.attackTarget = null;
    this.patrolWaypoints = [];
  }

  /** Enter guard mode at current position */
  guard(): void {
    this.fsm.transition('guarding');
  }

  /** Start patrol between waypoints */
  startPatrol(waypoints: TileCoord[]): void {
    if (waypoints.length < 2) return;
    this.patrolWaypoints = waypoints;
    this.patrolIndex = 0;
    this.startMoving([waypoints[0]!]);
    this.fsm.transition('patrolling');
  }

  private setNextWaypoint(): void {
    const waypoint = this.path[this.pathIndex];
    if (!waypoint) return;
    const world = tileToWorld(waypoint.tileX, waypoint.tileY);
    this.moveTargetX = world.x;
    this.moveTargetY = world.y;

    // Update direction
    const dx = this.moveTargetX - this.worldX;
    const dy = this.moveTargetY - this.worldY;
    this.direction = this.calcDirection(dx, dy);
  }

  private updateMovement(dt: number): void {
    const moveSpeed = this.speed * 32 * (dt / 1000); // tiles/sec * pixels/tile * seconds
    const dist = distance(this.worldX, this.worldY, this.moveTargetX, this.moveTargetY);

    if (dist <= moveSpeed) {
      // Reached waypoint
      this.worldX = this.moveTargetX;
      this.worldY = this.moveTargetY;

      const waypoint = this.path[this.pathIndex];
      if (waypoint) {
        this.tileX = waypoint.tileX;
        this.tileY = waypoint.tileY;
      }

      this.pathIndex++;
      if (this.pathIndex < this.path.length) {
        this.setNextWaypoint();
      } else {
        // Path complete
        this.fsm.transition('idle');
      }
    } else {
      // Move toward waypoint
      const dx = this.moveTargetX - this.worldX;
      const dy = this.moveTargetY - this.worldY;
      const nx = dx / dist;
      const ny = dy / dist;
      this.worldX += nx * moveSpeed;
      this.worldY += ny * moveSpeed;
    }
  }

  private updatePatrol(dt: number): void {
    // If not currently moving, go to next patrol point
    if (!this.isMoving && this.patrolWaypoints.length >= 2) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolWaypoints.length;
      const next = this.patrolWaypoints[this.patrolIndex]!;
      const world = tileToWorld(next.tileX, next.tileY);
      this.moveTargetX = world.x;
      this.moveTargetY = world.y;
      this.isMoving = true;
    }
    if (this.isMoving) {
      this.updateMovement(dt);
    }
  }

  private calcDirection(dx: number, dy: number): Direction {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Map angle to 8 directions
    if (angle >= -22.5 && angle < 22.5) return 'e';
    if (angle >= 22.5 && angle < 67.5) return 'se';
    if (angle >= 67.5 && angle < 112.5) return 's';
    if (angle >= 112.5 && angle < 157.5) return 'sw';
    if (angle >= 157.5 || angle < -157.5) return 'w';
    if (angle >= -157.5 && angle < -112.5) return 'nw';
    if (angle >= -112.5 && angle < -67.5) return 'n';
    return 'ne';
  }
}
