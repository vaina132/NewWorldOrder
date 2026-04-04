# Studio Planning Review: Command & Conquer: New Order
**Date:** April 4, 2026  
**Participants:** Creative Director, Technical Director, Producer, Game Designer, Lead Programmer, QA Lead, Security Engineer, UX Designer

---

## CREATIVE DIRECTOR

### Vision Alignment
The brief delivers a coherent creative vision rooted in RA2 nostalgia. The two factions are well-differentiated mechanically -- AC's late-game precision versus IP's early-game swarm creates genuine strategic tension. However, **factions lack personality beyond stat blocks**. RA2 succeeded because characters had voices and personality. Currently AC and IP are spreadsheets, not characters.

**Recommendation:** Write a one-paragraph "faction fantasy statement" for each -- who are these people, what do they believe, how do they talk?

### Tone & Theme
The Cold War alternate-history framing works, but mapping real nations (Israel with Iron Dome, Iran with Underground Bunkers) risks reading as political commentary rather than playful fiction.

**Recommendation:** Lean hard into alternate-history. Establish "the timeline split in 1962" for creative cover.

### Player Fantasy Gap
AC's superweapon (Marine Force Drop) feels tactically modest next to a nuclear missile. The spectacle gap is a problem -- AC needs a moment that feels equally dramatic.

**Recommendation:** Add visual/audio event -- orbital camera, dramatic music sting, parachute sequence -- to make the Marine Drop feel like an *event*.

### Art Direction Risks
- Players form first impressions during geometric phase; "programmer art" RTS games struggle to attract testers
- "Zero code changes" asset swap will realistically need 2-3 days per pack for wrangling
- No animation frame counts defined beyond "4-frame explosion"

**Recommendation:** Define minimum animation specs early (idle: 1, move: 4, attack: 3, death: 4). Commission one vertical-slice tileset early.

### Audio is Dangerously Thin
Section 6.8 lists SFX categories and "royalty-free music" with no direction on mood, tempo, or adaptive behavior.

**Critical Missing Elements:**
- EVA/advisor voice callouts ("Building," "Unit ready," "Our base is under attack") -- completely absent
- Adaptive audio layers (exploration vs base-building vs combat intensity)
- Faction-specific musical identity (industrial-electronic for IP, orchestral-tactical for AC)
- Ambient environmental audio (wind, distant explosions, radio chatter)

### Competitive Identity
Web-based RTS games are rare and good ones almost nonexistent. The real differentiator is **zero install, instant play, browser tab** -- "30 seconds from URL to gameplay." The nation sub-faction system is the "main character" feature for marketing.

### Top 3 Creative Risks
1. **Identity crisis** -- too close to RA2 = clone, too far = loses nostalgia hook. Keep mechanical DNA, build original lore.
2. **Geometric art phase killing momentum** -- invest in one polished "screenshot-ready" map early.
3. **Audio as afterthought** -- add placeholder SFX and faction-appropriate music by Phase 2.

### Priority for "Feel"
1. Selection + movement juice (Phase 2) with click sounds and unit acknowledgment barks
2. Harvester loop with audio (Phase 3) -- the rhythm of C&C
3. One polished skirmish map with chokepoints and expansion locations
4. EVA/advisor voice system -- even with placeholder TTS

---

## TECHNICAL DIRECTOR

### Architecture Review
System decomposition is solid. Two critical gaps:

1. **Missing EventBus/MessageBus.** Systems need decoupled communication from day one. Without it: circular imports and spaghetti coupling.
2. **CommandSystem is underspecified.** Must serve as the single command entry point for future multiplayer. Define the `Command` interface now -- every player action must be a serializable command object from day one.

### Phaser Version Recommendation
**Start with Phaser 3.90 stable.** Phaser 4 RC means API surface may shift, isometric tilemap bugs are underreported, community examples are scarce. The brief states APIs are identical -- upgrading later costs nothing.

### Missing Performance Items
- **Spatial partitioning (grid or quadtree)** for CombatSystem "find enemies in range" queries -- without it, O(n^2) per unit
- **Web Worker for pathfinding** -- A* on main thread causes frame hitches
- **Audio sprite batching** -- limit concurrent sounds per type (max 4 rifle sounds)
- **GC pressure monitoring** -- closures and array allocations in hot loops

### Isometric Challenges
- Multi-tile building depth sorting: must use southern-most tile's Y, not center
- Mouse picking needs footprint-aware hit testing for multi-tile buildings
- Fog overlay must pixel-perfectly align with isometric grid across all zoom levels

