/**
 * CommandSystem — Processes all player commands.
 * ALL game state mutations flow through here (multiplayer-ready architecture).
 * In single-player, commands are executed immediately.
 * In multiplayer (Phase 7), commands are sent to server for validation.
 */

import type { GameCommand } from '@/utils/Commands';
import type { EntityManager } from './EntityManager';
import type { SelectionSystem } from './SelectionSystem';
import type { NavGrid } from '@/pathfinding/NavGrid';
import { findPath } from '@/pathfinding/AStar';
import { generateFlowField, getFlowDirection } from '@/pathfinding/FlowField';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { screenToTile } from '@/utils/IsometricUtils';
import type { PlayerId, TileCoord } from '@/utils/Types';
import { tileCoord } from '@/utils/Types';

const FLOW_FIELD_THRESHOLD = 5; // Use flow field when this many units target same area

export class CommandSystem {
  private entityManager: EntityManager;
  private selectionSystem: SelectionSystem;
  private navGrid: NavGrid;
  private localPlayerId: PlayerId;
  private currentTick = 0;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    entityManager: EntityManager,
    selectionSystem: SelectionSystem,
    navGrid: NavGrid,
    localPlayerId: PlayerId,
  ) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.selectionSystem = selectionSystem;
    this.navGrid = navGrid;
    this.localPlayerId = localPlayerId;

    this.setupInput();

    // Track tick
    gameEvents.on<{ tick: number }>(GameEvents.TICK, (data) => {
      this.currentTick = data.tick;
    });
  }

  private setupInput(): void {
    // Right-click to move/attack
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) return;
      if (this.selectionSystem.selectedCount === 0) return;

      const cam = this.scene.cameras.main;
      const tile = screenToTile(pointer.x, pointer.y, cam.scrollX, cam.scrollY, cam.zoom);

      this.issueCommand({
        type: 'MOVE',
        playerId: this.localPlayerId,
        unitIds: [...this.selectionSystem.selectedUnits],
        target: tile,
        tick: this.currentTick,
      });
    });

    // Hotkeys
    const keyboard = this.scene.input.keyboard!;

    // S = Stop
    keyboard.on('keydown-S', () => {
      if (this.selectionSystem.selectedCount === 0) return;
      this.issueCommand({
        type: 'STOP',
        playerId: this.localPlayerId,
        unitIds: [...this.selectionSystem.selectedUnits],
        tick: this.currentTick,
      });
    });

    // G = Guard
    keyboard.on('keydown-G', () => {
      if (this.selectionSystem.selectedCount === 0) return;
      this.issueCommand({
        type: 'GUARD',
        playerId: this.localPlayerId,
        unitIds: [...this.selectionSystem.selectedUnits],
        tick: this.currentTick,
      });
    });
  }

  /** Process a command. In multiplayer, this would go to the server first. */
  issueCommand(command: GameCommand): void {
    gameEvents.emit(GameEvents.COMMAND_ISSUED, command);
    this.executeCommand(command);
  }

  private executeCommand(command: GameCommand): void {
    switch (command.type) {
      case 'MOVE':
        this.executeMove(command.unitIds, command.target);
        break;
      case 'STOP':
        this.executeStop(command.unitIds);
        break;
      case 'GUARD':
        this.executeGuard(command.unitIds);
        break;
      case 'PATROL':
        this.executePatrol(command.unitIds, command.waypoints);
        break;
      case 'ATTACK':
      case 'ATTACK_MOVE':
      case 'BUILD':
      case 'PLACE_BUILDING':
      case 'PRODUCE_UNIT':
      case 'CANCEL_PRODUCTION':
      case 'SELL_BUILDING':
      case 'SET_RALLY_POINT':
      case 'USE_SUPERWEAPON':
      case 'CAPTURE':
        // Will be implemented in later phases
        break;
    }
  }

  private executeMove(unitIds: readonly import('@/utils/Types').EntityId[], target: TileCoord): void {
    const units = unitIds
      .map(id => this.entityManager.getUnit(id))
      .filter((u): u is NonNullable<typeof u> => u != null && u.alive);

    if (units.length === 0) return;

    if (units.length >= FLOW_FIELD_THRESHOLD) {
      // Use flow field for large groups
      const flowField = generateFlowField(this.navGrid, target.tileX, target.tileY);

      for (const unit of units) {
        // Each unit gets a short path from the flow field
        const path: TileCoord[] = [];
        let cx = unit.tileX;
        let cy = unit.tileY;
        const maxSteps = 200;

        for (let i = 0; i < maxSteps; i++) {
          if (cx === target.tileX && cy === target.tileY) break;
          const next = getFlowDirection(flowField, cx, cy);
          if (!next) break;
          path.push(next);
          cx = next.tileX;
          cy = next.tileY;
        }

        unit.startMoving(path);
      }
    } else {
      // Individual A* for small groups
      for (const unit of units) {
        const path = findPath(this.navGrid, unit.tileX, unit.tileY, target.tileX, target.tileY);
        unit.startMoving(path);
      }
    }
  }

  private executeStop(unitIds: readonly import('@/utils/Types').EntityId[]): void {
    for (const id of unitIds) {
      const unit = this.entityManager.getUnit(id);
      unit?.stop();
    }
  }

  private executeGuard(unitIds: readonly import('@/utils/Types').EntityId[]): void {
    for (const id of unitIds) {
      const unit = this.entityManager.getUnit(id);
      unit?.guard();
    }
  }

  private executePatrol(unitIds: readonly import('@/utils/Types').EntityId[], waypoints: TileCoord[]): void {
    for (const id of unitIds) {
      const unit = this.entityManager.getUnit(id);
      unit?.startPatrol(waypoints);
    }
  }

  /** Set up patrol mode: first right-click sets start, second sets end */
  enablePatrolMode(): void {
    // Will be fully implemented when UI supports mode switching
    const units = this.selectionSystem.selectedUnitList;
    if (units.length === 0) return;

    const waypoints: TileCoord[] = [];

    // Add current position as first waypoint
    const first = units[0]!;
    waypoints.push(tileCoord(first.tileX, first.tileY));

    // Next right-click adds second waypoint and starts patrol
    const handler = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) return;
      const cam = this.scene.cameras.main;
      const tile = screenToTile(pointer.x, pointer.y, cam.scrollX, cam.scrollY, cam.zoom);
      waypoints.push(tile);

      for (const unit of units) {
        unit.startPatrol([...waypoints]);
      }
      this.scene.input.off('pointerdown', handler);
    };

    this.scene.input.on('pointerdown', handler);
  }
}
