import Phaser from 'phaser';
import { FixedTimestep } from '@/utils/FixedTimestep';
import { gameEvents, GameEvents } from '@/utils/EventBus';
import { IsometricTilemap } from '@/rendering/IsometricTilemap';
import { CameraController } from '@/systems/CameraSystem';
import { EntityManager } from '@/systems/EntityManager';
import { SelectionSystem } from '@/systems/SelectionSystem';
import { CommandSystem } from '@/systems/CommandSystem';
import { PlayerState } from '@/systems/PlayerState';
import { ResourceSystem } from '@/systems/ResourceSystem';
import { PowerSystem } from '@/systems/PowerSystem';
import { BuildSystem } from '@/systems/BuildSystem';
import { ProductionSystem } from '@/systems/ProductionSystem';
import { CombatSystem } from '@/systems/CombatSystem';
import { VeterancySystem } from '@/systems/VeterancySystem';
import { FogSystem } from '@/systems/FogSystem';
import { NavGrid } from '@/pathfinding/NavGrid';
import { ProjectileRenderer } from '@/rendering/ProjectileRenderer';
import { FogRenderer } from '@/rendering/FogRenderer';
import { PerformanceOverlay } from '@/ui/PerformanceOverlay';
import { TileHighlight } from '@/ui/TileHighlight';
import { Sidebar } from '@/ui/Sidebar';
import { StatusBar } from '@/ui/StatusBar';
import { MAP_WIDTH, MAP_HEIGHT, TICK_INTERVAL } from '@/config/GameConfig';
import { playerId } from '@/utils/Types';
import { screenToTile } from '@/utils/IsometricUtils';
import { Harvester } from '@/entities/Harvester';
import type { PlayerId } from '@/utils/Types';

// Import faction configs (registers them)
import '@/config/factions/atlantic-coalition';
import '@/config/factions/iron-pact';
import { getFaction } from '@/config/FactionRegistry';

/**
 * GameScene — Main gameplay scene.
 * Full Phase 3: economy loop, base building, unit production, sidebar UI.
 */
export class GameScene extends Phaser.Scene {
  private fixedTimestep!: FixedTimestep;
  private tilemap!: IsometricTilemap;
  private cameraController!: CameraController;
  private entityManager!: EntityManager;
  private selectionSystem!: SelectionSystem;
  private commandSystem!: CommandSystem;
  private navGrid!: NavGrid;
  private playerStates!: Map<PlayerId, PlayerState>;
  private resourceSystem!: ResourceSystem;
  private powerSystem!: PowerSystem;
  private buildSystem!: BuildSystem;
  private productionSystem!: ProductionSystem;
  private combatSystem!: CombatSystem;
  private veterancySystem!: VeterancySystem;
  private fogSystem!: FogSystem;
  private projectileRenderer!: ProjectileRenderer;
  private fogRenderer!: FogRenderer;
  private perfOverlay!: PerformanceOverlay;
  private tileHighlight!: TileHighlight;
  private sidebar!: Sidebar;
  private statusBar!: StatusBar;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.fixedTimestep = new FixedTimestep();

    // Players
    const player1 = playerId(1);
    const player2 = playerId(2);

    // Player states
    this.playerStates = new Map();
    this.playerStates.set(player1, new PlayerState(player1, 'ac', 10000));
    this.playerStates.set(player2, new PlayerState(player2, 'ip', 10000));

    // Generate terrain with ore fields
    const terrain = this.generateTerrain(MAP_WIDTH, MAP_HEIGHT);

    // Tilemap
    this.tilemap = new IsometricTilemap(this, terrain, MAP_WIDTH, MAP_HEIGHT);
    this.tilemap.render();

    // Nav grid
    this.navGrid = new NavGrid(MAP_WIDTH, MAP_HEIGHT);
    this.navGrid.initFromTerrain(terrain);

    // Resource system
    this.resourceSystem = new ResourceSystem();
    this.resourceSystem.initFromTerrain(terrain, MAP_WIDTH, MAP_HEIGHT);

