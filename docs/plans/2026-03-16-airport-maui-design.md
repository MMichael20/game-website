# Airport & Maui Destination — Design Document

## Overview

Hub-style airport with multiple rooms leading to an animated airplane cutscene, arriving at Maui as the first travel destination. Architecture supports future destinations and missions.

---

## Architecture

```
WorldScene (existing overworld)
  └─ [walk to airport building, interact] ──fade──> AirportEntranceScene
       └─ [walk to security door] ──fade──> AirportSecurityScene
            └─ [walk to gate door] ──fade──> AirportGateScene
                 └─ [interact with gate agent] ──fade──> AirplaneCutscene
                      └─ [cutscene ends] ──fade──> MauiOverworldScene
                           ├─ Beach zone
                           └─ Town zone

Return path:
  MauiOverworldScene ──[interact with airport NPC]──> AirplaneCutscene (reverse) ──> WorldScene
```

- Airport rooms: InteriorScene subclasses (3 rooms)
- AirplaneCutscene: bare Phaser.Scene with Timeline API
- MauiOverworldScene: extends new OverworldScene base class (extracted from WorldScene)

---

## Infrastructure Changes

### 1. InteriorScene: Multi-Room Transitions

Add two optional config fields to InteriorScene:

- `nextRoom: { sceneKey: string, spawnPoint: { x, y } } | null`
- `previousRoom: { sceneKey: string, spawnPoint: { x, y } } | null`

**Exit logic:** When player reaches an exit zone, check `nextRoom`. If non-null, fade → start that scene. If null, call existing `exitToOverworld()`. Back door uses `previousRoom` with the same logic.

| Room | nextRoom | previousRoom |
|---|---|---|
| AirportEntranceScene | AirportSecurityScene | null (→ WorldScene via exitToOverworld) |
| AirportSecurityScene | AirportGateScene | AirportEntranceScene |
| AirportGateScene | null (cutscene via NPC) | AirportSecurityScene |

### 2. NPC Interaction System

Add to NPCDef:
- `interactable: boolean` (default false)
- `interactionRadius: number` (default 48px)
- `onInteract: "dialog" | "cutscene-trigger"`
- `interactionData: { lines?: string[], sceneKey?: string }`

**Flow:**
1. NPC checks distance to player each frame (only if `interactable`)
2. In range → show "E" prompt sprite above NPC
3. Player presses E → NPC emits `npc-interact` event on the scene
4. Scene handler dispatches by type:
   - `"dialog"`: freeze input, show DOM dialog overlay, sequential lines, advance on click/E
   - `"cutscene-trigger"`: freeze input, fade out, start target scene

### 3. OverworldScene Base Class Extraction

Extract from WorldScene:
- Tilemap creation (parameterized by map config)
- Player spawn + camera follow
- Click-to-move + A* pathfinding (accepts collision grid)
- NPC system initialization (accepts NPC def array)
- Zone transition handling
- HUD

Each subclass provides `getSceneConfig()` returning: map dimensions, tile types, NPC definitions, zone boundaries, entry points.

WorldScene becomes `class WorldScene extends OverworldScene`. Zero functional change.

### 4. NPCSystem Parameterization

NPCSystem accepts NPC definitions as a constructor parameter instead of importing global NPC_DEFS.

### 5. PixelArtGenerator Split

```
src/game/rendering/
  PixelArtGenerator.ts      — core API, color utils, base patterns
  WorldTextures.ts           — home-island tiles + objects
  AirportTextures.ts         — airport interior textures
  MauiTextures.ts            — maui tiles + objects
  NPCTextures.ts             — all NPC textures with palette recolor support
```

### 6. Save System V3

New fields: `currentScene: string` (scene key for resume location).

Migration V2→V3: set `currentScene: "WorldScene"`, preserve all existing data.

Resume logic:
- `currentScene === "AirportEntranceScene"` → resume at airport entrance
- `currentScene === "MauiOverworldScene"` → resume at Maui airport arrival point
- Default → WorldScene

---

## Airport Scenes

### AirportEntranceScene (20x14 tiles)

Large open hall. Check-in counters along top wall, seating in middle, departures board on wall.

**Floors:** TileFloor (full room), CarpetBeige seating area (x=5..14, y=6..10)

**Decorations:**
- airport-counter (check-in desks, 6 positions along y=2)
- airport-bench (seating rows at y=7)
- airport-departures-board (wall, x=10, y=1)
- airport-sign-departures (pointing to security)
- airport-luggage-cart, airport-plant (atmosphere)

