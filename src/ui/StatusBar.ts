/**
 * StatusBar — Bottom bar showing selected unit(s) info and command buttons.
 */

import Phaser from 'phaser';
import { SIDEBAR_WIDTH } from '@/config/GameConfig';
import type { SelectionSystem } from '@/systems/SelectionSystem';

const BAR_HEIGHT = 40;

export class StatusBar {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle;
  private infoText: Phaser.GameObjects.Text;
  private selectionSystem: SelectionSystem;

  constructor(scene: Phaser.Scene, selectionSystem: SelectionSystem) {
    this.scene = scene;
    this.selectionSystem = selectionSystem;

    const { width, height } = scene.scale;

    this.bg = scene.add.rectangle(0, height - BAR_HEIGHT, width - SIDEBAR_WIDTH, BAR_HEIGHT, 0x1a1a2e, 0.9)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.infoText = scene.add.text(10, height - BAR_HEIGHT + 10, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#CCCCCC',
    }).setScrollFactor(0).setDepth(10001);

    // Command buttons
    const btnStyle = {
      fontFamily: 'monospace', fontSize: '11px', color: '#FFFFFF',
      backgroundColor: '#374151', padding: { x: 8, y: 4 },
    };

    const commands = [
      { label: '[S]top', x: width - SIDEBAR_WIDTH - 280 },
      { label: '[G]uard', x: width - SIDEBAR_WIDTH - 210 },
      { label: '[D]eploy', x: width - SIDEBAR_WIDTH - 140 },
    ];

    commands.forEach(cmd => {
      scene.add.text(cmd.x, height - BAR_HEIGHT + 10, cmd.label, btnStyle)
        .setScrollFactor(0).setDepth(10001);
    });

    scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.bg.setPosition(0, gameSize.height - BAR_HEIGHT);
      this.bg.setSize(gameSize.width - SIDEBAR_WIDTH, BAR_HEIGHT);
      this.infoText.setPosition(10, gameSize.height - BAR_HEIGHT + 10);
    });
  }

  update(): void {
    const units = this.selectionSystem.selectedUnitList;
    if (units.length === 0) {
      this.infoText.setText('');
      return;
    }

    if (units.length === 1) {
      const u = units[0]!;
      const hpBar = `[${'█'.repeat(Math.round(u.getHpPercent() * 10))}${'░'.repeat(10 - Math.round(u.getHpPercent() * 10))}]`;
      this.infoText.setText(`${u.unitType.toUpperCase()} | HP: ${u.hp}/${u.maxHp} ${hpBar} | ${u.fsm.getState().toUpperCase()}`);
    } else {
      const types = new Map<string, number>();
      for (const u of units) {
        types.set(u.unitType, (types.get(u.unitType) ?? 0) + 1);
      }
      const summary = [...types.entries()].map(([t, c]) => `${c}x ${t}`).join(', ');
      this.infoText.setText(`${units.length} units selected: ${summary}`);
    }
  }
}
