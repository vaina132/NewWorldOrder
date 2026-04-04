/**
 * BuildPanel — 3-column grid of building/unit thumbnails in the sidebar.
 * Tabs: Structures | Infantry | Vehicles | Defences
 */

import Phaser from 'phaser';
import { getFaction } from '@/config/FactionRegistry';
import type { PlayerState } from '@/systems/PlayerState';
import type { BuildSystem } from '@/systems/BuildSystem';
import type { ProductionSystem } from '@/systems/ProductionSystem';

type BuildTab = 'structures' | 'infantry' | 'vehicles' | 'defences';

const TABS: { id: BuildTab; label: string }[] = [
  { id: 'structures', label: 'STR' },
  { id: 'infantry', label: 'INF' },
  { id: 'vehicles', label: 'VEH' },
  { id: 'defences', label: 'DEF' },
];

const STRUCTURE_TYPES = ['power_plant', 'ore_refinery', 'barracks', 'war_factory', 'air_force_command', 'battle_lab', 'ore_purifier'];
const DEFENCE_TYPES = ['pillbox', 'sentry_gun', 'prism_tower', 'tesla_coil', 'patriot_missile', 'flak_cannon', 'wall'];

const COLS = 3;
const THUMB_SIZE = 60;
const THUMB_GAP = 4;

export class BuildPanel {
  private scene: Phaser.Scene;
  private playerState: PlayerState;
  private buildSystem: BuildSystem;
  private productionSystem: ProductionSystem;
  private x: number;
  private y: number;

  private activeTab: BuildTab = 'structures';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private thumbnails: Phaser.GameObjects.Container;
  private progressOverlay: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    playerState: PlayerState,
    buildSystem: BuildSystem,
    productionSystem: ProductionSystem,
  ) {
    this.scene = scene;
    this.playerState = playerState;
    this.buildSystem = buildSystem;
    this.productionSystem = productionSystem;
    this.x = x;
    this.y = y;

    // Tab buttons
    const tabWidth = Math.floor(width / TABS.length);
    TABS.forEach((tab, i) => {
      const btn = scene.add.text(x + i * tabWidth, y, tab.label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#FFFFFF',
        backgroundColor: i === 0 ? '#2563EB' : '#374151',
        padding: { x: 6, y: 4 },
        fixedWidth: tabWidth - 2,
        align: 'center',
      })
        .setScrollFactor(0)
        .setDepth(10002)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.activeTab = tab.id;
        this.tabButtons.forEach((b, j) => {
          b.setBackgroundColor(j === i ? '#2563EB' : '#374151');
        });
        this.rebuildThumbnails();
      });

      this.tabButtons.push(btn);
    });

    // Thumbnail container
    this.thumbnails = scene.add.container(0, 0).setScrollFactor(0).setDepth(10002);
    this.progressOverlay = scene.add.graphics().setScrollFactor(0).setDepth(10003);

    this.rebuildThumbnails();
  }

  private rebuildThumbnails(): void {
    this.thumbnails.removeAll(true);

    const faction = getFaction(this.playerState.factionId);
    let items: { key: string; label: string; cost: number; type: 'building' | 'unit' }[] = [];

    switch (this.activeTab) {
      case 'structures':
        items = STRUCTURE_TYPES
          .filter(k => faction.buildings[k])
          .map(k => ({
            key: k, label: k.replace(/_/g, ' ').toUpperCase(),
            cost: faction.buildings[k]!.cost, type: 'building',
          }));
        break;
      case 'infantry':
        items = Object.entries(faction.units)
          .filter(([, u]) => u.category === 'infantry')
          .map(([k, u]) => ({
            key: k, label: k.replace(/_/g, ' ').toUpperCase(),
            cost: u.cost, type: 'unit',
          }));
        break;
      case 'vehicles':
        items = Object.entries(faction.units)
          .filter(([, u]) => u.category === 'vehicle' || u.category === 'heavyVehicle')
          .map(([k, u]) => ({
            key: k, label: k.replace(/_/g, ' ').toUpperCase(),
            cost: u.cost, type: 'unit',
          }));
        break;
      case 'defences':
        items = DEFENCE_TYPES
          .filter(k => faction.buildings[k])
          .map(k => ({
            key: k, label: k.replace(/_/g, ' ').toUpperCase(),
            cost: faction.buildings[k]!.cost, type: 'building',
          }));
        break;
    }

    const startY = this.y + 25;

    items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const tx = this.x + col * (THUMB_SIZE + THUMB_GAP);
      const ty = startY + row * (THUMB_SIZE + THUMB_GAP);

      const canAfford = this.playerState.canAfford(item.cost);
      const bgColor = canAfford ? 0x1E40AF : 0x7F1D1D;

      // Thumbnail background
      const bg = this.scene.add.rectangle(tx, ty, THUMB_SIZE, THUMB_SIZE, bgColor, 0.8)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      bg.on('pointerdown', () => {
        if (item.type === 'building') {
          this.buildSystem.startBuild(this.playerState.playerId, item.key);
        }
      });

      bg.on('pointerover', () => bg.setAlpha(0.7));
      bg.on('pointerout', () => bg.setAlpha(1));

      // Label
      const label = this.scene.add.text(tx + THUMB_SIZE / 2, ty + 8, item.label.substring(0, 8), {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#FFFFFF',
        align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0);

      // Cost
      const costText = this.scene.add.text(tx + THUMB_SIZE / 2, ty + THUMB_SIZE - 12, `₡${item.cost}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: canAfford ? '#FCD34D' : '#FF6666',
        align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0);

      this.thumbnails.add(bg);
      this.thumbnails.add(label);
      this.thumbnails.add(costText);
    });
  }

  update(): void {
    this.progressOverlay.clear();

    // Show build progress on sidebar
    const item = this.buildSystem.getBuildItem(this.playerState.playerId);
    if (item && !item.ready) {
      // Draw a small progress indicator at top of panel
      const barX = this.x;
      const barY = this.y + 20;
      const barW = COLS * (THUMB_SIZE + THUMB_GAP);

      this.progressOverlay.fillStyle(0x333333, 0.8);
      this.progressOverlay.fillRect(barX, barY, barW, 4);
      this.progressOverlay.fillStyle(0x00FF00, 0.9);
      this.progressOverlay.fillRect(barX, barY, barW * item.progress, 4);
    }

    if (item?.ready) {
      // Flash "READY" text effect
      const alpha = Math.abs(Math.sin(Date.now() / 200));
      this.progressOverlay.fillStyle(0x00FF00, alpha);
      this.progressOverlay.fillRect(this.x, this.y + 20, COLS * (THUMB_SIZE + THUMB_GAP), 4);
    }
  }
}