**Entrance:** { tileX: 10, tileY: 13 } (from WorldScene)
**Exit:** { tileX: 18, tileY: 3 } (to Security)

**NPCs (6):**
- ticket-agent-1 (interactive, dialog about flights)
- ticket-agent-2 (interactive, dialog about destinations)
- traveler-1, traveler-2 (sit, atmospheric)
- traveler-walk-1, traveler-walk-2 (walk, atmospheric)

### AirportSecurityScene (12x8 tiles)

Minimal checkpoint room. Conveyor belt, metal detector frame, one guard.

**Floors:** TileFloor (full room)

**Decorations:**
- airport-conveyor-belt, airport-metal-detector
- airport-sign-gate (pointing to gates)
- airport-bin (security bins)

**Entrance:** { tileX: 2, tileY: 4 } (from Entrance)
**Exit:** { tileX: 10, tileY: 4 } (to Gate)

**NPCs (2):**
- security-guard (interactive, "Have a safe flight")
- traveler-queue-1 (walk, atmospheric)

### AirportGateScene (22x14 tiles)

Split space: left = small cafe, right = gate waiting area with windows showing plane.

**Floors:** Wood (cafe, x=1..9), TileFloor (gate area, x=10..20)

**Decorations:**
- airport-cafe-counter, airport-stool, airport-cafe-menu (cafe section)
- airport-bench x4 (gate seating)
- airport-window x3 (top wall, shows plane exterior)
- airport-gate-desk (boarding desk at x=19, y=2)
- airport-sign-gate-number ("Gate 7")
- airport-sign-cafe (coffee icon)

**Entrance:** { tileX: 1, tileY: 7 } (from Security)
**Exit:** Cutscene triggered by gate agent NPC interaction, NOT walk-to-exit

**NPCs (7):**
- gate-agent (interactive, "Ready to board?" → triggers AirplaneCutscene)
- cafe-worker (interactive, dialog)
- shopkeeper (interactive, future shop hook)
- traveler-sit-1, traveler-sit-2, traveler-sit-3 (sit, atmospheric)
- traveler-walk-gate (walk, atmospheric)

---

## Airplane Cutscene

**Class:** `AirplaneCutscene extends Phaser.Scene`
**Input:** `{ destination: "maui" | "home" }`
**Implementation:** Phaser.Time.Timeline API (not raw tween chains)

### Phase 1 — Takeoff Exterior (3s)
- Sky-blue gradient background fades in
- airplane-exterior sprite tweens upward and right
- Ground shrinks away (scale tween)

### Phase 2 — Interior Cabin (4s)
- Crossfade to cabin interior view
- airplane-cabin-bg sprite (seats, overhead bins, window)
- Player + partner rendered as static seated sprites (idle frame 0)
- Cloud sprites scroll past window
- Optional slight camera shake for turbulence

### Phase 3 — Cloud Transition (2s)
- Cloud sprites fill screen left-to-right
- Alpha tween to white

### Phase 4 — Landing Exterior (3s)
- Airplane descends toward tropical green ground
- Island grows larger (scale tween)
- Brief screen shake on touchdown
- Fade to black → start destination scene

**Total: ~12 seconds.** `destination` param determines which scene to start after.

---

## Maui Overworld Scene

**Class:** `MauiOverworldScene extends OverworldScene`
**Dimensions:** 30x24 tiles (960x768 px)

### Zone Layout

```
    0         10        20        29
 0  ┌──────────────────────────────┐
    │                              │
 5  │  ═══ TOWN ═══════════════   │
    │  shops  plaza  maui-airport  │
10  │  ═══════════════════════════ │
    │        ░░░ path ░░░░         │
14  │  ~~~~ BEACH ~~~~~~~~~~       │
    │  sand  sand  sand  sand      │
20  │  ≈≈≈≈ OCEAN (impassable) ≈  │
    │                              │
24  └──────────────────────────────┘
```

### Beach Zone (y=14..19)
- Tiles: Sand (new), ShallowWater/Ocean (impassable, y=20+)
- Decorations: palm-tree, beach-umbrella, beach-towel, surfboard
- NPCs: beach-goers (sit on towels), surfer (idle, interactive)

### Town Zone (y=3..10)
- Tiles: Stone (paths), SandStone (new, building areas)
- Buildings: building-maui-shop, building-maui-house (impassable sprites, NOT enterable)
- Decorations: maui-market-stall, maui-fountain, maui-flower-pot
- Small airport: building-maui-airport at right side (interact to trigger return flight)
- NPCs: maui-shopkeeper (idle, interactive), townfolk (walk), maui-airport-agent (interactive, triggers return cutscene)

