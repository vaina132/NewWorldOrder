import Phaser from 'phaser';
import { FixedTimestep } from '@/utils/FixedTimestep';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { IsometricTilemap } from '@/rendering/IsometricTilemap';
import { CameraController } from '@/systems/CameraSystem';
import { EntityManager } from '@/systems/EntityManager';
import { SelectionSystem } from '@/systems/SelectionSystem';
import { CommandSystem } from '@/systems/CommandSystem';
import { NavGrid } from '@/pathfinding/NavGrid';
import { PerformanceOverlay } from '@/ui/PerformanceOverlay';
import { TileHighlight } from '@/ui/TileHighlight';
import { MAP_WIDTH, MAP_HEIGHT, TICK_INTERVAL } from '@/config/GameConfig';
import { playerId } from '@/utils/Types';
import type { UnitConfig } from '@/entities/Unit';

// Test unit configs
const RIFLEMAN_CONFIG: UnitConfig = {
  unitType: 'rifleman',
  category: 'infantry',
  maxHp: 125,
  speed: 4,
  armor: 'none',
  damageType: 'bullet',
  dps: 15,
  range: 5,
  cost: 200,
  buildTime: 5,
  spriteKey: 'ac_rifleman_idle_s',
  sightRange: 7,
};

const CONSCRIPT_CONFIG: UnitConfig = {
  unitType: 'conscript',
  category: 'infantry',
  maxHp: 75,
  speed: 4,
  armor: 'none',
  damageType: 'bullet',
  dps: 10,
  range: 4,
  cost: 100,
  buildTime: 3,
  spriteKey: 'ip_conscript_idle_s',
  sightRange: 6,
};

const LIGHT_TANK_CONFIG: UnitConfig = {
  unitType: 'light_tank',
  category: 'vehicle',
  maxHp: 300,
  speed: 6,
  armor: 'medium',
  damageType: 'antiArmor',
  dps: 25,
  range: 5,
  cost: 700,
  buildTime: 8,
  spriteKey: 'ac_light_tank_idle_s',
  sightRange: 8,
};

const HEAVY_TANK_CONFIG: UnitConfig = {
  unitType: 'heavy_tank',
  category: 'heavyVehicle',
  maxHp: 500,
  speed: 4,
  armor: 'heavy',
  damageType: 'explosive',
  dps: 30,
  range: 5.5,
  cost: 900,
  buildTime: 10,
  spriteKey: 'ip_heavy_tank_idle_s',
  sightRange: 7,
};

/**
 * GameScene — Main gameplay scene.
 * Manages the fixed timestep loop, systems, and rendering.
 */
export class GameScene extends Phaser.Scene {
  private fixedTimestep!: FixedTimestep;
  private tilemap!: IsometricTilemap;
  private cameraController!: CameraController;
  private entityManager!: EntityManager;
  private selectionSystem!: SelectionSystem;
  private commandSystem!: CommandSystem;
  private navGrid!: NavGrid;
  private perfOverlay!: PerformanceOverlay;
  private tileHighlight!: TileHighlight;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.fixedTimestep = new FixedTimestep();

    // Generate terrain
    const terrain = this.generateTerrain(MAP_WIDTH, MAP_HEIGHT);

    // Isometric tilemap
    this.tilemap = new IsometricTilemap(this, terrain, MAP_WIDTH, MAP_HEIGHT);
    this.tilemap.render();

    // Navigation grid
    this.navGrid = new NavGrid(MAP_WIDTH, MAP_HEIGHT);
    this.navGrid.initFromTerrain(terrain);

    // Camera
    this.cameraController = new CameraController(this, this.tilemap);

    // Entity manager
    this.entityManager = new EntityManager(this);

    // Player IDs
    const player1 = playerId(1);
    const player2 = playerId(2);

    // Selection system (player 1 is local)
    this.selectionSystem = new SelectionSystem(this, this.entityManager, player1);

    // Command system
    this.commandSystem = new CommandSystem(this, this.entityManager, this.selectionSystem, this.navGrid, player1);

    // Tile highlight (cursor)
    this.tileHighlight = new TileHighlight(this);

    // Performance overlay
    this.perfOverlay = new PerformanceOverlay(this);

    // Spawn test units — 5 blue riflemen + 2 blue tanks
    for (let i = 0; i < 5; i++) {
      this.entityManager.spawnUnit(player1, 'ac', 10 + i, 10, RIFLEMAN_CONFIG);
    }
    this.entityManager.spawnUnit(player1, 'ac', 12, 12, LIGHT_TANK_CONFIG);
    this.entityManager.spawnUnit(player1, 'ac', 13, 12, LIGHT_TANK_CONFIG);

    // Spawn test enemy units — 5 red conscripts + 2 red tanks
    for (let i = 0; i < 5; i++) {
      this.entityManager.spawnUnit(player2, 'ip', 30 + i, 30, CONSCRIPT_CONFIG);
    }
    this.entityManager.spawnUnit(player2, 'ip', 32, 32, HEAVY_TANK_CONFIG);
    this.entityManager.spawnUnit(player2, 'ip', 33, 32, HEAVY_TANK_CONFIG);

    // ESC to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      gameEvents.clear();
      this.scene.start('MenuScene');
    });
  }

  update(_time: number, delta: number): void {
    // Fixed timestep logic ticks
    const ticks = this.fixedTimestep.update(delta);
    const tickDt = TICK_INTERVAL / 1000; // seconds per tick

    for (let i = 0; i < ticks; i++) {
      this.fixedTick(tickDt);
    }

    // Render-rate updates
    const alpha = this.fixedTimestep.getAlpha();
    this.cameraController.update(delta);
    this.entityManager.updateRender(alpha);
    this.selectionSystem.updateRender();
    this.tileHighlight.update();
    this.perfOverlay.update(delta, ticks, this.fixedTimestep.getTick());
  }

  private fixedTick(dt: number): void {
    const tick = this.fixedTimestep.getTick();
    gameEvents.emit(GameEvents.TICK, { tick });
    this.entityManager.updateTick(dt);
  }

  private generateTerrain(width: number, height: number): number[][] {
    // Seeded random for consistent maps
    const terrain: number[][] = [];
    for (let y = 0; y < height; y++) {
      terrain[y] = [];
      for (let x = 0; x < width; x++) {
        const noise = Math.random();
        if (noise < 0.03) {
          terrain[y]![x] = 2; // water
        } else if (noise < 0.12) {
          terrain[y]![x] = 1; // desert
        } else if (noise < 0.16) {
          terrain[y]![x] = 3; // road
        } else {
          terrain[y]![x] = 0; // grass
        }
      }
    }
    return terrain;
  }
}