    // Entity manager
    this.entityManager = new EntityManager(this);

    // Power system
    this.powerSystem = new PowerSystem(this.entityManager, this.playerStates);

    // Build system
    this.buildSystem = new BuildSystem(this.entityManager, this.navGrid, this.resourceSystem, this.playerStates);

    // Production system
    this.productionSystem = new ProductionSystem(this.entityManager, this.playerStates);

    // Camera
    this.cameraController = new CameraController(this, this.tilemap);

    // Selection system
    this.selectionSystem = new SelectionSystem(this, this.entityManager, player1);

    // Command system
    this.commandSystem = new CommandSystem(this, this.entityManager, this.selectionSystem, this.navGrid, player1);

    // Combat system
    this.combatSystem = new CombatSystem(this.entityManager, this.playerStates);
    this.combatSystem.setNavGrid(this.navGrid);

    // Projectile renderer
    this.projectileRenderer = new ProjectileRenderer(this);
    this.combatSystem.setProjectileSpawner((fx, fy, tx, ty, c) => this.projectileRenderer.spawn(fx, fy, tx, ty, c));

    // Veterancy system
    this.veterancySystem = new VeterancySystem(this.entityManager);

    // Fog of war
    this.fogSystem = new FogSystem(player1, this.entityManager);
    this.fogRenderer = new FogRenderer(this, this.fogSystem);

    // Spawn starting bases
    this.spawnStartingBase(player1, 'ac', 8, 8);
    this.spawnStartingBase(player2, 'ip', 35, 35);

    // Update power after spawning buildings
    this.powerSystem.update();

    // UI
    this.sidebar = new Sidebar(this, this.playerStates.get(player1)!, this.buildSystem, this.productionSystem, this.entityManager, this.tilemap);
    this.statusBar = new StatusBar(this, this.selectionSystem);
    this.tileHighlight = new TileHighlight(this);
    this.perfOverlay = new PerformanceOverlay(this);