### Arrival Point
Player + partner spawn at (x=24, y=7) near Maui airport.

---

## New Textures

### Terrain Tiles (32x32)
- tile-sand (warm yellow)
- tile-sandstone (tan)
- tile-shallow-water (light blue, impassable)
- tile-ocean (deep blue, impassable)

### NPC Textures (3 base + palette recolors)
- npc-ticket-agent (blue vest, white shirt) — recolor for gate agent, security guard
- npc-traveler (casual clothes) — recolor 2-3x for variety
- npc-maui-local (Hawaiian shirt) — recolor for surfer, shopkeeper, airport agent

### Airport Decorations
- airport-counter, airport-bench, airport-conveyor-belt
- airport-metal-detector, airport-rope-barrier
- airport-departures-board, airport-window, airport-gate-desk
- airport-bin, airport-cafe-counter, airport-stool
- airport-cafe-menu, airport-plant, airport-luggage-cart

### Airport Signs (32x16)
- sign-departures (blue + arrow icon)
- sign-gate (blue + gate icon)
- sign-restroom (restroom icon)
- sign-cafe (coffee cup icon)
- sign-gate-number ("G7")

### Maui Decorations
- palm-tree (32x64), beach-umbrella, beach-towel, surfboard
- maui-market-stall (64x48), maui-fountain, maui-flower-pot

### Buildings
- building-airport (96x64, for WorldScene)
- building-maui-shop (64x64)
- building-maui-house (64x64)
- building-maui-airport (96x64)

### Airplane Sprites
- airplane-exterior (128x48, side view)
- airplane-cabin-bg (full scene background)
- cloud-1, cloud-2, cloud-3 (varied sizes)
- runway (full width x 64)

---

## Signage System

**Hybrid:** Pixel art sign sprite (icon/arrow, 32x16) + DOM tooltip on 2-tile proximity.

```typescript
interface SignDef {
  id: string;
  tileX: number;
  tileY: number;
  texture: string;
  tooltipText: string;
}
```

Signs defined per-scene in room config. Scene update loop checks player distance; within 2 tiles shows styled DOM tooltip via existing UIManager container pattern. Single tooltip visible at a time (closest sign wins).

---

## Future Mission Hooks

- **NPC dialog:** Add `missionId` to NPCDef → scene handler checks mission state
- **Zone triggers:** Proximity-triggered callbacks for objective completion
- **Save data:** `missionProgress: Record<string, any>` field (not implemented now)
- **Collectibles:** Decoration `interactable` flag + `onInteract` callback
- **New destinations:** Add more OverworldScene subclasses + cutscene destinations

---

## File Structure

### New Files
```
src/game/scenes/
  OverworldScene.ts              — base class extracted from WorldScene
  airport/
    AirportEntranceScene.ts      — extends InteriorScene
    AirportSecurityScene.ts      — extends InteriorScene
    AirportGateScene.ts          — extends InteriorScene
    AirplaneCutscene.ts          — extends Phaser.Scene
    airportLayouts.ts            — layout definitions for all 3 rooms
    airportNPCs.ts               — NPC definitions for all rooms
    airportSigns.ts              — sign definitions for all rooms
  maui/
    MauiOverworldScene.ts        — extends OverworldScene
    mauiMap.ts                   — tile map + layout data
    mauiNPCs.ts                  — NPC definitions for Maui zones
src/game/rendering/
  WorldTextures.ts               — extracted from PixelArtGenerator
  AirportTextures.ts             — airport textures
  MauiTextures.ts                — maui textures
  NPCTextures.ts                 — all NPC textures with palette support
src/ui/
  SignTooltip.ts                 — proximity tooltip for signs
  DialogOverlay.ts               — sequential NPC dialog system
```

### Modified Files
| File | Change |
|---|---|
| main.ts | Register 5 new scenes |
| InteriorScene.ts | Add nextRoom/previousRoom config, branch exit logic |
| NPC.ts | Add interactable fields, proximity check, emit npc-interact |
| NPCSystem.ts | Accept NPC defs as parameter |
| WorldScene.ts | Extend OverworldScene, move shared logic to base |
| PixelArtGenerator.ts | Refactor to orchestrator, delegate to domain texture files |
| BootScene.ts | Call new texture registration functions |
| SaveSystem.ts | V3 schema, currentScene field, V2→V3 migration |
| mapLayout.ts | Add airport building + exit zone to world map |
