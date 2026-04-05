/**
 * SkirmishSetup — Pick faction, AI difficulty, and start the game.
 */

import Phaser from 'phaser';
import type { FactionId } from '@/utils/Types';
import type { AIDifficulty } from '@/config/AIConfig';

export interface SkirmishConfig {
  playerFaction: FactionId;
  aiFaction: FactionId;
  aiDifficulty: AIDifficulty;
}

export class SkirmishSetup extends Phaser.Scene {
  private selectedPlayerFaction: FactionId = 'ac';
  private selectedAiFaction: FactionId = 'ip';
  private selectedDifficulty: AIDifficulty = 'medium';

  constructor() {
    super({ key: 'SkirmishSetup' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, 40, 'SKIRMISH SETUP', {
      fontFamily: 'monospace', fontSize: '28px', color: '#60A5FA', fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Your Faction ---
    this.add.text(width / 2, 100, 'YOUR FACTION', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9CA3AF',
    }).setOrigin(0.5);

    const acBtn = this.createButton(width / 2 - 120, 130, 'ATLANTIC COALITION', '#2563EB', true);
    const ipBtn = this.createButton(width / 2 + 120, 130, 'IRON PACT', '#991B1B', false);

    acBtn.on('pointerdown', () => {
      this.selectedPlayerFaction = 'ac';
      this.selectedAiFaction = 'ip';
      acBtn.setBackgroundColor('#2563EB');
      ipBtn.setBackgroundColor('#374151');
    });
    ipBtn.on('pointerdown', () => {
      this.selectedPlayerFaction = 'ip';
      this.selectedAiFaction = 'ac';
      ipBtn.setBackgroundColor('#DC2626');
      acBtn.setBackgroundColor('#374151');
    });

    // --- AI Difficulty ---
    this.add.text(width / 2, 200, 'AI DIFFICULTY', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9CA3AF',
    }).setOrigin(0.5);

    const difficulties: { id: AIDifficulty; label: string; color: string }[] = [
      { id: 'easy', label: 'EASY', color: '#22C55E' },
      { id: 'medium', label: 'MEDIUM', color: '#F59E0B' },
      { id: 'hard', label: 'HARD', color: '#EF4444' },
      { id: 'brutal', label: 'BRUTAL', color: '#7C3AED' },
    ];

    const diffBtns: Phaser.GameObjects.Text[] = [];
    difficulties.forEach((d, i) => {
      const x = width / 2 + (i - 1.5) * 110;
      const btn = this.createButton(x, 230, d.label, d.id === 'medium' ? d.color : '#374151', d.id === 'medium');
      btn.on('pointerdown', () => {
        this.selectedDifficulty = d.id;
        diffBtns.forEach((b, j) => {
          b.setBackgroundColor(j === i ? difficulties[j]!.color : '#374151');
        });
      });
      diffBtns.push(btn);
    });

    // --- Start Button ---
    const startBtn = this.add.text(width / 2, height - 100, 'START GAME', {
      fontFamily: 'monospace', fontSize: '22px', color: '#FFFFFF',
      backgroundColor: '#16A34A', padding: { x: 40, y: 16 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setAlpha(0.8));
    startBtn.on('pointerout', () => startBtn.setAlpha(1));
    startBtn.on('pointerdown', () => {
      const config: SkirmishConfig = {
        playerFaction: this.selectedPlayerFaction,
        aiFaction: this.selectedAiFaction,
        aiDifficulty: this.selectedDifficulty,
      };
      this.scene.start('GameScene', config);
    });

    // Back button
    const backBtn = this.add.text(20, 20, '← BACK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9CA3AF',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createButton(x: number, y: number, label: string, bgColor: string, selected: boolean): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '13px', color: '#FFFFFF',
      backgroundColor: selected ? bgColor : '#374151',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
    return btn;
  }
}