    // Building placement: left-click during placement mode
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const placement = this.buildSystem.getPlacementMode();
      if (placement && pointer.leftButtonDown()) {
        const cam = this.cameras.main;
        const tile = screenToTile(pointer.x, pointer.y, cam.scrollX, cam.scrollY, cam.zoom);
        const building = this.buildSystem.placeBuilding(placement.playerId, tile.tileX, tile.tileY);
        if (building) {
          this.buildSystem.exitPlacementMode();
          this.powerSystem.update();
        }
      }
    });

    // When build completes, auto-enter placement mode
    gameEvents.on(GameEvents.PRODUCTION_COMPLETED, (data: { playerId?: PlayerId; buildingType?: string }) => {
      if (data.playerId === player1 && data.buildingType) {
        this.buildSystem.enterPlacementMode(player1);
      }
    });

    // ESC to cancel placement or return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.buildSystem.getPlacementMode()) {
        this.buildSystem.exitPlacementMode();
      } else {
        gameEvents.clear();
        this.scene.start('MenuScene');
      }
    });
  }

  update(_time: number, delta: number): void {
    const ticks = this.fixedTimestep.update(delta);
    const tickDt = TICK_INTERVAL / 1000;

    for (let i = 0; i < ticks; i++) {
      this.fixedTick(tickDt);
    }

    // Render-rate updates
    const alpha = this.fixedTimestep.getAlpha();
    this.cameraController.update(delta);
    this.entityManager.updateRender(alpha);
    this.selectionSystem.updateRender();
    this.projectileRenderer.update(delta);
    this.fogRenderer.update();
    this.tileHighlight.update();
    this.sidebar.update();
    this.statusBar.update();
    this.perfOverlay.update(delta, ticks, this.fixedTimestep.getTick());
  }

  private fixedTick(dt: number): void {
    const tick = this.fixedTimestep.getTick();
    gameEvents.emit(GameEvents.TICK, { tick });

    // Update all systems in deterministic order
    this.entityManager.updateTick(dt);
    this.resourceSystem.update(dt);
    this.buildSystem.update(dt);
    this.productionSystem.update(dt);
    this.combatSystem.update(dt);
    this.veterancySystem.update(dt);
    this.fogSystem.update();
  }

  private spawnStartingBase(pid: PlayerId, factionId: 'ac' | 'ip', baseX: number, baseY: number): void {
    const faction = getFaction(factionId);

    // Construction Yard
    const cyConfig = faction.buildings['construction_yard']!;
    this.entityManager.spawnBuilding(pid, factionId, baseX, baseY, cyConfig);
    this.navGrid.blockFootprint(baseX, baseY, cyConfig.footprintW, cyConfig.footprintH);

    // Power Plant
    const ppConfig = faction.buildings[factionId === 'ac' ? 'power_plant' : 'tesla_reactor']!;
    this.entityManager.spawnBuilding(pid, factionId, baseX + 4, baseY, ppConfig);
    this.navGrid.blockFootprint(baseX + 4, baseY, ppConfig.footprintW, ppConfig.footprintH);

    // Ore Refinery
    const refConfig = faction.buildings['ore_refinery']!;
    this.entityManager.spawnBuilding(pid, factionId, baseX, baseY + 4, refConfig);
    this.navGrid.blockFootprint(baseX, baseY + 4, refConfig.footprintW, refConfig.footprintH);

    // Barracks
    const barConfig = faction.buildings['barracks']!;
    this.entityManager.spawnBuilding(pid, factionId, baseX + 4, baseY + 3, barConfig);
    this.navGrid.blockFootprint(baseX + 4, baseY + 3, barConfig.footprintW, barConfig.footprintH);

    // Spawn starting harvester
    const harvesterType = factionId === 'ac' ? 'chrono_harvester' : 'war_harvester';
    const harvConfig = faction.units[harvesterType]!;
    const harvester = this.entityManager.spawnUnit(pid, factionId, baseX + 3, baseY + 7, harvConfig);

    // Bind harvester to systems
    if (harvester instanceof Harvester || harvester.unitType === harvesterType) {
      // For now, regular units act as harvesters through the Harvester class
      // The actual Harvester class will be used when spawned through the refinery
    }

    // Spawn 3 starting infantry
    const infantryType = factionId === 'ac' ? 'rifleman' : 'conscript';
    const infConfig = faction.units[infantryType]!;
    for (let i = 0; i < 3; i++) {
      this.entityManager.spawnUnit(pid, factionId, baseX + 6 + i, baseY + 5, infConfig);
    }
  }

  private generateTerrain(width: number, height: number): number[][] {
    const terrain: number[][] = [];
    for (let y = 0; y < height; y++) {
      terrain[y] = [];
      for (let x = 0; x < width; x++) {
        const noise = Math.random();
        if (noise < 0.02) {
          terrain[y]![x] = 2; // water
        } else if (noise < 0.08) {
          terrain[y]![x] = 1; // desert
        } else if (noise < 0.11) {
          terrain[y]![x] = 3; // road
        } else {
          terrain[y]![x] = 0; // grass
        }
      }
    }

    // Place ore clusters near each base and in center
    const oreClusters = [
      { cx: 14, cy: 14, radius: 4 },  // Near player 1 base
      { cx: 30, cy: 30, radius: 4 },  // Near player 2 base
      { cx: 24, cy: 24, radius: 5 },  // Center
      { cx: 10, cy: 35, radius: 3 },  // Corner
      { cx: 38, cy: 10, radius: 3 },  // Corner
    ];

    for (const cluster of oreClusters) {
      for (let dy = -cluster.radius; dy <= cluster.radius; dy++) {
        for (let dx = -cluster.radius; dx <= cluster.radius; dx++) {
          if (dx * dx + dy * dy > cluster.radius * cluster.radius) continue;
          const tx = cluster.cx + dx;
          const ty = cluster.cy + dy;
          if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
            if (Math.random() < 0.6) {
              terrain[ty]![tx] = 4; // ore
            }
          }
        }
      }
    }

    return terrain;
  }
}
