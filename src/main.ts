import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';

/**
 * Command & Conquer: New Order
 * Web-based RTS — Phaser 3.90 + TypeScript + Vite
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    keyboard: true,
    mouse: true,
  },
  // Disable right-click context menu on game canvas
  callbacks: {
    postBoot: (game) => {
      game.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    },
  },
};

new Phaser.Game(config);
