# COMMAND & CONQUER: NEW ORDER
## Web-Based RTS — Game Design Brief v5.0 (FINAL)

**Inspired by:** Command & Conquer: Red Alert 2  
**Platform:** Web browser (HTML5 / WebGL)  
**Tech Stack:** TypeScript + Phaser 4 (or v3.90 stable fallback) + Vite  
**Development Tool:** Claude Code (CLI) in VS Code  
**Art Style:** Isometric 2.5D, minimalist geometric now → purchased pixel art later  
**Map Perspective:** Isometric diamond grid (RA2-style, fixed ~30° camera)  
**UI Layout:** Right sidebar (RA2-style: minimap + build panel on right)  
**Initial Scope:** 2 factions (expandable to 4+ with nations)  
**Future:** Online multiplayer via Colyseus + WebSocket (same TypeScript stack)

---

## 1. TECH STACK DECISION

### Why Phaser 4 + TypeScript + Claude Code (Not Unity / Godot)

| Requirement | Phaser 4 + TS | Unity | Godot |
|-------------|---------------|-------|-------|
| Web performance | Native browser, <1MB engine | WebGL export 10-50MB+, memory issues, GC pauses | HTML5 export OK, stability quirks |
| Claude Code compatibility | Excellent — 100% text files, TS is Claude's strongest language | Poor — binary scene files, YAML meta files | Moderate — GDScript is niche |
| Multiplayer architecture | Colyseus (TypeScript) = same language client + server | Netcode/Photon = different paradigm for web | ENet = awkward for web |
| FPS control | Full control, no engine overhead | Engine overhead you can't control | Less control than Phaser |
| Your existing skills | TypeScript (GrantLume stack) | C# (new) | GDScript (new) |

**Decision:** Phaser 4 (v4.0.0 RC7+ or latest stable) + TypeScript + Vite, developed with Claude Code. Multiplayer via Colyseus (TypeScript server) when ready.

**Phaser Version Note:** Phaser 4 features a brand-new "Beam" WebGL renderer with up to 16x mobile performance gains and major memory savings. The API is identical to Phaser 3 — no rewrite needed. If v4 stable is not yet released when development begins, start with Phaser v3.90.0 (latest stable) and upgrade to v4 seamlessly when available. Install: `npm install phaser@beta` for v4 RC, or `npm install phaser` for v3.90 stable.

---

## 2. ART DIRECTION: ISOMETRIC 2.5D (RA2-STYLE)

### Map Style: Isometric Diamond Grid

The game uses an **isometric (diamond) tile grid** matching the RA2 visual style:
- Camera angle: fixed ~30° bird's-eye isometric projection
- Terrain: desert sand, green grass, paved roads, water, cliffs, bridges
- Buildings: pre-rendered isometric sprites occupying multi-tile footprints
- Units: 8-directional isometric sprites (N, NE, E, SE, S, SW, W, NW)
- Ore fields: yellow/orange crystal clusters growing from terrain
- Environment: cacti, rocks, debris, civilian structures for atmosphere

### Isometric Tile Dimensions

Standard isometric diamond tile: Width 64px, Height 32px (2:1 ratio).
Map grid: tiles arranged in diamond pattern. Screen-to-iso and iso-to-screen coordinate transforms required.

### Current Phase: Clean Geometric Isometric Style
- Auto-generated isometric sprites via Canvas build script (`tools/generate-sprites.ts`)
- Buildings rendered as 3D box shapes on diamond tile bases
- Infantry as circles with weapon lines, Vehicles as isometric rectangles with turrets
- All sprites packed into single atlas per faction
- Distinct silhouettes per unit type, clear faction colours (blue vs red)

### Future Upgrade: Purchased Isometric Asset Packs
When ready, swap in professional sprites from:
- **CraftPix.net** — isometric military sets (PSD editable)
- **itch.io** — "4K Isometric RTS Building Pack" by Marcin ($5.99)
- **Unity Asset Store** — One2 "2D Building & GUI RTS 500+" pack
- **Custom Blender renders** — model in 3D, render from isometric camera → export as 2D sprites (how original RA2 art was made)

### Swap Process (Zero Code Changes)
1. Rename purchased sprites to match naming convention: `{faction}_{entity}_{state}_{direction}`
2. Pack into atlas → replace `game-atlas.png` + `game-atlas.json`
3. Done — AtlasManager maps logical names to frames

### Sprite Size Standards

| Entity | Tile Footprint | Sprite Size | Notes |
|--------|---------------|-------------|-------|
| Terrain tile | 1×1 | 64×32 px | Diamond isometric tile |
| Infantry | 1×1 | 32×40 px | Taller than tile (stands upright) |
| Vehicle | 1×1 | 48×32 px | Fits within diamond |
| Heavy vehicle | 2×1 | 64×40 px | Tanks, harvesters |
| Building (small) | 2×2 | 128×96 px | Barracks, power plant |
| Building (large) | 3×3 | 192×144 px | War factory, refinery |
| Aircraft | 1×1 | 40×40 px | Above ground with shadow |
| Projectile | — | 8×8 px | Small but visible |
| Explosion | — | 64×64 px | 4-frame animation |

### Colour Palette

| Element | Atlantic Coalition | Iron Pact | Neutral |
|---------|-------------------|-----------|---------|
| Primary | `#2563EB` | `#DC2626` | `#F59E0B` |
| Secondary | `#1E40AF` | `#991B1B` | `#D97706` |
| Accent | `#60A5FA` | `#F87171` | `#FCD34D` |

### Terrain Palette

| Tile | Colour |
|------|--------|
| Grass | `#4ADE80` base, `#22C55E` texture |
| Desert sand | `#FDE68A` base, `#F59E0B` grain |
| Water | `#3B82F6` base, `#60A5FA` wave lines |
| Road/concrete | `#9CA3AF` base, `#6B7280` cracks |
| Ore field | `#F97316` crystals on terrain |
| Gems | `#8B5CF6` crystals on terrain |
| Cliff edge | `#92400E` dark brown |

---

## 3. PERFORMANCE ARCHITECTURE (8 Anti-Lag Rules)

These are non-negotiable and must be implemented from Phase 1:

1. **Single Texture Atlas** — all sprites per faction in ONE PNG → 1 GPU draw call
2. **Viewport Culling** — `setVisible(false)` on entities outside camera + 1 tile margin
3. **Object Pooling** — pre-allocate projectiles, explosions, damage numbers. No `new` during gameplay
4. **Tile-Based Fog of War** — 2D int array, low-res overlay canvas, only changed cells redraw
5. **Fixed Timestep** — game logic at 20 ticks/sec, rendering at 60 FPS with interpolation
6. **Isometric Depth via Y-Position** — use Phaser's `setDepth(worldY)` per entity, only update when entity moves (NOT full re-sort every frame)
7. **Isometric Tile Culling** — only render tiles within camera frustum (~300 tiles visible out of 2304 total on 48×48 map)
8. **Isometric Click Detection via Math** — use coordinate transform formula, never pixel-perfect hit testing on sprites

### Performance Budget

| Metric | Target | Red Line |
|--------|--------|----------|
| Frame rate | 60 FPS | < 30 FPS |
| Draw calls / frame | < 50 | > 200 |
| Active sprites on screen | < 300 | > 800 |
| Pathfinding calls / tick | < 10 | > 50 |
| Memory | < 200 MB | > 500 MB |

---

## 4. FACTION & NATION DATA

---

### 4.1 ATLANTIC COALITION (AC) — Blue
**Playstyle:** Precise, tech-heavy, late-game power  
**Economy Bonus:** Ore Purifier building (+25% refinery yield)  
**Identity:** Quality over quantity. Surgical strikes, air superiority, advanced tech.

**Buildings:**

