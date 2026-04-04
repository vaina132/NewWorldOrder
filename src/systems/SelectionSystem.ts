/**
 * SelectionSystem — Handles all unit selection input.
 * Single click, box-select, double-click same type, Ctrl+click toggle, control groups.
 */

import Phaser from 'phaser';
import { Unit } from '@/entities/Unit';
import { EntityManager } from './EntityManager';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { screenToWorld } from '@/utils/IsometricUtils';
import { rectsOverlap, distanceSq } from '@/utils/MathUtils';
import type { PlayerId, EntityId } from '@/utils/Types';

const DRAG_THRESHOLD = 16; // px^2 before considering it a box-select
const DOUBLE_CLICK_TIME = 300; // ms
const DOUBLE_PRESS_TIME = 300; // ms
const SELECTION_RADIUS = 20; // world pixels for click-to-select

export class SelectionSystem {
  private scene: Phaser.Scene;
  private entityManager: EntityManager;
  private localPlayerId: PlayerId;

  // Selection state
  private _selectedUnits: Set<EntityId> = new Set();
  private controlGroups: Map<number, Set<EntityId>> = new Map();

  // Input tracking
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private selectionBox: Phaser.GameObjects.Rectangle | null = null;

  // Double-click detection
  private lastClickTime = 0;
  private lastClickedUnitType: string | null = null;

  // Control group double-press
  private lastGroupKeyTime: Map<number, number> = new Map();