### Fixed Timestep
20Hz logic + 60FPS render is correct. **Critical addition:** Entity base class must store `previousPosition` and `currentPosition` for render interpolation from Phase 1.

### Multiplayer-Ready Architecture
**Every game-state mutation must flow through commands from Phase 1.** If Phase 1-6 code directly mutates entity state, the multiplayer refactor becomes a rewrite.

Additional concerns:
- Shared config via symlink is fragile on Windows -- use TypeScript path aliases
- Colyseus schemas require decorated classes -- plan adapter layers early

### Top 5 Technical Risks
1. **Multiplayer retrofit pain** (project-threatening) -- commands must be sole state-mutation path from Phase 1
2. **Phaser 4 RC instability** (high) -- start with v3.90
3. **Pathfinding frame spikes** (high) -- needs Web Workers
4. **Isometric depth sorting at scale** (medium-high) -- edge cases compound
5. **Memory leaks from event listeners** (medium) -- cleanup discipline required

### Phase 1 MUST-HAVES
- [ ] Command interface defined (all state changes via serializable `GameCommand`)
- [ ] EventBus implemented
- [ ] Entity base class includes interpolation state (`prevX, prevY, currX, currY`)
- [ ] IsometricUtils tested exhaustively at all zoom levels
- [ ] Fixed timestep with accumulator (not naive `setInterval`)
- [ ] Spatial hash grid data structure (even if empty in P1)
- [ ] Asset pipeline automated (`tools/generate-sprites.ts`)
- [ ] TypeScript strict mode + no-any lint rule

---

## PRODUCER

### Roadmap Issues
- Minimap appears in both Phase 3 (3.10) and Phase 4 (4.8) -- build once in P3, extend in P4
- Fog of War data structure should be designed in P3 even if rendering waits for P4
- Nation unique units (B-2, Mossad Agent, Overlord, etc.) should be in Phase 5, not deferred to Phase 8

### Duration Reality Check

| Phase | Brief Estimate | Realistic Estimate |
|-------|---------------|-------------------|
| P1: Scaffold | 1 week | 1-1.5 weeks |
| P2: Selection/Movement | 1 week | 1.5-2 weeks |
| P3: Economy/Base | 2 weeks | **3-4 weeks** |
| P4: Combat | 2 weeks | 2-3 weeks |
| P5: Factions | 2 weeks | **3-4 weeks** |
| P6: AI/Skirmish | 2 weeks | 2-3 weeks |
| P7: Multiplayer | 4 weeks | **6-8 weeks** |
| P8: Polish | Ongoing | Ongoing |
| **Total** | **~14 weeks** | **20-28 weeks** |

### Critical Path to Playable Demo (~8-10 weeks)
P1 (1.1-1.6) -> P2 (2.1-2.6) -> P3 (3.1-3.6, 3.8, stripped-down 3.10) -> P4 (4.1-4.3) -> Minimal P6 (6.1-6.3, 6.7)

### Phase 3 Sprint Breakdown (Highest Risk Phase)

**Sprint 3A (Week 1): Data + Economy Core**
- Config data files, resource system, harvester entity, player state + credits

**Sprint 3B (Week 2): Building + Power**
- Power system, CY + build queue, placement validation, refinery + free harvester

**Sprint 3C (Week 3): Production + UI**
- Unit production, right sidebar UI (minimap, build panel, resource display, status bar)

### MVP Strategy (Target: Week 8)
**Include:** 1 map, 2 factions (shared units only), 3 unit types per side, 3 building types, basic combat, scripted AI, win/lose, minimal sidebar

**Defer:** Nation uniques, superweapons, fog of war, veterancy, flow fields, control groups, audio, menu polish, multiplayer, art upgrade

### Top 5 Production Risks
1. **Isometric rendering bugs** (HIGH/HIGH) -- budget extra time in P1
2. **Phase 3 scope explosion** (HIGH/HIGH) -- split into 3 sprints
3. **Phaser 4 instability** (MEDIUM/HIGH) -- use v3.90 fallback
4. **Performance at scale** (MEDIUM/HIGH) -- enforce budget from P1
5. **Motivation/burnout** (MEDIUM/CRITICAL) -- get combat working by week 5-6

### Milestones
- **M1 (end P1):** "Golden Map" -- 60 FPS isometric map + camera
- **M2 (end P2):** "Toy Soldiers" -- units select/move with pathfinding
- **M3 (mid P3):** "Economy Loop" -- harvester gathers ore, credits go up
- **M4 (end P3):** "Base Builder" -- full build queue + sidebar
- **M5 (end P4):** "First Blood" -- combat + explosions + fog (FUN GATE)
- **M6 (end P6):** "Skirmish Release" -- public demo candidate