| Name | Tier | Cost | Power | Size |
|------|------|------|-------|------|
| Construction Yard | 0 | 3000 | 0 | 3×3 |
| Power Plant | 0 | 600 | +200 | 2×2 |
| Ore Refinery | 1 | 2000 | −50 | 3×3 |
| Barracks | 1 | 500 | −10 | 2×2 |
| War Factory | 2 | 2000 | −25 | 3×3 |
| Naval Yard | 2 | 1000 | −25 | 3×3 |
| Air Force Command | 2 | 1000 | −50 | 2×2 |
| Battle Lab | 3 | 2000 | −100 | 2×2 |
| Ore Purifier | 3 | 2500 | −200 | 2×2 |
| Pillbox | 1 | 400 | 0 | 1×1 |
| Prism Tower | 2 | 1500 | −75 | 1×1 |
| Patriot Missile | 2 | 1000 | −50 | 1×1 |
| Wall | 0 | 100 | 0 | 1×1 |

**Shared Units (all AC nations get these):**

| Name | Type | Cost | HP | Armor | Speed | Strong vs | Weak vs | Special |
|------|------|------|-----|-------|-------|-----------|---------|---------|
| Rifleman (GI) | Infantry | 200 | 125 | Light | 4 | Infantry | Tanks | **Deploy mode:** standing = rifle (anti-infantry), deployed = missile launcher (anti-vehicle). Cannot move while deployed. |
| Engineer | Infantry | 500 | 75 | None | 3 | — | Everything | Captures enemy/neutral buildings. Consumed on use. |
| Chrono Harvester | Vehicle | 1400 | 600 | Heavy | 4 | — | Tanks | Auto-harvests ore/gems, returns to refinery. |
| Light Tank | Vehicle | 700 | 300 | Medium | 7 | Vehicles | Heavy tanks | Fast, good for flanking and raiding. |
| IFV | Vehicle | 800 | 200 | Medium | 8 | Air, Light vehicles | Heavy tanks | Primary anti-air vehicle. Adaptive missile system. |
| Prism Tank | Vehicle | 1200 | 150 | Light | 5 | Buildings, groups | Tanks 1v1 | Beam weapon chains between nearby targets. |
| Raptor Fighter | Aircraft | 1200 | 150 | Light | 12 | Vehicles | Anti-air | Air-to-ground missiles. Fast strike aircraft. |
| Nighthawk | Aircraft | 1000 | 175 | Light | 8 | Infantry | Anti-air | Transport helicopter (carries 5 infantry). Armed with machine gun. Invisible on radar. |
| Transport Ship | Naval | 800 | 400 | Heavy | 5 | — | Combat ships | Unarmed. Carries up to 8 ground units across water. |
| Battle Cruiser | Naval | 2000 | 800 | Heavy | 4 | Buildings, Ships | Submarines, Aircraft | Heavy naval combat. Long-range cannons. |

**Superweapon — Marine Force Drop:**
Paradrops a squad of 8 Elite Marines at any revealed location on the map. Marines are powerful infantry with heavy assault rifles and C4 charges (anti-building). They arrive immediately by parachute. 5-minute cooldown. All players notified: "Marine strike force detected."

---

### AC Nations

#### USA 🇺🇸
**Passive:** None (balanced baseline nation)

**Unique Unit — B-2 Stealth Bomber:**
| Cost | HP | Armor | Speed | Strong vs | Special |
|------|-----|-------|-------|-----------|---------|
| 2000 | 200 | Light | 8 | Buildings, Vehicles | **Stealth:** Invisible on radar and minimap until attacking. Drops heavy bomb payload — devastating vs buildings. Slow but undetectable. One bomb run per sortie, must return to airfield to reload. |

**Unique Building — Satellite Uplink:**
| Cost | Power | Cooldown |
|------|-------|----------|
| 1500 | −100 | 3 min |
Reveals the **entire map** (removes fog of war) for 30 seconds. After 30 seconds, fog returns. Gives full intelligence on enemy base layout, army positions, and expansion plans.

---

#### Israel 🇮🇱
**Passive:** None

**Unique Unit — Mossad Agent (Spy):**
| Cost | HP | Armor | Speed | Special |
|------|-----|-------|-------|---------|
| 1200 | 75 | None | 4 | **Disguise:** Can mimic the appearance of any enemy unit type. Walks past enemy defences undetected. Enters enemy buildings to sabotage: Refinery = steals credits, Barracks = resets veterancy, Power Plant = shuts down power for 30 sec, Battle Lab = reveals tech tree. Killed instantly by attack dogs or if detected. |

**Unique Building — Iron Dome (Missile Defence System):**
| Cost | Power | Size |
|------|-------|------|
| 2000 | −150 | 2×2 |
Defensive structure with a large protection radius. **Automatically intercepts incoming rockets, missiles, and superweapon projectiles** in its area. Reduces damage from rocket/missile attacks by 75% within radius. Crucial counter to IP's V3 Launchers and Iran's Rocket Silo. Does NOT intercept bullets, shells, or beams — only airborne projectiles.

---

#### United Kingdom 🇬🇧
**Passive:** None

**Unique Unit — Harrier Fast Attack Jet:**
| Cost | HP | Armor | Speed | Strong vs | Special |
|------|-----|-------|-------|-----------|---------|
| 1000 | 125 | Light | 14 | Vehicles, Light buildings | **Hit-and-run:** Fastest aircraft in the game. Makes rapid strafing passes, fires rockets, then circles back. Weaker payload than B-2 but can make multiple passes per sortie. Excellent for harassing enemy harvesters and expansions. |

**Unique Building — SAS Training Facility:**
| Cost | Power |
|------|-------|
| 1200 | −75 |
All infantry produced by this player **start as Veterans** (+25% damage, +25% HP). Stacks with veterancy system — combat kills still upgrade them to Elite. Makes UK infantry the highest quality in the game.

---
---

### 4.2 IRON PACT (IP) — Red
**Playstyle:** Brute force, swarm, early aggression  
**Economy Bonus:** Industrial Foundry (War Factory produces 25% faster)  
**Identity:** Quantity is a quality all its own. Heavy armor, cheap infantry, overwhelming force.

**Buildings:**

| Name | Tier | Cost | Power | Size |
|------|------|------|-------|------|
| Construction Yard | 0 | 3000 | 0 | 3×3 |
| Tesla Reactor | 0 | 600 | +150 | 2×2 |
| Ore Refinery | 1 | 2000 | −50 | 3×3 |
| Barracks | 1 | 500 | −10 | 2×2 |
| War Factory | 2 | 2000 | −25 | 3×3 |
| Naval Yard | 2 | 1000 | −25 | 3×3 |
| Radar Tower | 2 | 1000 | −50 | 2×2 |
| Battle Lab | 3 | 2000 | −100 | 2×2 |
| Nuclear Reactor | 3 | 1000 | +1000 | 2×2 |
| Sentry Gun | 1 | 400 | 0 | 1×1 |
| Tesla Coil | 2 | 1500 | −75 | 1×1 |
| Flak Cannon | 2 | 900 | −50 | 1×1 |
| Wall | 0 | 100 | 0 | 1×1 |

**Note:** Nuclear Reactor provides massive power (+1000) but **explodes violently when destroyed**, dealing heavy damage to all nearby units and buildings. High risk, high reward.

**Shared Units (all IP nations get these):**