  // Selection circle graphics
  private selectionCircles: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, entityManager: EntityManager, localPlayerId: PlayerId) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.localPlayerId = localPlayerId;

    this.selectionCircles = scene.add.graphics();
    this.selectionCircles.setDepth(9998);

    this.setupInput();
  }

  private setupInput(): void {
    // Mouse down — start potential box select
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.isDragging = false;
      }
    });

    // Mouse move — box select drag
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;

      if (dx * dx + dy * dy > DRAG_THRESHOLD) {
        this.isDragging = true;
        this.updateSelectionBox(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
      }
    });

    // Mouse up — complete selection
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased()) {
        const ctrl = pointer.event.ctrlKey || pointer.event.metaKey;

        if (this.isDragging) {
          this.boxSelect(this.dragStartX, this.dragStartY, pointer.x, pointer.y, ctrl);
          this.clearSelectionBox();
        } else {
          this.clickSelect(pointer.x, pointer.y, ctrl);
        }
        this.isDragging = false;
      }
    });

    // Control groups
    const keyboard = this.scene.input.keyboard!;
    for (let i = 1; i <= 9; i++) {
      const key = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[`${i}` as keyof typeof Phaser.Input.Keyboard.KeyCodes] as number);
      const groupNum = i;
      key.on('down', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
          this.assignControlGroup(groupNum);
        } else {
          this.recallControlGroup(groupNum);
        }
      });
    }
  }

  private clickSelect(screenX: number, screenY: number, addToSelection: boolean): void {
    const cam = this.scene.cameras.main;
    const world = screenToWorld(screenX, screenY, cam.scrollX, cam.scrollY, cam.zoom);

    // Find closest unit to click
    let closestUnit: Unit | null = null;
    let closestDist = SELECTION_RADIUS * SELECTION_RADIUS;

    for (const unit of this.entityManager.getAllUnits()) {
      if (unit.ownerId !== this.localPlayerId || !unit.alive) continue;
      const d = distanceSq(world.x, world.y, unit.worldX, unit.worldY);
      if (d < closestDist) {
        closestDist = d;
        closestUnit = unit;
      }
    }

    const now = Date.now();

    if (closestUnit) {
      // Double-click: select all same-type on screen
      if (now - this.lastClickTime < DOUBLE_CLICK_TIME && this.lastClickedUnitType === closestUnit.unitType) {
        this.selectAllOfType(closestUnit.unitType);
        this.lastClickedUnitType = null;
        return;
      }

      this.lastClickTime = now;
      this.lastClickedUnitType = closestUnit.unitType;

      if (addToSelection) {
        this.toggleSelection(closestUnit.id);
      } else {
        this.clearSelection();
        this.addToSelection(closestUnit.id);
      }
    } else {
      if (!addToSelection) {
        this.clearSelection();
      }
      this.lastClickedUnitType = null;
    }
  }

  private boxSelect(x1: number, y1: number, x2: number, y2: number, addToSelection: boolean): void {
    const cam = this.scene.cameras.main;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    // Convert box corners to world space
    const topLeft = screenToWorld(minX, minY, cam.scrollX, cam.scrollY, cam.zoom);
    const bottomRight = screenToWorld(maxX, maxY, cam.scrollX, cam.scrollY, cam.zoom);

    const boxW = bottomRight.x - topLeft.x;
    const boxH = bottomRight.y - topLeft.y;

    if (!addToSelection) {
      this.clearSelection();
    }

    for (const unit of this.entityManager.getAllUnits()) {
      if (unit.ownerId !== this.localPlayerId || !unit.alive) continue;

      if (rectsOverlap(
        unit.worldX - 10, unit.worldY - 10, 20, 20,
        topLeft.x, topLeft.y, boxW, boxH
      )) {
        this.addToSelection(unit.id);
      }
    }
  }

  private selectAllOfType(unitType: string): void {
    this.clearSelection();
    const cam = this.scene.cameras.main;
    const viewLeft = cam.scrollX;
    const viewTop = cam.scrollY;
    const viewRight = viewLeft + cam.width / cam.zoom;
    const viewBottom = viewTop + cam.height / cam.zoom;

    for (const unit of this.entityManager.getAllUnits()) {
      if (unit.ownerId !== this.localPlayerId || !unit.alive) continue;
      if (unit.unitType !== unitType) continue;
      if (unit.worldX >= viewLeft && unit.worldX <= viewRight &&
          unit.worldY >= viewTop && unit.worldY <= viewBottom) {
        this.addToSelection(unit.id);
      }
    }
  }

  addToSelection(id: EntityId): void {
    const unit = this.entityManager.getUnit(id);
    if (!unit) return;
    this._selectedUnits.add(id);
    unit.selected = true;
    gameEvents.emit(GameEvents.UNIT_SELECTED, { id });
  }

  removeFromSelection(id: EntityId): void {
    const unit = this.entityManager.getUnit(id);
    if (unit) unit.selected = false;
    this._selectedUnits.delete(id);
    gameEvents.emit(GameEvents.UNIT_DESELECTED, { id });
  }

  private toggleSelection(id: EntityId): void {
    if (this._selectedUnits.has(id)) {
      this.removeFromSelection(id);
    } else {
      this.addToSelection(id);
    }
  }

  clearSelection(): void {
    for (const id of this._selectedUnits) {
      const unit = this.entityManager.getUnit(id);
      if (unit) unit.selected = false;
    }
    this._selectedUnits.clear();
  }

  // --- Control Groups ---

  private assignControlGroup(group: number): void {
    this.controlGroups.set(group, new Set(this._selectedUnits));
  }

  private recallControlGroup(group: number): void {
    const now = Date.now();
    const lastPress = this.lastGroupKeyTime.get(group) ?? 0;

    const units = this.controlGroups.get(group);
    if (!units || units.size === 0) return;

    if (now - lastPress < DOUBLE_PRESS_TIME) {
      // Double-press: center camera on group
      this.centerCameraOnGroup(units);
    } else {
      // Single press: select group
      this.clearSelection();
      for (const id of units) {
        if (this.entityManager.getUnit(id)?.alive) {
          this.addToSelection(id);
        }
      }
    }

    this.lastGroupKeyTime.set(group, now);
  }

  private centerCameraOnGroup(unitIds: Set<EntityId>): void {
    let totalX = 0;
    let totalY = 0;
    let count = 0;

    for (const id of unitIds) {
      const unit = this.entityManager.getUnit(id);
      if (unit?.alive) {
        totalX += unit.worldX;
        totalY += unit.worldY;
        count++;
      }
    }

    if (count > 0) {
      const cam = this.scene.cameras.main;
      cam.centerOn(totalX / count, totalY / count);
    }
  }

  // --- Selection Box Visual ---

  private updateSelectionBox(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.selectionBox) {
      this.selectionBox = this.scene.add.rectangle(0, 0, 0, 0, 0x2563EB, 0.15)
        .setStrokeStyle(1, 0x60A5FA, 0.8)
        .setScrollFactor(0)
        .setDepth(9999)
        .setOrigin(0, 0);
    }
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    this.selectionBox.setPosition(minX, minY);
    this.selectionBox.setSize(Math.abs(x2 - x1), Math.abs(y2 - y1));
    this.selectionBox.setVisible(true);
  }

  private clearSelectionBox(): void {
    this.selectionBox?.setVisible(false);
  }

  // --- Render selection circles ---

  updateRender(): void {
    this.selectionCircles.clear();

    for (const id of this._selectedUnits) {
      const unit = this.entityManager.getUnit(id);
      if (!unit?.alive || !unit.sprite) continue;

      // Green selection circle
      this.selectionCircles.lineStyle(2, 0x00FF00, 0.8);
      this.selectionCircles.strokeEllipse(unit.sprite.x, unit.sprite.y + 4, 28, 14);

      // HP bar
      const barWidth = 24;
      const barX = unit.sprite.x - barWidth / 2;
      const barY = unit.sprite.y - 20;
      const hpPercent = unit.getHpPercent();
      const hpColor = hpPercent > 0.5 ? 0x00FF00 : hpPercent > 0.25 ? 0xFFFF00 : 0xFF0000;

      this.selectionCircles.fillStyle(0x000000, 0.6);
      this.selectionCircles.fillRect(barX, barY, barWidth, 3);
      this.selectionCircles.fillStyle(hpColor, 0.9);
      this.selectionCircles.fillRect(barX, barY, barWidth * hpPercent, 3);
    }
  }

  get selectedUnits(): ReadonlySet<EntityId> {
    return this._selectedUnits;
  }

  get selectedUnitList(): Unit[] {
    const result: Unit[] = [];
    for (const id of this._selectedUnits) {
      const unit = this.entityManager.getUnit(id);
      if (unit?.alive) result.push(unit);
    }
    return result;
  }

  get selectedCount(): number {
    return this._selectedUnits.size;
  }
}
