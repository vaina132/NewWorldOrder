import Phaser from 'phaser';

/**
 * GameOverScene — Shows victory/defeat and game stats.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { victory: boolean; stats?: Record<string, number> }): void {
    const { width, height } = this.cameras.main;
    const victory = data?.victory ?? false;

    // Result text
    this.add.text(width / 2, height * 0.3, victory ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: victory ? '#4ADE80' : '#DC2626',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats (placeholder for Phase 6)
    if (data?.stats) {
      let y = height * 0.45;
      for (const [key, value] of Object.entries(data.stats)) {
        this.add.text(width / 2, y, `${key}: ${value}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#9CA3AF',
        }).setOrigin(0.5);
        y += 25;
      }
    }

    // Buttons
    const btnStyle = {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#1E40AF',
      padding: { x: 30, y: 12 },
    };

    const playAgainBtn = this.add.text(width / 2, height * 0.75, 'PLAY AGAIN', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(width / 2, height * 0.85, 'MAIN MENU', {
      ...btnStyle,
      backgroundColor: '#374151',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playAgainBtn.on('pointerdown', () => this.scene.start('GameScene'));
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    [playAgainBtn, menuBtn].forEach(btn => {
      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
    });
  }
}