| Name | Type | Cost | HP | Armor | Speed | Strong vs | Weak vs | Special |
|------|------|------|-----|-------|-------|-----------|---------|---------|
| Conscript | Infantry | 100 | 75 | Light | 4 | Numbers | Anything 1v1 | Cheapest unit in the game. Strength is in mass production. |
| Flak Trooper | Infantry | 300 | 100 | Light | 4 | Aircraft, Infantry | Tanks | Primary anti-air infantry. Flak cannon damages air and ground. |
| RPG Trooper | Infantry | 300 | 100 | Light | 3 | Vehicles, Buildings | Infantry | Shoulder-fired rockets. Strong anti-armor but slow reload. |
| Engineer | Infantry | 500 | 75 | None | 3 | — | Everything | Captures enemy/neutral buildings. Consumed on use. |
| War Harvester | Vehicle | 1400 | 800 | Heavy | 3 | Light infantry | Tanks | Armored harvester with machine gun. Tougher than AC's harvester but slower. |
| Heavy Tank | Vehicle | 900 | 400 | Heavy | 5 | Vehicles, Buildings | Aircraft | Backbone of IP ground army. Dual cannon. |
| Apocalypse Tank | Vehicle | 1750 | 800 | Heavy | 3 | Everything ground | Aircraft, Swarms | Ultimate ground unit. Dual cannon + missile launcher. Crushes walls and light vehicles. |
| V3 Launcher | Vehicle | 800 | 150 | Light | 4 | Buildings, Groups | Fast units | Long-range rocket artillery. Rocket can be shot down by anti-air. Devastating if it lands. |
| MiG Fighter | Aircraft | 1000 | 150 | Light | 14 | Vehicles, Buildings | Anti-air | Fast attack jet. Fires missiles in strafing runs. Must return to airfield to reload. |
| Transport Ship | Naval | 800 | 400 | Heavy | 5 | — | Combat ships | Unarmed. Carries up to 8 ground units across water. |
| Battle Cruiser | Naval | 2000 | 800 | Heavy | 4 | Buildings, Ships | Submarines, Aircraft | Heavy naval combat. Missile barrage. |

**Superweapon — Nuclear Missile Silo:**
Launches a single nuclear missile at any location on the map. Massive explosion with extreme damage in a focused radius. Leaves a radiation zone that damages units passing through for 30 seconds. 7-minute cooldown. All players notified when silo is built: "Nuclear silo detected." Missile can be partially intercepted by Israel's Iron Dome (reduces damage by 75% in covered area, does NOT fully block).

---

### IP Nations

#### Russia 🇷🇺
**Passive:** None (balanced baseline nation)

**Unique Unit — Spetsnaz Operative:**
| Cost | HP | Armor | Speed | Special |
|------|-----|-------|-------|---------|
| 1500 | 125 | Light | 5 | **Stealth + Laser Designator:** Invisible when stationary. Can laser-mark a target area — after 3-second delay, 2 MiG jets are called in to bomb the marked position (free, no aircraft required). Can also plant C4 on buildings for instant destruction. Extremely powerful but fragile. Killed instantly if detected. |

**Unique Weapon — Tsar Bomba:**
| Cost | Cooldown |
|------|----------|
| 3500 | 8 min |
Requires: Nuclear Missile Silo + Battle Lab. Enhanced nuclear strike with **2× blast radius** of the standard nuke and a **60-second radiation zone** (vs 30 sec standard). The most destructive single attack in the game. Same interception rules as standard nuke.

---

#### China 🇨🇳
**Passive: Conscription Doctrine** — All infantry train **25% faster** at Barracks.

**Unique Unit — Overlord Tank:**
| Cost | HP | Armor | Speed | Strong vs | Special |
|------|-----|-------|-------|-----------|---------|
| 2000 | 900 | Heavy | 3 | Everything ground | **Upgradeable:** After production, player chooses ONE upgrade: (A) **Gatling Turret** — adds anti-infantry/anti-air machine gun on top, or (B) **Propaganda Speaker** — heals all friendly units within radius (2 HP/sec). Upgrade is permanent. Can crush vehicles and walls. |

**Unique Building — Propaganda Center:**
| Cost | Power | Size |
|------|-------|------|
| 1500 | −100 | 2×2 |
Aura effect: all friendly units within a large radius gain **+15% fire rate**. Encourages aggressive forward placement near the front line. Does not stack with multiple Propaganda Centers.

---

#### Iran 🇮🇷
**Passive:** None

**Unique Building — Underground Bunker:**
| Cost | Power | Size | Capacity |
|------|-------|------|----------|
| 1200 | −50 | 2×2 | 10 units |
A fortified underground shelter. Up to 10 ground units can garrison inside. While inside, units are **completely invisible and immune to all attacks** — including superweapons. Units can be ordered out at any time. If the bunker itself is destroyed (requires direct ground assault on the building), garrisoned units are killed. Cannot be detected by satellite scans. Perfect for ambushes and protecting key units.

