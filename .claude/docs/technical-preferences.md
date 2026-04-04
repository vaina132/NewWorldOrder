# Technical Preferences

<!-- Project: Command & Conquer: New Order -->
<!-- Web-based RTS inspired by Red Alert 2 -->

## Engine & Language

- **Engine**: Phaser 4 (v4.0.0 RC7+ or latest stable; fallback: Phaser v3.90.0)
- **Language**: TypeScript (strict mode)
- **Rendering**: WebGL via Phaser 4 "Beam" renderer (HTML5/WebGL)
- **Physics**: Custom isometric tile-based (no physics engine — RTS uses grid logic)
- **Bundler**: Vite
- **Multiplayer**: Colyseus + WebSocket (Phase 7)
- **Platform**: Web browser (HTML5/WebGL)

## Naming Conventions

- **Classes**: PascalCase (`HeavyTank`, `ResourceSystem`, `GameScene`)
- **Variables**: camelCase (`playerCredits`, `unitHealth`)
- **Signals/Events**: camelCase with past-tense (`unitDestroyed`, `buildingPlaced`)
- **Files**: PascalCase matching class name (`GameScene.ts`, `ResourceSystem.ts`)
- **Scenes/Prefabs**: PascalCase (`BootScene`, `MenuScene`, `GameScene`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_UNITS`, `TILE_WIDTH`)
- **Config keys**: camelCase in TypeScript objects
- **Sprite naming**: `{faction}_{entity}_{state}_{direction}` (e.g., `ac_rifleman_idle_ne`)

## Performance Budgets

- **Target Framerate**: 60 FPS
- **Frame Budget**: 16.6ms
- **Draw Calls**: <50 (target), red line at >200
- **Memory Ceiling**: <200 MB (target), red line at >500 MB
- **Active Sprites**: <300 (target), red line at >800
- **Pathfinding**: <10 calls/tick (target), red line at >50
- **Game Logic Tick Rate**: 20 ticks/sec (fixed timestep)
- **Render Rate**: 60 FPS with interpolation

## 8 Anti-Lag Rules (MANDATORY)

1. Single texture atlas per faction (1 GPU draw call)
2. Viewport culling (hide entities outside camera)
3. Object pooling (pre-allocate projectiles, explosions, damage numbers)
4. Tile-based fog of war (2D array, low-res overlay, only changed cells redraw)
5. Fixed timestep (20 ticks/sec logic, 60 FPS rendering with interpolation)
6. Isometric depth via Y-position (use `setDepth(worldY)`)
7. Isometric tile culling (only render visible tiles)
8. Isometric click detection via math (not pixel-perfect)

## Isometric Grid

- **Tile dimensions**: 64×32 px (2:1 diamond ratio)
- **Map perspective**: Isometric diamond grid (RA2-style, fixed ~30° camera)
- **UI layout**: Right sidebar (RA2-style: minimap + build panel on right)
- **Coordinate transforms**: All tile ops via `IsometricUtils.ts`

## Testing

- **Framework**: Vitest (Vite-native)
- **Minimum Coverage**: Balance formulas 100%, gameplay systems 80%
- **Required Tests**: Balance formulas, gameplay systems, networking (Phase 7+)

## Forbidden Patterns

- Direct DOM manipulation (use Phaser API only)
- Pixel-perfect click detection on isometric tiles (use math transforms)
- Bottom-bar UI layout (RA2 uses right sidebar)
- More than 1 draw call per faction atlas
- Synchronous asset loading in game loop
- `any` type in TypeScript (use strict typing)
- Physics engine for RTS logic (use tile/grid-based calculations)

## Allowed Libraries / Addons

- `phaser` (v4 RC or v3.90 stable)
- `vite` (bundler)
- `typescript` (language)
- `vitest` (testing)
- `colyseus` + `@colyseus/schema` (Phase 7 — multiplayer)
- No other dependencies without explicit approval

## Architecture Decisions Log

- ADR-001: Phaser 4 + TypeScript + Vite over Unity/Godot (web-native, Claude Code compatible, same-language client+server)
- ADR-002: Isometric diamond grid with 64×32 tiles (RA2-style authenticity)
- ADR-003: Right sidebar UI layout (RA2-style, not bottom bar)
- ADR-004: Canvas-generated sprites initially, zero-code upgrade path to purchased assets
- ADR-005: Fixed timestep 20Hz logic + 60 FPS render with interpolation
- ADR-006: Command-based networking for multiplayer (client sends commands, server validates)