### Go/No-Go Criteria
| Phase | Criteria |
|-------|---------|
| P1->P2 | 60 FPS on 48x48 iso map. Camera smooth. Click detection within 1 tile. |
| P2->P3 | A* <2ms for 48x48. 20 units at 60 FPS. Selection box works. |
| P3->P4 | Full harvest-refine-spend loop. 5+ structures. No credit desync. |
| P4->P5 | Damage table correct. 50 units at 60 FPS. Fog without flicker. |
| P5->P6 | Both tech trees buildable. No crashes. 3+ nation uniques working. |
| P6->P7 | Full skirmish start-to-finish. All 4 difficulties. No softlocks. |

---

## GAME DESIGNER

### Balance Concerns (Priority Order)

**1. AC Has No Tier 1 Anti-Air**
A fast MiG rush ($1000) ends the game before AC can build IFVs ($800, requires War Factory).
**Fix:** Add a $500 "Stinger Soldier" to AC Barracks, or make Patriot Missile Tier 1.

**2. Apocalypse Tank is Overtuned**
$1750 for 800 HP + dual weapons. Only costs 2x a Heavy Tank but has 2x HP + missile launcher. With Heavy armor, infantry barely scratch it.
**Fix:** Raise cost to $2000 or reduce HP to 700.

**3. Marine Force Drop vs Nuclear Missile**
The AC superweapon doesn't match IP's game-ending potential. 8 Elite Marines can be killed by any base defense.
**Fix:** Increase to 12 Marines or give C4 charges that one-shot production buildings.

**4. Iran's Underground Bunker Has No Counterplay**
Units completely invulnerable, immune to superweapons, undetectable by satellite. 10 Apocalypse Tanks hidden in a bunker is a game-winning ambush.
**Fix:** Allow Engineer capture, or let satellite scans detect it.

**5. Conscript Spam vs Riflemen is Too Lopsided**
Five Conscripts ($500) beat two Riflemen ($400) in raw combat. AC infantry lose every cost-equal fight before deploy mode matters.
**Fix:** Increase Rifleman HP to 150 or give undeployed Riflemen a slight DPS edge.

### Additional Design Notes
- **Economy bonuses aren't timing-equivalent:** IP's Industrial Foundry pays off at Tier 2; AC's Ore Purifier ($2500, -200 power, Tier 3) won't recoup until deep late-game
- **Veterancy scales kill thresholds should vary by cost:** Conscripts will never reach 7 kills. Cheap units (<$300) should need 2/5 instead of 3/7
- **Missile damage type is too flat** (75%-125%): make V3 Launcher anti-structure (75% vs Heavy, 150% vs Buildings)
- **Win condition "destroy all buildings" is too binary:** Add surrender button, auto-defeat if no CY + no credits for 2 min, optional Domination mode
- **Tech tree lacks branching:** Add soft branch at Tier 2 (Air Force Command vs War Factory compete for build queue time)

---

## LEAD PROGRAMMER

### System Communication
Use a typed `EventBus` (pub/sub) for cross-system events + direct references only for hot-path queries. `GameScene` owns `SystemManager`, calling `update(tick)` in deterministic order:
`InputSystem > CommandSystem > ProductionSystem > BuildSystem > ResourceSystem > PowerSystem > CombatSystem > VeterancySystem > FogSystem > AISystem`

Rendering systems run in Phaser's render loop, NOT the fixed-tick loop.

### Entity Architecture
Keep inheritance shallow (max 2 levels). Use **composition for behaviors**: `WeaponComponent`, `StealthComponent`, `DeployComponent`, `GarrisonComponent` attached optionally. Use discriminated unions for entity types.

### State Machines Needed
- **Harvester:** IDLE/MOVE_TO_ORE/HARVESTING/RETURNING/UNLOADING
- **Combat Units:** IDLE/MOVING/ATTACKING/GUARDING/PATROLLING
- **Buildings:** PLACING/CONSTRUCTING/ACTIVE/SELLING/DESTROYED
- **Aircraft:** IDLE/FLYING_TO_TARGET/ATTACKING/RETURNING/RELOADING
- **Superweapons:** CHARGING/READY/FIRING/COOLDOWN

Generic `StateMachine<S, E>` utility in `src/utils/StateMachine.ts`.

### Config Architecture
- `as const` assertions + `satisfies` for compile-time safety
- Runtime `registerFaction()` pattern for 4+ faction extensibility
- `DamageTable.ts` as `Record<DamageType, Record<ArmorType, number>>`
- Never hardcode faction IDs in system logic

