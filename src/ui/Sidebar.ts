/**
 * RA2-style right sidebar — main container.
 * Contains: FactionLogo, Minimap, ResourceDisplay, BuildPanel.
 */

import Phaser from 'phaser';
import { SIDEBAR_WIDTH } from '@/config/GameConfig';
import { ResourceDisplay } from './ResourceDisplay';
import { BuildPanel } from './BuildPanel';
import { Minimap } from './Minimap';
import type { PlayerState } from '@/systems/PlayerState';
import type { BuildSystem } from '@/systems/BuildSystem';
import type { ProductionSystem } from '@/systems/ProductionSystem';
import type { EntityManager } from '@/systems/EntityManager';
import type { IsometricTilemap } from '@/rendering/IsometricTilemap';

export class Sidebar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;

  resourceDisplay: ResourceDisplay;
  buildPanel: BuildPanel;
  minimap: Minimap;

  constructor(
    scene: Phaser.Scene,
    playerState: PlayerState,
    buildSystem: BuildSystem,
    productionSystem: ProductionSystem,
    entityManager: EntityManager,
    tilemap: IsometricTilemap,
  ) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const sidebarX = width - SIDEBAR_WIDTH;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);

    // Background
    this.bg = scene.add.rectangle(sidebarX, 0, SIDEBAR_WIDTH, height, 0x1a1a2e, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9999);

    // Faction logo / title
    const title = scene.add.text(sidebarX + SIDEBAR_WIDTH / 2, 15, playerState.factionId === 'ac' ? 'ATLANTIC\nCOALITION' : 'IRON\nPACT', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: playerState.factionId === 'ac' ? '#60A5FA' : '#F87171',
      align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10001);
    this.container.add(title);

    // Minimap (below title)
    this.minimap = new Minimap(scene, sidebarX + 10, 50, SIDEBAR_WIDTH - 20, tilemap, entityManager);

    // Resource display (below minimap)
    this.resourceDisplay = new ResourceDisplay(scene, sidebarX + 10, 170, SIDEBAR_WIDTH - 20, playerState);

    // Build panel (below resources)
    this.buildPanel = new BuildPanel(scene, sidebarX + 5, 230, SIDEBAR_WIDTH - 10, height - 250, playerState, buildSystem, productionSystem);

    // Handle resize
    scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const newX = gameSize.width - SIDEBAR_WIDTH;
      this.bg.setPosition(newX, 0);
      this.bg.setSize(SIDEBAR_WIDTH, gameSize.height);
    });
  }

  update(): void {
    this.resourceDisplay.update();
    this.buildPanel.update();
    this.minimap.update();
  }
}
