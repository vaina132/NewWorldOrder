import Phaser from 'phaser';

/**
 * MenuScene — Main menu with title, buttons for Skirmish/Settings/Credits.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, height * 0.25, 'COMMAND & CONQUER', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#60A5FA',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.25 + 45, 'NEW ORDER', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#F59E0B',
    }).setOrigin(0.5);

    // Buttons
    const buttonStyle = {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#1E40AF',
      padding: { x: 30, y: 12 },
    };

    const skirmishBtn = this.add.text(width / 2, height * 0.55, 'SKIRMISH', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const settingsBtn = this.add.text(width / 2, height * 0.65, 'SETTINGS', {
      ...buttonStyle,
      backgroundColor: '#374151',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Hover effects
    [skirmishBtn, settingsBtn].forEach(btn => {
      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
    });

    // Actions
    skirmishBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Version
    this.add.text(width / 2, height * 0.9, 'v0.1.0 — Phase 1: Engine Core', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#6B7280',
    }).setOrigin(0.5);
  }
}