### Multiplayer-Ready from Day 1
- All player actions through `CommandSystem.ts` as serializable commands
- Deterministic fixed timestep at 20Hz (matches planned server tick)
- Separation of simulation from rendering (game state without Phaser references)
- `PlayerState` as isolated per-player object, not global singletons

### Code Patterns
- Branded types for EntityId, PlayerId, TileCoord
- Discriminated unions for commands, FSM states, entity types
- `as const` + `satisfies` for config data
- Barrel exports per directory
- No classes for pure data -- interfaces/types for configs

### Phase 1 Implementation Order
1. Project Init (Vite + TS + Phaser)
2. Scene Structure (Boot/Menu/Game/GameOver)
3. **Isometric Grid Utilities** (needed by everything spatial)
4. Sprite Generator (atlas needed for rendering)
5. Isometric Tilemap (using atlas + iso utils)
6. Camera System (WASD/edge/zoom + sidebar offset)
7. Fixed Timestep (integrated into GameScene)
8. Performance Overlay + ViewportCuller

---

## QA LEAD

### Test Strategy
- **Vitest** for unit/integration tests (pure logic: DamageTable, A*, PowerSystem, IsometricUtils)
- **Playwright** for E2E browser tests with screenshot comparison
- Stress test scene: 300 sprites + 50 projectiles + 10 pathfinding calls/tick

### Top 5 Critical Test Areas
1. Pathfinding (edge cases, coordinate transforms, group movement, tick budget)
2. Combat + Damage Matrix (5x5 types x veterancy x special mechanics)
3. Economy Loop (harvester FSM, ore regen, credit accounting, refund-on-cancel)
4. Fog of War (visibility affects targeting, minimap, AI, stealth)
5. Build System + Tech Tree (placement, prerequisites, power dependency)

### Regression Risk Phases
- **Phase 5** (highest): adding unique unit mechanics stresses every P2-P4 system
- **Phase 7**: extracting logic to server exposes hidden client-state assumptions

---

## SECURITY ENGINEER

### Key Findings
- Single-player is inherently unprotectable in browsers -- focus on multiplayer security
- **Critical gap:** Brief doesn't mention sending only visible entity data per player -- currently all state is broadcast, enabling maphacks
- `CommandValidator.ts` must be the most heavily tested server module
- Need: command rate limiting, fog-of-war scoped state broadcasts, server-side placement validation
- Do NOT attempt client-side anti-cheat -- trivially bypassed in browsers
- Pin exact dependency versions, enable `npm audit` in CI

---

## UX DESIGNER

### Input Conflicts to Intercept
- Ctrl+W (close tab), Ctrl+1-9 (Chrome tab switch = control group conflict), F5 (refresh), right-click context menu
- Use `event.preventDefault()` on game canvas for all keyboard events during gameplay

### Sidebar Scaling
220px sidebar works at 1920px but consumes too much at 1366px -- scale proportionally or collapse to icons. Set minimum resolution at 1280x720.

### Accessibility Requirements
- **Colorblind modes essential:** Red (#DC2626) vs Blue (#2563EB) indistinguishable for protanopia
- Alternative palettes: blue/orange, blue/yellow
- Shape indicators on selection circles (square for IP, circle for AC)
- UI scale slider (80%-150%)
- Tab cycling through buildings/units + arrow key alternatives
- ARIA labels on all menu screens

### Onboarding
Guided tutorial mission (not text wall): camera -> select/move -> harvest/build -> produce/attack -> build panel tabs. Use EVA voice prompts as contextual cues.

---

## CROSS-DEPARTMENT CONSENSUS

### Unanimous Agreements
1. **Start with Phaser 3.90 stable**, not 4 RC
2. **Command pattern from Phase 1** -- all state changes via serializable commands
3. **EventBus required from Phase 1** -- decoupled system communication
4. **Phase 3 needs to be split** into 3 sprints (economy, building, UI)
5. **EVA/advisor voices are essential** -- not optional polish
6. **AC needs Tier 1 anti-air** -- balance-breaking gap
7. **Audio is critically underspecified** -- needs attention before Phase 6

### Recommended Action Items Before Phase 1
1. Write faction fantasy statements and 2-paragraph world backstory
2. Define animation frame spec per entity type
3. Design Command interface and EventBus API
4. Create colorblind-safe alternative palette
5. Lock Phaser version at 3.90 stable
6. Set up Vitest + basic CI

---

*Studio Planning Review Complete -- April 4, 2026*