**Unique Weapon — Rocket Silo:**
| Cost | Cooldown |
|------|----------|
| 2500 | 4 min |
Launches a barrage of **10 rockets** at a target area. Rockets spread across the zone, each dealing moderate damage. **Each rocket can be individually intercepted by anti-air defences** (Patriot Missiles, Flak Cannons, Israel's Iron Dome). Against an undefended base: devastating. Against a well-defended base: significantly reduced. This creates a strategic dynamic — players must invest in AA coverage or suffer. Shorter cooldown than Nuclear Silo, making it a persistent harassment tool.

---
---

### 4.3 Faction Asymmetry Summary

| Aspect | Atlantic Coalition | Iron Pact |
|--------|-------------------|-----------|
| Infantry cost | $200 Rifleman (versatile) | $100 Conscript (disposable) |
| Anti-vehicle infantry | Rifleman deploys with missile | RPG Trooper (dedicated) |
| Anti-air infantry | None (relies on IFV / Patriot) | Flak Trooper (cheap, accessible) |
| Tank philosophy | Fast Light Tank, tech Prism Tank | Heavy Tank + Apocalypse Tank |
| Air power | Raptor + Nighthawk stealth | MiG fast attack |
| Navy | Transport + Battle Cruiser | Transport + Battle Cruiser |
| Best phase | Late game | Early-mid game |
| Economy edge | +25% ore yield | +25% vehicle build speed |
| Superweapon | Marine paradrop (tactical) | Nuclear missile (destructive) |
| Weakness | Fragile early, no AA infantry | Weak air force, slow tech |
| Personality | Surgical, precise | Sledgehammer, relentless |

### 4.4 Nation Comparison At-a-Glance

| Faction | Nation | Unique Unit | Unique Building/Weapon | Passive |
|---------|--------|-------------|----------------------|---------|
| AC | USA 🇺🇸 | B-2 Stealth Bomber | Satellite Uplink (full map reveal) | — |
| AC | Israel 🇮🇱 | Mossad Agent (spy/disguise) | Iron Dome (missile interception) | — |
| AC | UK 🇬🇧 | Harrier Fast Attack Jet | SAS Training Facility (veteran infantry) | — |
| IP | Russia 🇷🇺 | Spetsnaz Operative (stealth + airstrike) | Tsar Bomba (enhanced nuke) | — |
| IP | China 🇨🇳 | Overlord Tank (upgradeable) | Propaganda Center (+15% fire rate aura) | Infantry train 25% faster |
| IP | Iran 🇮🇷 | — | Underground Bunker + Rocket Silo (barrage) | — |

### 4.5 Damage Matrix

| Damage → | None | Light | Medium | Heavy | Building |
|----------|------|-------|--------|-------|----------|
| Bullet | 100% | 75% | 50% | 25% | 10% |
| Anti-Armor | 50% | 75% | 100% | 125% | 75% |
| Explosive | 100% | 100% | 75% | 75% | 150% |
| Electric | 100% | 100% | 125% | 100% | 50% |
| Missile | 75% | 100% | 100% | 100% | 125% |

**Note:** Missile damage type added for V3 rockets, Iran's Rocket Silo, and naval missiles. Interceptable by anti-air.

### 4.6 Special Unit Mechanics

| Mechanic | Units | How It Works |
|----------|-------|-------------|
| **Deploy Mode** | AC Rifleman | Press D to deploy/undeploy. Deployed = stationary, gains anti-vehicle missile. Undeployed = mobile, rifle only. Takes 1 sec to deploy/undeploy. |
| **Stealth** | B-2 Bomber, Nighthawk, Spetsnaz | Invisible on minimap and to enemies until attacking or detected. Attack dogs and certain defences can detect stealth units in close range. |
| **Disguise** | Mossad Agent | Takes appearance of any enemy unit type. Maintains disguise while moving. Revealed when entering buildings, attacking, or detected by dogs. |
| **Laser Designate** | Spetsnaz Operative | Target ground area → 3 sec delay → free MiG airstrike arrives. Does not require owning any aircraft. |
| **Vehicle Crush** | Apocalypse Tank, Overlord Tank | Drives over enemy walls, light vehicles, and infantry, destroying them instantly. Cannot crush heavy vehicles. |
| **Upgradeable** | Overlord Tank | After production, choose Gatling Turret (anti-infantry/air) OR Propaganda Speaker (heals nearby). Permanent choice. |
| **Garrison** | Underground Bunker | Units enter building, become hidden + invulnerable. Exit on command. Building can be destroyed by ground attack. |
| **Interceptable** | V3 Rocket, Iran Rocket Silo, Nuclear Missile | Airborne projectiles can be shot down by anti-air defences. Iron Dome provides 75% damage reduction. |
| **Radiation Zone** | Nuclear Missile, Tsar Bomba | After detonation, ground area damages units (3 HP/sec) for 30-60 seconds. Infantry die quickly, vehicles take moderate damage. |

### 4.7 Expandable Architecture

```typescript
// Adding a new faction = new config file + registerFaction() call
registerFaction(ATLANTIC_COALITION);
registerFaction(IRON_PACT);
// Future: registerFaction(ECLIPSE_ORDER);
// Future: registerFaction(JADE_DOMINION);
```

Each nation adds unique unit(s) + unique building/weapon + optional passive bonus on top of faction roster. Implemented via `NationConfig` interface.

```typescript
interface NationConfig {
  id: string;
  name: string;
  flag: string;           // emoji or sprite reference
  factionId: string;
  passive?: PassiveBonus;  // e.g., China's faster infantry
  uniqueUnit?: UnitConfig;
  uniqueBuilding?: BuildingConfig;
  uniqueWeapon?: WeaponConfig;  // superweapon variant
}
```

---

## 5. CORE MECHANICS SUMMARY

- **Resources:** Ore (regenerates) + Gems (finite, 2× value) → Harvester → Refinery → Credits. Oil Derricks = passive income.
- **Power:** Full ≥100% normal | Low <50% halved + radar off | 0% defences off
- **Building:** C&C queue — 1 building/queue per Construction Yard, place within build radius
- **Production:** Queue per factory, multiple factories = speed bonus, rally points
- **Veterancy:** Rookie → Veteran (3 kills, +25%) → Elite (7 kills, +50%, self-heal)
- **Fog of War:** Black → Shroud → Visible
- **Tech Buildings:** Oil Derrick, Tech Airport, Tech Hospital, Tech Machine Shop, Observation Post
- **Deploy Mode:** AC Rifleman can deploy (stationary) to switch from rifle to missile launcher
- **Stealth:** B-2, Nighthawk, Spetsnaz are invisible until attacking. Dogs and close-range defences detect.
- **Disguise:** Mossad Agent mimics enemy unit appearance. Revealed by dogs or on action.
- **Missile Interception:** V3 rockets, Iran barrage, and nukes can be partially intercepted by anti-air. Iron Dome provides 75% reduction.
- **Radiation Zones:** Nuclear strikes leave ground damage zones (3 HP/sec) for 30-60 seconds.
- **Vehicle Crush:** Apocalypse/Overlord tanks crush infantry, walls, and light vehicles by driving over them.
- **Garrison:** Iran's Underground Bunker hides units completely. Immune to all damage until bunker is destroyed.

---

## 6. MULTIPLAYER ARCHITECTURE (Future — Phase 7+)

### Stack
- **Client:** Phaser 4 (TypeScript) — same codebase, same language
- **Server:** Colyseus (TypeScript) — authoritative game server
- **Transport:** WebSocket (native browser support, no plugins)
- **Hosting:** Hathora or self-hosted Node.js

### Architecture Pattern: Authoritative Server
- Client sends COMMANDS (move unit to X, build barracks, attack target)
- Server validates commands, runs game simulation, broadcasts STATE
- Client receives state updates, interpolates for smooth rendering
- Server tick rate: 20/sec (matches game logic timestep)

### Why This Works
- TypeScript on both client and server = shared type definitions, shared game logic
- Colyseus handles room management, matchmaking, state sync out of the box
- WebSocket = works in every browser, no firewall issues, low latency
- Deterministic game loop (fixed timestep) enables replay system later

### Multiplayer File Structure (Added to project when Phase 7 begins)
```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Colyseus server entry
│   ├── rooms/
│   │   └── GameRoom.ts       # Room lifecycle, command handling
│   ├── state/
│   │   ├── GameState.ts      # Authoritative game state (Colyseus schema)
│   │   ├── PlayerState.ts
│   │   ├── UnitState.ts
│   │   └── BuildingState.ts
│   ├── simulation/
│   │   ├── ServerSimulation.ts  # Runs same game logic as client
│   │   └── CommandValidator.ts  # Validates player commands
│   └── shared/               # Symlinked from client src/config/
│       ├── DamageTable.ts
│       ├── UnitData.ts
│       └── BuildingData.ts
```

---

## 7. SUPER-DETAILED DEVELOPMENT PLAN FOR CLAUDE CODE

> **INSTRUCTION FOR CLAUDE CODE:** This section is the master task list. Each phase has numbered sub-tasks with specific files to create, acceptance criteria, and dependencies. Work through them in order. Do not skip ahead. Each sub-task should be a single focused prompt/session.

---

### PHASE 1: PROJECT SCAFFOLD & ENGINE CORE
**Goal:** Empty game world you can pan around with a tilemap rendered  
**Duration:** ~1 week  
**Depends on:** Nothing (starting point)

#### 1.1 — Project Initialisation
- Create Vite + TypeScript project with Phaser dependency (`npm install phaser@beta` for v4, or `npm install phaser` for v3.90 stable)
- Configure `tsconfig.json` (strict mode, path aliases)
- Configure `vite.config.ts` (dev server, asset handling)
- Create `index.html` with game container div
- Create `src/main.ts` → initialise `Phaser.Game` with config
- **Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/config/GameConfig.ts`
- **Test:** `npm run dev` opens browser with black Phaser canvas

#### 1.2 — Scene Structure
- Create `BootScene.ts` (asset preloading, loading bar)
- Create `MenuScene.ts` (placeholder: "Click to Play" text)
- Create `GameScene.ts` (main gameplay, empty for now)
- Create `GameOverScene.ts` (placeholder)
- Wire scene transitions: Boot → Menu → Game
- **Files:** `src/scenes/BootScene.ts`, `MenuScene.ts`, `GameScene.ts`, `GameOverScene.ts`
- **Test:** Game loads, shows menu, click transitions to empty GameScene

#### 1.3 — Minimalist Isometric Sprite Generator
- Create `tools/generate-sprites.ts` using Node.js Canvas (`canvas` npm package)
- Generate **isometric diamond** terrain tiles (64×32): grass (3 variants), water, sand, road, ore field, gems
- Generate isometric building placeholders: 3D box shapes on diamond bases (blue + red versions)
- Generate isometric unit placeholders: geometric shapes with **8-directional** variants (N, NE, E, SE, S, SW, W, NW)
- Generate projectile dots, explosion frames (4-frame)
- Output: `public/assets/sprites/game-atlas.png` + `game-atlas.json` (Phaser atlas format)
- Add npm script: `"generate-sprites": "ts-node tools/generate-sprites.ts"`
- **Files:** `tools/generate-sprites.ts`, output atlas files
- **Test:** Atlas PNG contains all isometric sprites, JSON maps frame names correctly
- **Naming convention:** `{faction}_{entity}_{state}_{direction}` as defined in this brief

#### 1.4 — Isometric Tilemap Rendering
- Install Tiled Map Editor, create a 48×48 test map with **isometric orientation**
- Terrain: grass, sand, water, ore tiles in diamond layout
- Export as JSON, place in `public/assets/maps/test-map.json`
- Load tilemap in GameScene using Phaser's isometric tilemap support
- Render isometric diamond grid with correct tile sprites from atlas
- Implement depth sorting for tiles (back-to-front rendering)
- **Files:** `public/assets/maps/test-map.json`, updated `GameScene.ts`
- **Test:** 48×48 isometric map renders correctly with diamond tiles, no visual glitches

#### 1.5 — Camera System
- Implement WASD keyboard panning (smooth, configurable speed)
- Implement mouse edge-scrolling (move camera when cursor near screen edge)
- Implement scroll-wheel zoom (min/max zoom limits)
- Clamp camera to **isometric map bounds** (diamond-shaped playable area)
- Camera must account for right sidebar (game world viewport excludes sidebar width)
- **Files:** `src/systems/CameraSystem.ts`, updated `GameScene.ts`
- **Test:** Can pan with WASD, edge scroll, zoom in/out, camera stops at map edges, sidebar doesn't overlap game world

#### 1.6 — Isometric Grid Utilities
- Create `IsometricUtils.ts`:
  - `screenToIso(screenX, screenY)` → tile coordinates
  - `isoToScreen(tileX, tileY)` → screen pixel coordinates
  - `getTileUnderMouse(pointer, camera)` → hovered tile coords
- Create `MathUtils.ts`: distance, angle, lerp, clamp helpers
- Tile highlight: show hovered tile with semi-transparent **diamond** overlay
- **Files:** `src/utils/IsometricUtils.ts`, `src/utils/MathUtils.ts`
- **Test:** Moving mouse shows correct isometric tile coordinate in debug overlay, diamond highlight follows cursor

#### 1.7 — Fixed Timestep Game Loop
- Implement `FixedTimestep.ts`: game logic runs at 20 ticks/sec independent of render FPS
- Phaser's `update()` calls `FixedTimestep.update()` which accumulates delta and fires ticks
- Add FPS counter + tick rate debug overlay (toggle with F3)
- **Files:** `src/utils/FixedTimestep.ts`, updated `GameScene.ts`
- **Test:** Debug overlay shows 60 FPS render, 20 ticks/sec logic, both stable

#### 1.8 — Performance Monitoring Overlay
- Create debug panel (toggle F3): FPS, draw calls, sprite count, memory, tick duration
- Implement ViewportCuller (show/hide entities outside camera bounds)
- **Files:** `src/rendering/ViewportCuller.ts`, debug overlay in `GameScene.ts`
- **Test:** Overlay shows real-time stats, sprite count drops when zoomed in

**PHASE 1 CHECKPOINT:** Tilemap renders, camera works, debug overlay shows 60 FPS. ✅

---

### PHASE 2: SELECTION & UNIT MOVEMENT
**Goal:** Place units on map, select them, right-click to move with pathfinding  
**Duration:** ~1 week  
**Depends on:** Phase 1 complete

#### 2.1 — Entity Base Class
- Create `Entity.ts`: base class with position (tile + world), owner (player ID), HP, sprite reference
- Create `Unit.ts` extends Entity: adds speed, armor type, weapon, state (FSM)
- Create `Building.ts` extends Entity: adds size (tiles), power consumption/production
- **Files:** `src/entities/Entity.ts`, `Unit.ts`, `Building.ts`
- **Test:** Can instantiate Unit, it appears on map at correct tile position

#### 2.2 — Entity Spawning & Rendering
- Create `EntityManager.ts`: creates, tracks, destroys all entities
- Spawn test units on map (5 blue riflemen, 5 red riflemen)
- Units render using atlas sprites, positioned correctly on tilemap
- Implement sprite pooling via `SpritePool.ts` (pre-allocate, recycle)
- **Files:** `src/systems/EntityManager.ts`, `src/rendering/SpritePool.ts`
- **Test:** 10 units visible on map, correct colours, correct positions

#### 2.3 — Selection System
- Left-click to select single unit (highlight with selection circle)
- Click-drag to box-select multiple units
- Click empty space to deselect
- Double-click unit to select all same-type units on screen
- Ctrl+click to add/remove from selection
- Selection state stored in `SelectionSystem.ts`
- **Files:** `src/systems/SelectionSystem.ts`, updated `GameScene.ts`
- **Test:** Can select single, box-select multiple, deselect, double-click type-select

#### 2.4 — Control Groups
- Ctrl+1-9 to assign selected units to control group
- Press 1-9 to recall control group selection
- Double-press 1-9 to center camera on group
- **Files:** Updated `SelectionSystem.ts`
- **Test:** Assign group, recall, camera jumps on double-press

#### 2.5 — Pathfinding: A*
- Create `NavGrid.ts`: generates walkability grid from **isometric** tilemap (water/cliffs = blocked)
- Create `AStar.ts`: A* pathfinding on isometric tile grid (4 or 8 directional neighbors in iso space)
- Handle occupied tiles (units block tiles they stand on)
- Path smoothing: remove redundant waypoints on straight lines
- Movement costs: all iso-adjacent tiles have equal cost
- **Files:** `src/pathfinding/NavGrid.ts`, `src/pathfinding/AStar.ts`
- **Test:** Can compute path between two iso tiles, avoids water/obstacles, path renders correctly on diamond grid

#### 2.6 — Unit Movement
- Right-click on ground → selected units move to target tile
- Units follow A* path tile-by-tile with smooth interpolation
- Unit FSM states: IDLE → MOVING → IDLE
- Basic collision avoidance: units don't stack on same tile
- Movement speed varies per unit type (from config)
- **Files:** `src/systems/CommandSystem.ts`, updated `Unit.ts`
- **Test:** Select units, right-click, they pathfind and move smoothly to destination

#### 2.7 — Flow Field (Group Movement)
- Create `FlowField.ts`: for moving 10+ units to same area efficiently
- When 5+ units move to same target, use flow field instead of individual A*
- Prevents pathfinding spike (Rule: max 10 A* calls per tick)
- **Files:** `src/pathfinding/FlowField.ts`
- **Test:** Select 20 units, move to target — no FPS drop, units spread naturally

#### 2.8 — Unit Commands: Stop, Guard, Patrol
- S key: Stop — all selected units halt immediately
- G key: Guard — units hold position, attack enemies in range
- Patrol: right-click with Patrol mode → units walk between two points
- **Files:** Updated `CommandSystem.ts`, updated `Unit.ts` FSM
- **Test:** Each command works as described

**PHASE 2 CHECKPOINT:** Select units, move them around map, pathfinding works at 60 FPS. ✅

---

### PHASE 3: ECONOMY & BASE BUILDING
**Goal:** Harvest ore, earn credits, build structures, manage power  
**Duration:** ~2 weeks  
**Depends on:** Phase 2 complete

#### 3.1 — Config Data Files
- Create `FactionRegistry.ts`, `SharedBuildings.ts`, `SharedUnits.ts`
- Create `factions/atlantic-coalition.ts` and `factions/iron-pact.ts` with all building/unit stats from this brief
- Create `DamageTable.ts` with armor/damage multiplier matrix
- Create `factions/_template.ts` for future factions
- **Files:** All config files in `src/config/`
- **Test:** Can import and read faction data: `getFaction('ac').units.rifleman.cost === 200`

#### 3.2 — Resource System: Ore Fields
- Ore tiles on map have a resource amount (starts at 1000)
- Visual: ore tile changes appearance as it depletes (full → half → depleted)
- Ore slowly regenerates over time (configurable rate)
- Gem tiles: higher value, no regeneration
- **Files:** `src/systems/ResourceSystem.ts`
- **Test:** Ore tile depletes visually when harvested, regenerates over time

#### 3.3 — Harvester Entity
- Create `Harvester.ts` extends Unit
- Harvester FSM: IDLE → MOVING_TO_ORE → HARVESTING → RETURNING → UNLOADING → repeat
- Harvester automatically finds nearest ore field
- Cargo capacity: fills up over ~15 seconds of harvesting
- Returns to nearest refinery to unload → credits added to player
- If ore field depleted → automatically finds next nearest
- **Files:** `src/entities/Harvester.ts`, updated `ResourceSystem.ts`
- **Test:** Harvester spawns, drives to ore, harvests, returns, credits increase in HUD

#### 3.4 — Credit Counter & Player State
- Create `PlayerState.ts`: credits, power produced, power consumed, faction
- Credits increase when harvester unloads
- Credits decrease when building/unit is purchased
- Insufficient credits → build/purchase blocked with audio/visual feedback
- **Files:** `src/systems/PlayerState.ts`
- **Test:** Credits go up from harvesting, go down from spending, can't overspend

#### 3.5 — Power System
- Each building has a power value (positive = generates, negative = consumes)
- `PowerSystem.ts` calculates total produced vs consumed
- Power states: Full (≥100%), Low (<50%), None (0%)
- Low power: production speed halved, radar offline
- No power: defences stop firing, gates stay open
- **Files:** `src/systems/PowerSystem.ts`
- **Test:** Build power plants → power goes up. Build consumers → power goes down. Below 50% triggers effects.

#### 3.6 — Construction Yard & Build Queue
- Construction Yard building is the player's starting structure
- `BuildSystem.ts`: manages build queue (1 item at a time per CY)
- Player clicks building in build panel → enters queue → countdown timer → "Ready"
- When ready, player places building on map (ghost preview, green=valid, red=invalid)
- Placement rules: must be within build radius, not on water/occupied tiles, adjacent to existing structures
- Building appears with "under construction" animation, finishes after brief delay
- **Files:** `src/systems/BuildSystem.ts`
- **Test:** Select CY, queue a barracks, wait, place it on map, it builds

#### 3.7 — Build Radius & Placement Validation
- Build radius extends from Construction Yard and all owned buildings
- Ghost building follows cursor, snaps to grid, shows green (valid) or red (invalid)
- Invalid if: on water, on another building, outside build radius, insufficient credits
- ESC to cancel placement
- **Files:** Updated `BuildSystem.ts`
- **Test:** Ghost follows mouse, colour changes based on validity, ESC cancels

#### 3.8 — Unit Production
- Barracks → produces infantry. War Factory → produces vehicles.
- `ProductionSystem.ts`: per-factory build queue with cost and build time
- Multiple same-type factories → speed bonus (each additional = −15% build time)
- Produced unit spawns at factory exit, moves to rally point
- Rally point: right-click while factory selected sets rally flag
- **Files:** `src/systems/ProductionSystem.ts`
- **Test:** Select barracks, queue rifleman, he spawns and walks to rally point

#### 3.9 — Ore Refinery + Free Harvester
- Building a refinery auto-spawns one free harvester
- Harvester returns to nearest refinery (can have multiple)
- **Files:** Updated `BuildSystem.ts`, `Harvester.ts`
- **Test:** Build refinery → harvester appears → starts harvesting automatically

#### 3.10 — UI: Right Sidebar & Status Bar (RA2-Style)
- **Right Sidebar** (220px fixed width, right-anchored):
  - `Sidebar.ts`: main container
  - `FactionLogo.ts`: faction emblem at top of sidebar
  - `Minimap.ts`: isometric minimap below logo (click to navigate camera)
  - `ResourceDisplay.ts`: credit counter (₡) + power bar (%) below minimap
  - `BuildPanel.ts`: 3-column grid of building/unit thumbnails, scrollable
    - Tabs: Structures | Infantry | Vehicles | Defences
    - Click thumbnail → starts build (progress bar overlay on thumbnail)
    - Complete → thumbnail flashes "READY", click to place on map
    - Right-click → cancel build, partial refund
    - Greyed out = prerequisites not met (tooltip explains)
    - Red tint = insufficient credits
    - "On Hold" label for paused production
  - `SuperweaponTimer.ts`: countdown timers at bottom of sidebar
- **Bottom Status Bar** (thin, full width):
  - `StatusBar.ts`: shows selected unit(s) info (type, count, HP bar)
  - Command buttons: Stop [S], Guard [G], Deploy [D], Sell [$], Repair [🔧]
  - When building selected: building name, HP, sell/repair options
- **Files:** `src/ui/Sidebar.ts`, `Minimap.ts`, `BuildPanel.ts`, `BuildThumbnail.ts`, `ResourceDisplay.ts`, `StatusBar.ts`, `FactionLogo.ts`, `SuperweaponTimer.ts`, `Tooltip.ts`
- **Test:** Sidebar renders on right, credits update live, build panel shows correct items per tab, minimap click moves camera

**PHASE 3 CHECKPOINT:** Full economy loop works: harvest → refine → spend → build → produce. ✅

---

### PHASE 4: COMBAT SYSTEM
**Goal:** Units fight, buildings defend, things explode  
**Duration:** ~2 weeks  
**Depends on:** Phase 3 complete

#### 4.1 — Weapon System
- Each unit has weapon(s) defined in config: damage, range, fire rate, projectile type, damage type
- Attack command: right-click on enemy → unit moves into range, then fires
- Attack-move: A + right-click → move to position, attack anything encountered
- Auto-attack: idle units in Guard mode fire at enemies in range
- **Files:** `src/systems/CombatSystem.ts`
- **Test:** Rifleman attacks enemy conscript, damage applied correctly

#### 4.2 — Damage Calculation
- Look up multiplier from DamageTable: `damage × multiplier[damageType][armorType]`
- Apply damage to target HP
- Unit dies at 0 HP → death animation → remove from game
- Wreckage sprite stays briefly then fades
- **Files:** Updated `CombatSystem.ts`, `DamageTable.ts`
- **Test:** Anti-armor weapon does 125% to heavy armor, 75% to light armor (as per matrix)

#### 4.3 — Projectiles (Object Pooled)
- `Projectile.ts`: pooled entity, travels from attacker to target
- Projectile types: bullet (instant/fast), rocket (slower, visible travel), beam (instant line)
- On impact: deal damage, play hit effect
- Use `SpritePool` — pre-allocate 200 projectiles, recycle on impact
- **Files:** `src/entities/Projectile.ts`, updated `SpritePool.ts`
- **Test:** Firing shows projectile travel, no FPS drop with 50+ simultaneous projectiles

#### 4.4 — Defensive Structures
- Pillbox / Sentry Gun: auto-fires at enemies in range (anti-infantry)
- Prism Tower / Tesla Coil: powerful beam/bolt attack (anti-everything)
- Patriot Missile / Flak Cannon: anti-air
- Defences require power — go offline when power is low/none
- **Files:** Updated `Building.ts`, `CombatSystem.ts`
- **Test:** Build a pillbox, enemy infantry walks nearby, pillbox fires and kills them

#### 4.5 — Fog of War
- `FogSystem.ts`: maintains 2D visibility grid matching tilemap
- Each cell: 0 = unexplored (black), 1 = shroud (grey, shows terrain), 2 = visible (full)
- Each unit/building has sight range → reveals nearby cells
- `FogRenderer.ts`: separate low-res canvas overlay, only redraws changed cells
- Enemy units/buildings hidden when outside player's vision
- **Files:** `src/systems/FogSystem.ts`, `src/rendering/FogRenderer.ts`
- **Test:** Unexplored map is black, moving units reveals terrain, enemy disappears in fog

#### 4.6 — Veterancy System
- `VeterancySystem.ts`: tracks kills per unit
- 3 kills → Veteran: +25% damage, +25% HP, rank icon
- 7 kills → Elite: +50% damage, +50% HP, self-heal (1 HP/sec), rank icon
- **Files:** `src/systems/VeterancySystem.ts`
- **Test:** Unit kills 3 enemies → stats visibly increase, rank star appears

#### 4.7 — Engineer & Building Capture
- Engineer can enter enemy/neutral buildings → captures them (changes ownership)
- Engineer is consumed on use
- Capturing neutral tech buildings grants bonuses (Oil Derrick → income, etc.)
- **Files:** `src/entities/TechBuilding.ts`, updated `CommandSystem.ts`
- **Test:** Engineer walks into enemy barracks → it turns blue/red

#### 4.8 — Minimap
- `Minimap.ts`: renders low-res version of entire map in bottom-left corner
- Shows terrain, friendly units (blue/red dots), enemy units (if visible), buildings
- Click on minimap → camera jumps to that location
- Fog of war applies to minimap too
- **Files:** `src/ui/Minimap.ts`
- **Test:** Minimap shows map overview, clicking jumps camera, fog applies

**PHASE 4 CHECKPOINT:** Units fight with correct damage, fog works, buildings defend, veterancy tracks. ✅

---

### PHASE 5: FULL FACTION IMPLEMENTATION
**Goal:** Both factions fully playable with unique units and superweapons  
**Duration:** ~2 weeks  
**Depends on:** Phase 4 complete

#### 5.1 — Atlantic Coalition Full Roster
- Implement all 11 AC units from config with correct sprites, stats, weapons
- Implement all 13 AC buildings with correct sprites, power, prerequisites
- Implement tech tree unlock logic (building X requires Y + Z)
- **Test:** Can build entire AC tech tree from CY to Battle Lab

#### 5.2 — Iron Pact Full Roster
- Implement all 11 IP units with correct sprites, stats, weapons
- Implement all 13 IP buildings with correct sprites, power, prerequisites
- Nuclear Reactor special: explodes on destruction, damages nearby units/buildings
- **Test:** Can build entire IP tech tree, nuke reactor explodes dramatically when destroyed

#### 5.3 — Superweapons
- `SuperweaponSystem.ts`: manages cooldown timers, activation
- Marine Force Drop (AC): select target area → 8 Elite Marines paradrop in. 5-min cooldown
- Nuclear Missile Silo (IP): select target → nuclear missile launches, massive explosion + radiation zone. 7-min cooldown
- All players notified when superweapon is built ("Nuclear silo detected" alert)
- Countdown timer visible in HUD
- **Files:** `src/systems/SuperweaponSystem.ts`
- **Test:** Build superweapon, wait for charge, activate, effect works correctly

#### 5.4 — Support Powers
- Radar scan: reveal target area for 15 seconds
- Paradrop (from Tech Airport): free infantry at target location
- **Files:** Updated `SuperweaponSystem.ts` (reuse cooldown logic)
- **Test:** Each support power works on cooldown

#### 5.5 — Neutral Tech Buildings
- Place on map: Oil Derrick, Tech Airport, Tech Hospital, Tech Machine Shop, Observation Post
- Each grants different bonus when captured by engineer
- Yellow/neutral colour until captured → changes to owner's colour
- **Files:** Updated `TechBuilding.ts`, map data
- **Test:** Engineer captures Oil Derrick → player receives passive income

#### 5.6 — Faction Selection & Team Colours
- Sprites tinted with faction primary colour via Phaser's `setTint()`
- Shared sprites (walls, engineers, harvesters) re-tinted per owner
- Selection circles match faction colour
- **Files:** Updated `AtlasManager.ts`, entity rendering
- **Test:** Blue and red units are clearly distinguishable at a glance

#### 5.7 — Balance Pass
- Create `tools/balance-spreadsheet.ts`: outputs CSV of all unit matchups
- Calculate: cost-effectiveness of each unit vs each other unit
- Ensure no dominant strategy — each unit type has clear counters
- Adjust costs, HP, damage as needed in config files
- **Test:** No single unit wins against everything cost-effectively

**PHASE 5 CHECKPOINT:** Both factions fully playable with unique units, superweapons, tech trees. ✅

---

### PHASE 6: AI OPPONENT & SKIRMISH MODE
**Goal:** Play a complete game against AI, from menu to victory screen  
**Duration:** ~2 weeks  
**Depends on:** Phase 5 complete

#### 6.1 — AI: Build Order Script
- AI follows predefined build order: CY → Power → Refinery → Barracks → War Factory → Radar → etc.
- AI places buildings in valid locations (simple placement algorithm near CY)
- AI manages economy: builds harvesters, refineries when income is low
- **Files:** `src/systems/AISystem.ts`
- **Test:** AI builds a base over time without player input

#### 6.2 — AI: Army Production
- AI produces units based on army composition targets
- Example: maintain ratio of 60% tanks, 20% infantry, 20% anti-air
- AI queues units when credits available
- **Test:** AI steadily produces a mixed army

#### 6.3 — AI: Attack Logic
- AI attacks when army size exceeds threshold (configurable per difficulty)
- AI picks attack target: nearest enemy structure, or weakest point
- AI sends army in a group (not trickle)
- AI retreats if army is being destroyed
- **Test:** AI gathers army, attacks player base, retreats if losing

#### 6.4 — AI: Counter-Unit Logic
- AI scouts player army composition (cheats on Hard/Brutal by ignoring fog)
- AI adjusts production to counter player: heavy tanks → build anti-armor, air rush → build flak
- **Test:** Player builds all tanks → AI starts producing rocket soldiers

#### 6.5 — AI: Difficulty Levels
- Easy: slow build, no rush, weak composition, +0% resource bonus
- Medium: balanced build, attacks at 5 min, mixed army, +0% resource
- Hard: fast build, attacks at 3 min, counter-unit logic, +25% resource bonus
- Brutal: fastest build, attacks at 2 min, full counter logic, +50% resources, no fog
- **Files:** AI difficulty configs in `src/config/AIConfig.ts`
- **Test:** Each difficulty feels noticeably different to play against

#### 6.6 — Skirmish Setup Screen
- `SkirmishSetup.ts` scene: pick your faction, pick AI faction, pick AI difficulty, pick map
- Start game button → transitions to GameScene with selected settings
- Player always starts at position 1, AI at position 2 (map spawn points)
- **Files:** `src/scenes/SkirmishSetup.ts`
- **Test:** Can configure and launch a skirmish game

#### 6.7 — Win/Loss Conditions
- Win: all enemy buildings destroyed (or enemy surrenders)
- Lose: all your buildings destroyed
- Game Over screen shows stats: units built, units lost, time elapsed, credits earned
- "Play Again" and "Main Menu" buttons
- **Files:** Updated `GameScene.ts`, `GameOverScene.ts`
- **Test:** Destroy all AI buildings → victory screen. Lose all buildings → defeat screen.

#### 6.8 — Audio: Sound Effects & Music
- Add SFX: unit select, unit move, weapon fire (per type), explosion, building place, building complete, insufficient funds, superweapon ready
- Add music: menu theme, gameplay track (royalty-free)
- Use Phaser audio system with volume controls in settings
- **Files:** `public/assets/audio/`, settings in `MenuScene.ts`
- **Test:** Actions have sound feedback, music plays, volume adjustable

#### 6.9 — Main Menu Polish
- Title screen with game logo, "Skirmish" button, "Settings" button, "Credits" button
- Settings: volume sliders, graphics quality (low/medium/high = changes resolution scale)
- **Files:** Updated `MenuScene.ts`
- **Test:** Full menu flow: title → settings → skirmish setup → gameplay → game over → title

**PHASE 6 CHECKPOINT:** Complete playable game: menu → skirmish vs AI → win/lose → play again. ✅

---

### PHASE 7: ONLINE MULTIPLAYER
**Goal:** Two players fight online via WebSocket  
**Duration:** ~4 weeks  
**Depends on:** Phase 6 complete

#### 7.1 — Colyseus Server Setup
- Create `server/` directory with Node.js + TypeScript + Colyseus
- Define `GameRoom.ts` with room lifecycle (onCreate, onJoin, onLeave, onDispose)
- Define state schemas: `GameState`, `PlayerState`, `UnitState`, `BuildingState`
- Shared config: symlink `src/config/` so server uses same unit/building data
- **Test:** Server starts, client can connect, room is created

#### 7.2 — Command-Based Networking
- Client sends commands (not state): MOVE, ATTACK, BUILD, PRODUCE, USE_SUPERWEAPON
- `CommandValidator.ts`: server validates each command (is it this player's turn? do they have credits? is the target valid?)
- Server runs game simulation, broadcasts state updates
- **Test:** Client sends MOVE command, server validates, unit moves on both screens

#### 7.3 — State Synchronisation
- Server sends delta state updates at 20/sec (only changed properties)
- Client interpolates between server states for smooth rendering
- Handle latency: client predicts movement locally, corrects on server update
- **Test:** Two browser tabs connected, units move smoothly on both

#### 7.4 — Lobby & Matchmaking
- Lobby scene: list of open games, create game, join game
- Game creation: pick faction, pick map, set room name
- Ready check: both players must click "Ready" before game starts
- Countdown: 3-2-1 → game begins simultaneously
- **Files:** `src/scenes/LobbyScene.ts`
- **Test:** Player 1 creates room, Player 2 joins, both ready, game starts

#### 7.5 — Chat & Alerts
- In-game chat: send messages to opponent
- System alerts: "Player 2 has built a Nuclear Silo", "Player 1's base is under attack"
- **Test:** Messages appear on both screens

#### 7.6 — Disconnect Handling
- Player disconnects → game pauses for 30 sec → if not reconnected, opponent wins
- Reconnection: player rejoins room, receives full state, resumes
- **Test:** Disconnect one tab, reconnect within 30 sec, game continues

#### 7.7 — Anti-Cheat Basics
- All game logic runs on server (authoritative)
- Client cannot modify unit stats, credits, or fog
- Server rejects invalid commands (move to unreachable tile, spend credits you don't have)
- **Test:** Modified client sends impossible command → server rejects it

**PHASE 7 CHECKPOINT:** Two players can play a full game online with chat, reconnection, and basic anti-cheat. ✅

---

### PHASE 8: POLISH, ART UPGRADE & EXPANSION
**Goal:** Professional visuals, more content, community features  
**Duration:** Ongoing  
**Depends on:** Phase 6 or 7 complete

#### 8.1 — Art Asset Swap
- Purchase CraftPix TDS Modern packs (or chosen assets)
- Rename to match naming convention
- Pack into atlas, replace `game-atlas.png` + `.json`
- Verify all sprites display correctly
- **Test:** Game looks like a "real" RTS with professional sprites

#### 8.2 — 3rd Faction: Eclipse Order
- Create `factions/eclipse-order.ts` config file
- Create/purchase purple-themed sprites
- Register faction, add to skirmish setup
- **Test:** Can play as Eclipse Order with unique units

#### 8.3 — 4th Faction: Jade Dominion
- Same process as 8.2 with green/bronze theme
- **Test:** Can play as Jade Dominion with unique units

#### 8.4 — Nation Sub-Selections
- Implement `NationConfig` system (3 nations per faction)
- Each nation adds 1 unique unit + 1 unique ability
- Nation selection in skirmish setup
- **Test:** Picking "Atlantis" gives Chrono Commando, "Helvetia" gives Sharpshooter

#### 8.5 — Map Editor
- Web-based map editor or enhanced Tiled integration
- Community map sharing

#### 8.6 — Replay System
- Record all player commands with timestamps
- Replay viewer: fast-forward, rewind, watch from either player's perspective

#### 8.7 — Mobile Touch Controls
- Touch-to-select, touch-to-move
- Pinch-to-zoom
- On-screen command buttons

#### 8.8 — Leaderboard & Rankings
- ELO-based rating system
- Win/loss tracking
- Seasonal leaderboards

---

## 8. PROJECT FILE STRUCTURE

```
new-order/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── tools/
│   ├── generate-sprites.ts       # Builds minimalist atlas
│   ├── balance-spreadsheet.ts    # Outputs unit matchup CSV
│   └── atlas-builder.sh          # Future: pack purchased PNGs
│
├── public/assets/
│   ├── sprites/
│   │   ├── game-atlas.png        # Single spritesheet
│   │   ├── game-atlas.json       # Frame definitions
│   │   └── README.md             # Naming convention docs
│   ├── maps/                     # Tiled JSON exports
│   ├── audio/{sfx,music}/
│   └── ui/
│
├── src/
│   ├── main.ts
│   ├── config/
│   │   ├── GameConfig.ts
│   │   ├── FactionRegistry.ts
│   │   ├── DamageTable.ts
│   │   ├── SharedBuildings.ts
│   │   ├── SharedUnits.ts
│   │   ├── AIConfig.ts
│   │   ├── factions/
│   │   │   ├── atlantic-coalition.ts
│   │   │   ├── iron-pact.ts
│   │   │   └── _template.ts
│   │   └── nations/
│   │       └── _template.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── SkirmishSetup.ts
│   │   ├── LobbyScene.ts         # Phase 7
│   │   ├── GameScene.ts
│   │   └── GameOverScene.ts
│   ├── systems/
│   │   ├── EntityManager.ts
│   │   ├── ResourceSystem.ts
│   │   ├── PowerSystem.ts
│   │   ├── BuildSystem.ts
│   │   ├── ProductionSystem.ts
│   │   ├── CombatSystem.ts
│   │   ├── FogSystem.ts
│   │   ├── VeterancySystem.ts
│   │   ├── SelectionSystem.ts
│   │   ├── CommandSystem.ts
│   │   ├── CameraSystem.ts
│   │   ├── SuperweaponSystem.ts
│   │   ├── AISystem.ts
│   │   └── PlayerState.ts
│   ├── entities/
│   │   ├── Entity.ts
│   │   ├── Unit.ts
│   │   ├── Building.ts
│   │   ├── Harvester.ts
│   │   ├── Projectile.ts
│   │   └── TechBuilding.ts
│   ├── pathfinding/
│   │   ├── AStar.ts
│   │   ├── FlowField.ts
│   │   └── NavGrid.ts
│   ├── ui/
│   │   ├── Sidebar.ts              # Right-panel container (RA2-style)
│   │   ├── Minimap.ts              # Isometric minimap
│   │   ├── BuildPanel.ts           # 3-column build thumbnail grid
│   │   ├── BuildThumbnail.ts       # Individual build button with progress
│   │   ├── ResourceDisplay.ts      # Credits + power bar
│   │   ├── StatusBar.ts            # Bottom bar: selection info + commands
│   │   ├── FactionLogo.ts          # Top of sidebar
│   │   ├── SuperweaponTimer.ts     # Countdown timers
│   │   └── Tooltip.ts              # Hover tooltip for build items
│   ├── rendering/
│   │   ├── AtlasManager.ts
│   │   ├── SpritePool.ts
│   │   ├── FogRenderer.ts
│   │   └── ViewportCuller.ts
│   └── utils/
│       ├── IsometricUtils.ts     # Screen ↔ iso coordinate transforms
│       ├── MathUtils.ts
│       └── FixedTimestep.ts
│
└── server/                        # Phase 7
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── rooms/GameRoom.ts
        ├── state/{GameState,PlayerState,UnitState,BuildingState}.ts
        ├── simulation/{ServerSimulation,CommandValidator}.ts
        └── shared/                # Symlinked from client config
```

---

## 9. HOW TO USE THIS BRIEF WITH CLAUDE CODE

1. **Place this file in the project root** as `GAME-BRIEF.md`
2. **Start each Claude Code session** with:
   ```
   Read GAME-BRIEF.md. I'm working on Phase X, Task X.X.
   Implement it following the acceptance criteria listed.
   Remember the 8 anti-lag rules from section 3.
   Use isometric coordinates (IsometricUtils.ts) for all tile operations.
   UI uses right sidebar layout (Sidebar.ts), not bottom bar.
   ```
3. **Work one sub-task at a time** — never ask for multiple tasks in one prompt
4. **After each sub-task**, test the acceptance criteria before moving to the next
5. **If a sub-task is too large**, ask Claude Code to break it into smaller pieces
6. **Reference config data** from section 4 for exact unit/building stats
7. **Reference file structure** from section 8 for where files belong

---

*v5.0 FINAL — April 2026*  
*Isometric 2.5D, RA2-style right sidebar UI*  
*Phaser 4 (Beam renderer) + TypeScript + Vite + Colyseus*  
*Super-detailed development plan for Claude Code*  
*Minimalist graphics → asset-upgrade-ready*  
*2 factions, expandable, performance-first*  
*Multiplayer-ready architecture (Colyseus + WebSocket)*  
*All technologies verified current as of April 2026*
