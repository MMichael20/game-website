# Budapest Massive Improvements - Design Document

**Date:** 2026-03-22
**Status:** Design Phase
**Scope:** Cutscenes, Map, Animations, Graphics, New Content
**Constraint:** All procedural pixel art via Canvas 2D. No external assets. No engine changes.

---

## 1. Approach Analysis

### Approach A: Depth-First (Polish Existing, Then Expand)

Focus entirely on making what exists dramatically better before adding anything new. Rework every texture to double its detail. Rewrite both cutscenes from scratch with character sprites, dialogue, and cinematic pacing. Add animation layers (water reflections, ambient particles, lighting shifts) to the existing 55x35 overworld. Only add new scenes after existing ones are polished.

**Pros:** Avoids scope creep. Every existing scene gets noticeably better. Easier to ship incrementally.
**Cons:** The map layout is fundamentally limited -- one bridge, a 3-tile-wide Danube, no distinct neighborhoods on the Pest side. Polishing bad geometry won't fix the geography problem. The overworld would look nicer but still feel like a small grid, not Budapest.

### Approach B: Breadth-First (Expand Map + New Scenes, Then Polish)

Expand the overworld from 55x35 to 70x45, add two more bridges, widen the Danube to 5 tiles, add new sub-areas (Gellert Hill, thermal baths interior, Danube cruise cutscene). Rework the map layout to feel geographically real. Graphics and animation improvements come along with each new area.

**Pros:** The map would actually feel like Budapest. Multiple bridges, proper river width, distinct neighborhoods. New scenes (thermal bath, river cruise) give more romantic moments.
**Cons:** Massive scope. Expanding the map means rewriting the entire tile grid, walk grid, all NPC positions, all checkpoint positions, all decoration positions, all building positions. High risk of half-finished areas. Performance concern: 70x45 = 3150 tiles with 30+ NPCs and ambient animations.

### Approach C: Strategic Rework (Targeted Map Expansion + Deep Cutscene Overhaul + Animation Layers)

Expand the overworld moderately (65x40), focused on fixing the three biggest geographic problems: (1) Danube too narrow, (2) only one bridge, (3) Pest side has no character. Simultaneously overhaul both cutscenes to be deeply romantic with character sprites, dialogue moments, and cinematic framing. Add animation systems (water reflections, ambient particles, time-of-day lighting) that enhance every scene without needing per-scene custom work. Add 2 new scenes (Danube evening cruise, thermal bath visit) that serve the romantic narrative.

**Pros:** Fixes the real problems without boiling the ocean. Map expansion is targeted (10 more columns, 5 more rows) rather than doubling everything. Cutscene overhaul is the highest-impact change. Animation systems are reusable across all scenes.
**Cons:** Still significant scope. But each piece is independently valuable and can be shipped separately.

---

## 2. Chosen Approach: C (Strategic Rework)

### Justification

1. **The map's geography is the #1 problem.** A 3-tile-wide Danube with one bridge doesn't feel like Budapest. This MUST change, but expanding to 70x45 is overkill. 65x40 gives enough room for a 5-tile Danube, three bridges, and proper Buda/Pest differentiation without performance concerns.

2. **Cutscenes are the #1 romantic opportunity.** The bus ride is a scrolling road with rectangles. The Eye cutscene has no character interaction -- the couple walks to the wheel, disappears, and the wheel spins while colors change. These should be the emotional highlights of Budapest. Overhauling them with character sprites, dialogue beats, and cinematic composition is the highest ROI change.

3. **Animation systems compound.** A water reflection system, ambient particle emitter, and warm-lighting overlay each benefit every scene. Building these as reusable systems (not per-scene hacks) means the Jewish Quarter, Ruin Bar, and Airbnb all get better automatically.

4. **Two new cutscene scenes** (Danube cruise, thermal bath) are high-impact additions that use the same cutscene patterns already established. They don't require new base classes or systems.

---

## 3. Self-Critique

**Critique 1: "65x40 means rewriting the entire tile grid from scratch."**
Yes. The procedurally-generated tile grid (`budapestTileGrid`) is a function of (x, y) coordinates. Every conditional in that function needs to shift. Every NPC position, checkpoint position, decoration, and building position must be recalculated. This is ~200 lines of coordinate changes in `budapestMap.ts`. It's tedious but not architecturally risky -- it's data, not logic.

**Critique 2: "Character sprites in cutscenes -- how? The couple doesn't exist as a rendered concept in cutscenes."**
Currently, the Eye cutscene represents the couple as two colored rectangles (blue and pink, lines 61-65). These need to become proper sprites: a `bp-cutscene-couple` texture (side-by-side, ~48x32) and individual `bp-cutscene-player` / `bp-cutscene-partner` textures (32x48 each) with multiple poses. All generated procedurally in `BudapestTextures.ts`. The existing `drawNPCBase` helper already draws 48x48 humanoid sprites -- adapt it for cutscene scale.

**Critique 3: "Reusable water reflection system sounds over-engineered."**
It doesn't need to be complex. The Danube water reflection is just: for each water tile, render a flipped, darkened, alpha-blended copy of whatever is above it. In practice, this means: place semi-transparent blue rectangles with a sine-wave distortion tween on water tiles. The existing `addDanubeWaves()` already does half of this (tweening wave sprites). Extend it, don't replace it.

**Critique 4: "Two new cutscene scenes is scope creep."**
The existing cutscene pattern (pure Phaser scene, timed phases, skip button, camera fade transition) is well-established. A new cutscene scene is ~100-150 lines -- significantly less than a new overworld or interior. The Danube cruise and thermal bath are the two most romantic Budapest activities. Cutting them would leave Budapest feeling like "one Ferris wheel ride and some walking around."

**Critique 5: "Warm lighting overlay across all scenes -- won't that clash with the existing color palettes?"**
Valid concern. The warm-lighting effect should be optional and scene-controlled. Each scene sets its `ambientTint` (e.g., `0xFFEECC` for warm sunset, `0xCCDDFF` for cool evening). The overworld defaults to neutral. Only cutscenes and specific story moments trigger warm tinting. Implementation: a single semi-transparent rectangle overlay at depth 999, controlled via tween.

---

## 4. Addressing Critiques - Revised Design

- **Map expansion:** 65x40 (from 55x35). Danube widens from 3 to 5 tiles (y=10-14). Three bridges instead of one. Buda side gets Gellert Hill area. Pest side gets Andrassy Avenue corridor. All positions recalculated systematically.
- **Character sprites:** Add 4 new cutscene-specific textures to `BudapestTextures.ts`: couple-standing, couple-sitting, couple-looking-out (for bus), couple-close-up (for Eye apex). Reuse `drawNPCBase` patterns.
- **Water system:** Extend existing `addDanubeWaves()` with reflection overlays and boat sprites. No new system class.
- **New scenes:** DanubeCruiseScene and ThermalBathScene, both following the BudapestEyeScene pattern (timed phases, skip button).
- **Ambient lighting:** Simple rectangle overlay, controlled per-scene. No new system class -- just a helper function in the cutscene scenes.

---

## 5. Detailed Design

---

### A. MAP IMPROVEMENTS

#### A1. Expand Overworld to 65x40

**Current:** 55x35 tiles (1760x1120px)
**New:** 65x40 tiles (2080x1280px)

**Files changed:**
- `src/game/scenes/budapest/budapestMap.ts` -- rewrite tile grid, walk grid, all positions (LARGE)
- `src/game/scenes/budapest/BudapestOverworldScene.ts` -- update `getConfig()` dimensions (SMALL)

**New geographic layout (y-axis, top to bottom):**

```
y=0-5:    Buda Castle + Fisherman's Bastion (elevated stone, x=0-15)
y=0-5:    Gellert Hill (NEW - forested hill, x=0-8, steep terrain)
y=6-9:    Buda riverside - grass slopes + promenade path
y=10-14:  DANUBE RIVER (5 tiles wide, was 3)
y=10-14:  Liberty Bridge at x=8-12 (NEW)
y=10-14:  Chain Bridge at x=28-32 (shifted from x=22-26)
y=10-14:  Margaret Bridge at x=50-54 (NEW)
y=15:     Pest riverside promenade (walkable sidewalk)
y=16:     Riverside road
y=17-18:  Parliament zone (x=18-28, shifted for new proportions)
y=19:     Tram track (Tram 2 route along river)
y=20:     Road
y=21-25:  Andrassy Avenue corridor (NEW - x=35-55, diagonal boulevard feel)
y=21-25:  Erzsebet Square / Eye area (x=30-38)
y=26-30:  Jewish Quarter entrance area (x=44-52)
y=26-30:  Southern restaurants + shops (x=10-25)
y=31-34:  Airbnb area (x=38-42)
y=35-39:  Southern park + thermal baths entrance (NEW)
y=35-39:  Transport hub area
```

**Scope:** LARGE -- this is ~150 lines of tile grid logic + 50 lines of walk grid + repositioning all 25 NPCs, 10 checkpoints, 30 decorations, 14 buildings.

#### A2. Widen Danube to 5 Tiles with Enhanced Water

**Current:** 3-tile river (y=10-12), uniform blue.
**New:** 5-tile river (y=10-14) with depth variation.

Tile grid changes in `budapestMap.ts`:
- y=10: shallow water (lighter blue, edge foam) -- new tile type `WaterShallow`
- y=11-13: deep water (dark blue, ripple pattern) -- existing `Water` type
- y=14: shallow water (lighter blue, edge foam)

**New terrain tile type:**
```typescript
WaterShallow = 10,  // add to BudapestTileType enum
```

**New terrain texture frame (Frame 10)** in `generateBudapestTerrain()`:
- Lighter blue (#2A5A8A) base
- Foam/edge pattern -- white pixel scatter along one edge
- Visible riverbed stones (small gray dots under semi-transparent blue)

**Files changed:**
- `budapestMap.ts` -- add enum value, update tile grid (MEDIUM)
- `BudapestTextures.ts` -- add Frame 10 to terrain spritesheet, widen canvas from 320 to 352 (MEDIUM)
- `BudapestOverworldScene.ts` -- update `addDanubeWaves()` for 5-row river (SMALL)

#### A3. Three Bridges

**Current:** One bridge (Chain Bridge at x=22-26).
**New:** Three bridges.

| Bridge | Tile Range | Width | Character |
|--------|-----------|-------|-----------|
| Liberty Bridge (Szabadsag hid) | x=8-12, y=10-14 | 5 tiles | Green iron, art nouveau |
| Chain Bridge (Szechenyi Lanchid) | x=28-32, y=10-14 | 5 tiles | Stone + chains, lion statues |
| Margaret Bridge (Margit hid) | x=50-54, y=10-14 | 5 tiles | Wider, modern feel |

Each bridge needs:
1. Bridge tile type already exists (Frame 6) -- reuse for all three
2. Unique bridge pillar/decoration sprites for visual differentiation
3. Walk grid: bridge tiles are walkable, surrounding water is not
4. NPCs walking across bridges (existing pattern, new walkPaths)

**New decoration textures in `BudapestTextures.ts`:**
- `deco-liberty-bridge-pillar` (32x48) -- green iron framework, art nouveau arches
- `deco-margaret-bridge-pillar` (32x48) -- stone with wider shape
- Keep existing `deco-bp-chain-bridge-pillar`

**New decorations in `budapestMap.ts`:**
```typescript
{ type: 'liberty-bridge-pillar', tileX: 8, tileY: 10 },
{ type: 'liberty-bridge-pillar', tileX: 12, tileY: 10 },
{ type: 'margaret-bridge-pillar', tileX: 50, tileY: 10 },
{ type: 'margaret-bridge-pillar', tileX: 54, tileY: 10 },
```

**New checkpoint zones:**
```typescript
{ id: 'bp_liberty_bridge', centerX: ..., centerY: ..., radius: 56, promptText: 'Liberty Bridge' },
{ id: 'bp_margaret_bridge', centerX: ..., centerY: ..., radius: 56, promptText: 'Margaret Bridge' },
```

**Files changed:**
- `budapestMap.ts` -- tile grid, walk grid, decorations, checkpoints (MEDIUM)
- `BudapestTextures.ts` -- 2 new decoration textures (~60 lines each) (MEDIUM)
- `BudapestOverworldScene.ts` -- new checkpoint handlers (dialog about each bridge) (SMALL)

#### A4. Gellert Hill Area (New Buda-Side Landmark)

**Location:** x=0-8, y=0-5 (top-left, next to/below Buda Castle)

A forested hill with winding paths. At the summit (x=4, y=1), the Citadella viewpoint. This area uses existing Grass + ParkPath tile types with steeper visual treatment.

**New building texture:** `building-citadella` (128x64) -- star-shaped fortress silhouette on hilltop.

**New checkpoint:**
```typescript
{ id: 'bp_gellert_hill', centerX: ..., centerY: ..., radius: 56, promptText: 'Gellert Hill Viewpoint' }
```

Checkpoint handler: dialog about the panoramic view, references to the couple enjoying it together.

**Files changed:**
- `budapestMap.ts` -- tile grid expansion, new building, new decorations (trees, benches along path), new checkpoint (MEDIUM)
- `BudapestTextures.ts` -- `building-citadella` texture (~40 lines) (SMALL)
- `BudapestOverworldScene.ts` -- new checkpoint handler (SMALL)

#### A5. Andrassy Avenue Corridor

**Location:** x=35-55, y=21-25

A wide boulevard with tree-lined sidewalks, inspired by the real Andrassy ut. Uses existing Cobblestone, Sidewalk, and Road tiles in a distinctive pattern:
- x=35 and x=55: Sidewalk
- x=36-37 and x=53-54: tree-lined strips (Grass with `bp-tree` decorations at regular intervals)
- x=38-52: alternating Road and Sidewalk

**New decorations:**
- Row of `bp-tree` at x=36, y=21-25 (every tile) and x=54, y=21-25
- `bp-lamp` at regular intervals along sidewalks
- `bp-cafe-table` clusters at y=22 and y=24

**New building:** `building-opera-house` (128x64) at approximately x=42, y=21 -- the Hungarian State Opera House.

**New checkpoint:**
```typescript
{ id: 'bp_opera', centerX: ..., centerY: ..., radius: 56, promptText: 'Opera House' }
```

**Files changed:**
- `budapestMap.ts` -- tile grid, decorations, buildings, checkpoint (MEDIUM)
- `BudapestTextures.ts` -- `building-opera-house` texture (~50 lines) (SMALL)
- `BudapestOverworldScene.ts` -- checkpoint handler (SMALL)

#### A6. Thermal Baths Entrance

**Location:** x=5-12, y=35-39 (bottom-left area of expanded map)

A plaza area with the Gellert Baths building facade. Steam particle effects rising from the building.

**New building:** `building-gellert-baths` (192x96) -- art nouveau facade, arched entrance, dome.

**New checkpoint:**
```typescript
{ id: 'bp_thermal_baths', centerX: ..., centerY: ..., radius: 56, promptText: 'Visit Thermal Baths?' }
```

This checkpoint triggers the new ThermalBathScene (see Section E).

**Files changed:**
- `budapestMap.ts` -- tile grid, building, decorations (steam vents, benches), checkpoint (MEDIUM)
- `BudapestTextures.ts` -- `building-gellert-baths` texture (~70 lines) (MEDIUM)
- `BudapestOverworldScene.ts` -- checkpoint handler (SMALL)

---

### B. CUTSCENE IMPROVEMENTS

#### B1. Bus Ride Overhaul

**Current:** 10 seconds. Scrolling road, rectangle buildings, color shift, "Arriving in Budapest..." text. No characters visible. No emotion.

**New design:** 20 seconds. Five cinematic phases with character sprites, dialogue, and environmental storytelling.

**Phase 1: Departure (0-4s)**
- Camera shows bus interior frame (use existing `bp-bus-interior-frame` texture)
- Through the window: green suburban landscape scrolling left
- NEW: Couple sprite visible in bottom-center, sitting side by side (`bp-cutscene-bus-couple`, 64x48)
- Partner sprite leans head on player's shoulder (baked into the texture, not animated)
- Dialogue text fades in: *"This is going to be amazing..."* (partner)

**Phase 2: Countryside (4-8s)**
- Scenery transitions: green fields -> scattered houses -> denser buildings
- NEW: Scrolling silhouette layer at different speed (parallax depth)
  - Background layer: distant hills, slow scroll
  - Midground layer: buildings with windows, medium scroll
  - Foreground layer: road markings + nearby trees, fast scroll
- Warm golden light filter gradually appears (afternoon sun)

**Phase 3: City Approach (8-14s)**
- Buildings get taller, more colorful (Budapest's pastel facades)
- NEW: Danube river appears through gaps between buildings -- a flash of blue
- NEW: Parliament dome silhouette visible in the distance (reuse `budapest-skyline` texture, scrolling slowly)
- Dialogue text: *"Look! Is that the Parliament?"* (player)
- Brief pause, then: *"It's even more beautiful than I imagined."* (partner)

**Phase 4: Crossing the Danube (14-18s)**
- Bus crosses a bridge -- window view shows wide river below
- Skyline visible across the water
- Golden particles floating (like the Eye scene's golden particle effect)
- Color palette shifts to warm sunset tones
- Dialogue: *"Welcome to Budapest."* (no attribution -- ambient)

**Phase 5: Arrival (18-20s)**
- Bus slows down (scrolling speed decreases via eased tween)
- City sounds implied by visual density
- Fade to black, transition to BudapestOverworldScene

**New textures needed in `BudapestTextures.ts`:**
- `bp-cutscene-bus-couple` (64x48) -- two figures sitting side by side, one leaning on the other. Built using `drawNPCBase`-derived helpers at smaller scale.
- `bp-bus-building-pastel-1` through `bp-bus-building-pastel-4` (64x96 each) -- colorful Budapest apartment facades in pink, yellow, ochre, mint green. Higher detail than existing `bp-bus-building-1`: visible balconies, flower boxes, ornate window frames.
- `bp-bus-countryside` (128x96) -- green hills with scattered houses and church steeple.
- `bp-bus-danube-flash` (128x64) -- blue river strip seen between building gaps.

**New dialogue system for cutscenes:**
Not a full dialogue system -- just styled text with fade-in/fade-out tweens. Pattern:
```typescript
private showCutsceneDialogue(text: string, speaker: 'player' | 'partner' | 'ambient', y: number): void {
  const color = speaker === 'player' ? '#88BBFF' : speaker === 'partner' ? '#FFAACC' : '#FFFFFF';
  const textObj = this.add.text(w / 2, y, text, {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '11px',
    color,
    wordWrap: { width: w * 0.6 },
    align: 'center',
  }).setOrigin(0.5).setDepth(30).setAlpha(0);
  this.tweens.add({ targets: textObj, alpha: 1, duration: 600 });
  this.time.delayedCall(3000, () => {
    this.tweens.add({ targets: textObj, alpha: 0, duration: 400, onComplete: () => textObj.destroy() });
  });
}
```

**Files changed:**
- `BudapestBusRideScene.ts` -- complete rewrite (~200 lines, up from 116) (LARGE)
- `BudapestTextures.ts` -- 6 new textures in `generateBudapestCutsceneSprites()` (~180 lines) (LARGE)

**Dependencies:** None. Self-contained rewrite.

#### B2. Budapest Eye Overhaul

**Current:** 25 seconds. 5 phases: boarding (rectangles walk to wheel), ascending (wheel rotates), sunset (color overlays), twilight (purple deepens), exit (fade out). No character interaction. No dialogue. The couple is represented by two tiny colored rectangles that vanish after boarding.

**New design:** 35 seconds. 7 phases with character interaction, dialogue, and deeply romantic atmosphere.

**Phase 1: Approaching (0-3s)**
- Letterbox bars slide in from top and bottom (black rectangles, ~15% height each) -- cinematic framing
- Player and partner sprites walk toward the wheel from bottom of screen
- They hold hands (single `bp-cutscene-couple-walking` sprite, 48x48)
- Background: Erzsebet Square plaza, evening colors

**Phase 2: Boarding (3-6s)**
- Couple sprite reaches the cabin at bottom of wheel
- Brief animation: cabin door "opens" (cabin sprite swaps to `bp-eye-cabin-open`)
- Couple sprite replaced by cabin sprite with two visible silhouettes inside
- Dialogue: *"Ready?"* / *"Always."*

**Phase 3: Ascending (6-14s)**
- Wheel rotates, cabin orbits upward (existing mechanic, keep the orbit math)
- Sky color shifts from evening blue to golden sunset (existing, but improved)
- NEW: As cabin rises, the view "reveals" the cityscape below -- a parallax layer of the skyline scrolls down slightly, creating the illusion of rising above the city
- Cabin sprite now shows `bp-eye-cabin-couple` -- tiny silhouettes visible in window
- Ambient golden particles begin (existing, increase count to 25)

**Phase 4: Sunset Apex (14-20s) -- THE MOMENT**
- Cabin reaches the top of the wheel
- Wheel rotation pauses (tween pauseOnComplete)
- Sky is deep sunset: orange -> pink -> gold gradient
- NEW: Sun disc visible at horizon (simple circle, `0xFFAA44`, at y=70%)
- NEW: Danube below reflects sunset colors (river rectangle shifts to `0xFF8855`)
- NEW: Parliament silhouette backlit by sunset glow (existing skyline texture with warm tint)
- Dialogue sequence with pauses:
  - *"I can see the whole city..."* (partner, 14s)
  - *"Look at the Danube... it's on fire."* (player, 16s)
  - 2 second pause -- just the sunset and particles
  - *"I don't want this moment to end."* (partner, 19s)
- Particle count peaks: 40 golden sparkles floating upward

**Phase 5: Twilight (20-26s)**
- Sky deepens to purple-blue
- City lights begin appearing on the skyline (tiny yellow dots tween to alpha 1)
- Stars appear in the upper sky (white dots, slow twinkle alpha tween)
- Cabin begins descending (wheel rotation resumes slowly)
- Dialogue: *"We should come back here every trip."* (player, 22s)

**Phase 6: Descent (26-31s)**
- Cabin returns to bottom
- Sky is deep twilight/early night
- String lights on the wheel illuminate (existing cabin sprites get tiny yellow glow dots)
- City below is now a sea of warm lights
- Peaceful, no dialogue -- let the visuals land

**Phase 7: Exit (31-35s)**
- Couple sprite exits cabin (walking away, `bp-cutscene-couple-walking`)
- Letterbox bars slide away
- Fade to black
- Return to BudapestOverworldScene

**New textures needed:**
- `bp-cutscene-couple-walking` (48x48) -- two figures side by side, hand-in-hand silhouettes
- `bp-cutscene-couple-close` (64x48) -- closer view, upper bodies, for dialogue moments
- `bp-eye-cabin-open` (16x16) -- cabin with visible opening
- `bp-eye-cabin-couple` (16x16) -- cabin with two tiny silhouettes visible in window
- `bp-eye-sun-disc` (32x32) -- warm orange-gold circle with soft edge glow

**Files changed:**
- `BudapestEyeScene.ts` -- complete rewrite (~300 lines, up from 189) (LARGE)
- `BudapestTextures.ts` -- 5 new textures (~120 lines) (MEDIUM)

**Dependencies:** None. Self-contained.

#### B3. Letterbox + Dialogue Helpers (Shared Cutscene Utilities)

Both cutscene overhauls need letterbox bars and dialogue text. Extract these into a shared utility rather than duplicating.

**New file:** `src/game/scenes/budapest/cutsceneHelpers.ts`

Contents:
```typescript
// addLetterbox(scene, height) -- returns { top, bottom } rectangles at depth 50
// showDialogue(scene, text, speaker, opts) -- styled text with fade tween
// removeLetterbox(scene, top, bottom) -- tween slide-out
```

~40 lines. Keeps cutscene scenes focused on choreography, not UI boilerplate.

**Files changed:**
- New file: `src/game/scenes/budapest/cutsceneHelpers.ts` (SMALL)
- `BudapestBusRideScene.ts` -- import helpers (already being rewritten)
- `BudapestEyeScene.ts` -- import helpers (already being rewritten)

---

### C. ANIMATION IMPROVEMENTS

#### C1. Enhanced Danube Water (Overworld)

**Current:** `addDanubeWaves()` places static wave-foam images every 8 tiles across 3 rows, tweens them horizontally with sine easing and alpha pulsing.

**Improvements:**
1. **Increase wave density:** Every 4 tiles instead of 8 (river is now 5 rows wide = more surface area)
2. **Stagger wave timing:** Three layers of waves at different speeds and phases
   - Surface ripples: fast (1500ms), short horizontal drift (8px)
   - Mid-depth waves: medium (2500ms), moderate drift (16px) -- existing behavior
   - Deep current: slow (4000ms), long drift (24px), lower alpha (0.15)
3. **River color variation:** Add darker patches via additional tinted rectangles that slowly drift, creating depth illusion
4. **Reflection shimmer:** Intermittent bright pixel-size sparkles on the water surface. Tween from alpha 0 -> 0.8 -> 0, random positions, 10 active at any time.

**Implementation:**
```typescript
private addDanubeWaves(): void {
  // Layer 1: deep current (slowest, lowest alpha)
  for (const wy of [11, 12, 13]) {
    for (let wx = 0; wx < MAP_WIDTH; wx += 6) {
      // dark blue rectangle, slow rightward drift
    }
  }
  // Layer 2: surface ripples (existing behavior, increased density)
  for (const wy of [10, 11, 12, 13, 14]) {
    for (let wx = 0; wx < MAP_WIDTH; wx += 4) {
      // existing wave-foam image with tween
    }
  }
  // Layer 3: sparkle reflections
  this.time.addEvent({
    delay: 300,
    loop: true,
    callback: () => this.spawnWaterSparkle(),
  });
}
```

**Files changed:**
- `BudapestOverworldScene.ts` -- rewrite `addDanubeWaves()`, add `spawnWaterSparkle()` (MEDIUM)

**Dependencies:** Map expansion (A1) must complete first to know final river coordinates.

#### C2. Danube Boats

**Current:** No boats on the river.

**New:** 2-3 boats slowly moving along the Danube, similar to how vehicles move along roads.

Boat types:
- `budapest-river-boat` (48x16) -- white pleasure cruiser, small windows, Hungarian flag
- `budapest-barge` (64x12) -- flat cargo barge, dark hull

Implementation: same pattern as `addVehicles()` -- sprites that tween from one side of the map to the other, repeating. Boats move MUCH slower than cars (duration: 40000-60000ms). Depth set to render on top of water tiles but below bridges.

```typescript
private addBoats(): void {
  const boatDefs = [
    { key: 'budapest-river-boat', y: 12, dir: 1, delay: 0, dur: 50000 },
    { key: 'budapest-barge', y: 11, dir: -1, delay: 15000, dur: 60000 },
    { key: 'budapest-river-boat', y: 13, dir: 1, delay: 30000, dur: 45000 },
  ];
  // Same tween pattern as addVehicles()
}
```

**New textures in `BudapestTextures.ts`:**
- `budapest-river-boat` (48x16) -- white hull, blue windows, red chimney, tiny Hungarian flag
- `budapest-barge` (64x12) -- dark hull, flat deck, cargo containers

**Files changed:**
- `BudapestOverworldScene.ts` -- add `addBoats()`, call from `onCreateExtras()` (SMALL)
- `BudapestTextures.ts` -- 2 new vehicle textures in `generateBudapestVehicles()` (~60 lines) (SMALL)

#### C3. Pigeon Improvements

**Current:** 5 pigeons in Erzsebet Square area, tween position with sine easing. They just drift around.

**Improvements:**
1. **Pecking animation:** Pigeons alternate between drifting and "pecking" (brief y-bounce tween, 3 quick dips over 500ms)
2. **Scatter behavior:** When the player walks within 2 tiles of a pigeon cluster, all pigeons in that cluster tween rapidly upward and sideways (y -= 40, x += random, alpha -> 0 over 600ms), then reset after 3 seconds
3. **More locations:** Add pigeons near bridges, Parliament plaza, and the new Gellert Hill area
4. **Pigeon texture improvement:** Current `deco-bp-pigeon` is a single sprite. Add `deco-bp-pigeon-peck` variant (head angled down)

**Files changed:**
- `BudapestOverworldScene.ts` -- rewrite `addPigeons()` with scatter behavior (~40 lines) (MEDIUM)
- `BudapestTextures.ts` -- `deco-bp-pigeon-peck` texture (SMALL)

**Dependencies:** Requires player position tracking (already available via `this.player.getPosition()` in `update()`).

#### C4. Street Musician Animation

**Current:** `bp-street-performer` NPC at (27, 20) with `idle` behavior. Just stands there.

**New:** The street performer gets a subtle "playing" animation -- a back-and-forth sway tween.

Implementation: After NPCs are created in `onCreateExtras()`, find the performer NPC sprite and apply a continuous sway tween:
```typescript
// In onCreateExtras, after NPC system creates sprites:
const performerSprite = this.npcSystem.getNPCSprite('bp-street-performer');
if (performerSprite) {
  this.tweens.add({
    targets: performerSprite,
    angle: { from: -3, to: 3 },
    duration: 800,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
}
```

Also add musical note particle effects: small `deco-bp-music-note` sprites that float upward from the performer's position, similar to the pigeon drift tweens but moving up with fade.

**New texture:** `deco-bp-music-note` (8x8) -- tiny eighth note symbol.

**Files changed:**
- `BudapestOverworldScene.ts` -- add performer animation in `onCreateExtras()` (~15 lines) (SMALL)
- `BudapestTextures.ts` -- `deco-bp-music-note` texture (~15 lines) (SMALL)

**Dependencies:** Requires NPCSystem to expose a `getNPCSprite(id)` method. Check if this already exists; if not, add a simple getter (~3 lines in NPCSystem).

#### C5. Steam Effects at Thermal Baths

**Location:** Near the Gellert Baths building (new, from A6).

Periodically spawn small white semi-transparent circles that float upward and fade out. 3-5 active at any time.

```typescript
private addBathSteam(): void {
  const bathX = 8 * TILE_SIZE;
  const bathY = 35 * TILE_SIZE;
  this.time.addEvent({
    delay: 600,
    loop: true,
    callback: () => {
      const steam = this.add.circle(
        bathX + Math.random() * 64,
        bathY,
        4 + Math.random() * 4,
        0xFFFFFF
      ).setAlpha(0.3).setDepth(-4);
      this.tweens.add({
        targets: steam,
        y: bathY - 30 - Math.random() * 20,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 2000 + Math.random() * 1000,
        onComplete: () => steam.destroy(),
      });
    },
  });
}
```

**Files changed:**
- `BudapestOverworldScene.ts` -- add `addBathSteam()`, call from `onCreateExtras()` (SMALL)

**Dependencies:** Thermal Baths building (A6) must exist.

#### C6. Ambient Lamplight Glow

**Current:** Lamp decorations (`deco-bp-lamp`) are static sprites.

**New:** Each lamp gets a soft pulsing glow effect -- a semi-transparent yellow circle rendered behind the lamp sprite that slowly pulses alpha between 0.1 and 0.25.

Implementation in `onCreateExtras()`, after decorations are placed:
```typescript
BUDAPEST_DECORATIONS.filter(d => d.type === 'bp-lamp').forEach(deco => {
  const pos = tileToWorld(deco.tileX, deco.tileY);
  const glow = this.add.circle(pos.x, pos.y - 10, 12, 0xFFEE88)
    .setAlpha(0.15)
    .setDepth(-11); // behind the lamp sprite
  this.tweens.add({
    targets: glow,
    alpha: 0.25,
    duration: 2000 + Math.random() * 1000,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
});
```

**Files changed:**
- `BudapestOverworldScene.ts` -- add glow loop in `onCreateExtras()` (~15 lines) (SMALL)

**Dependencies:** None.

#### C7. Vehicle Improvements

**Current:** 10 vehicle tweens (2 trams, 2 buses, 6 cars) running left-to-right or right-to-left across fixed Y rows. Simple linear easing. Vehicles pop back to start on repeat.

**Improvements:**
1. **Smooth respawn:** Instead of `onRepeat: () => { v.x = startX; }`, add a brief delay between repeats so vehicles don't teleport back instantly. Use `repeatDelay: 3000 + Math.random() * 5000` for natural spacing.
2. **More vehicles:** Add 2-3 more car definitions to increase traffic density on the expanded map.
3. **Riverside road (y=16):** Add a dedicated "riverside road" vehicle set that only runs between the bridges, not the full map width. Start and end positions are bridge edges.
4. **Tram stop pause:** Trams briefly "pause" at tram stop x-positions. Implementation: chain two tweens (start -> tram stop, pause 1500ms, tram stop -> end) instead of one continuous tween.

**Files changed:**
- `BudapestOverworldScene.ts` -- rewrite `addVehicles()` with improved patterns (~60 lines) (MEDIUM)

**Dependencies:** Map expansion (A1) for updated road positions.

---

### D. GRAPHICS IMPROVEMENTS

#### D1. Improved Building Textures

**Current buildings with improvement targets:**

| Building | Current Size | Issues | Improvements |
|----------|-------------|--------|-------------|
| Parliament | 256x96 | Good but flat; dome lacks depth | Add gradient shading to dome, add flag at top, add riverside stairs detail |
| Fisherman's Bastion | 256x96 | Turrets look same | Vary turret heights, add arch shading, add tiny cross on each tip |
| Buda Castle | 256x96 | Hill is flat gradient | Add terraced garden detail, deeper window recesses, vine greenery on walls |
| Dohany Synagogue | 160x96 | Onion domes too small | Enlarge domes, add Star of David detail, add rose window |
| Budapest Eye | 96x96 | Functional but plain | Add ground lighting glow around base, add ticket booth near base |

**Specific changes per building in `generateBudapestBuildings()`:**

**Parliament improvements (~20 additional lines):**
- Add shading gradient on dome: darker at edges, lighter at center (2-pass circle draw)
- Add 2px Hungarian flag at dome peak (red-white-green horizontal stripes)
- Add a row of tiny arches below the dome (decorative arcade, ~3px tall arches)
- Riverside stairs: 3 horizontal lines of decreasing width below the foundation

**Fisherman's Bastion improvements (~15 additional lines):**
- Alternate turret heights: center turret tallest, flanking ones shorter
- Add tiny cross (2px) at each turret tip
- Improve arcade arches: fill with lighter shade instead of plain color

**Buda Castle improvements (~15 additional lines):**
- Add vine/greenery patches: small green pixel clusters on wall surface
- Deepen window recesses: 1px dark border around each window
- Add terrace garden below castle: small green rectangles with flower-color dots

**Synagogue improvements (~15 additional lines):**
- Enlarge onion domes from r=5 to r=7
- Add Star of David: 6-point pattern (6 lines radiating from center) on facade between towers
- Add rose window: circle of colored dots (r=6) at center-top of facade

**Budapest Eye improvements (~10 additional lines):**
- Ground glow: semi-transparent yellow circle (r=20) below the wheel structure
- Ticket booth: small 8x6 rectangle near base with "TICKETS" implied by color contrast

**Files changed:**
- `BudapestTextures.ts` -- modifications within `generateBudapestBuildings()` (~75 additional lines total) (MEDIUM)

#### D2. New Building Textures

For the new landmarks added in the map expansion:

**`building-citadella` (128x64):**
- Star-shaped fortress outline (pentagon with angular bastions)
- Stone gray walls (#7A7A6A)
- Hungarian flag at center
- Lookout platform (balustrade line at top)

**`building-opera-house` (128x64):**
- Classical facade: columns (vertical rectangles), pediment (triangle at top)
- Warm stone color (#C8B890)
- Arched entrance with red awning
- Balcony with ornate railing detail
- "OPERA" implied by the distinctive architectural shape

**`building-gellert-baths` (192x96):**
- Art nouveau facade: flowing lines, organic shapes
- Central dome (larger than Parliament's spire)
- Arched entrance with pool-blue accent
- Two side wings with large windows
- Steam effect area above (sprites handle the animation, texture just has the building)

**Files changed:**
- `BudapestTextures.ts` -- 3 new building textures in `generateBudapestBuildings()` (~180 lines) (LARGE)

#### D3. Couple Character Textures for Overworld

**Current:** The couple NPC (`bp-couple`) is a single walking NPC texture. The player and partner have their own sprites but there's no "together" visual for romantic moments.

**New textures for overworld romantic moments:**
- `deco-bp-couple-bench` (32x32) -- two small figures sitting on a bench together (seen as decorative element near viewpoints)
- `deco-bp-heart` (8x8) -- tiny pixel heart, used as floating particle near romantic checkpoints

These are decorative, not functional. Place them at viewpoints (Gellert Hill, Chain Bridge, Fisherman's Bastion) to reinforce the romantic theme.

**Files changed:**
- `BudapestTextures.ts` -- 2 new decoration textures (~40 lines) (SMALL)
- `budapestMap.ts` -- add decorations at romantic viewpoints (SMALL)

#### D4. Improved Water Tile Texture

**Current:** Frame 5 (Water) is a dark blue (#1A3A6A) with sine-wave ripple pattern and scattered light highlights.

**Improvements:**
- Add a second layer of wave pattern at a different angle/frequency for more complex ripple texture
- Add subtle green-blue color variation (the Danube isn't uniformly dark blue -- it shifts between blue-gray and blue-green)
- Add occasional white pixel clusters (foam spots where water surface catches light)
- Make the new WaterShallow (Frame 10) tile distinctly different: visible riverbed stones (tiny brown-gray dots), lighter blue, edge foam line

**Files changed:**
- `BudapestTextures.ts` -- modify Frame 5, add Frame 10 in `generateBudapestTerrain()` (~30 additional lines) (SMALL)

#### D5. Jewish Quarter String Light Enhancement

**Current:** `bp-string-lights` decoration exists but is a static sprite.

**New:** The string lights texture gets actual individual bulb colors. Then in the scene, a subtle tween makes them "twinkle" -- each string light decoration gets a child circle sprite that pulses alpha.

**Texture improvement:** Redraw `deco-bp-string-lights` (32x32):
- Diagonal line (wire) from top-left to bottom-right
- Colored bulb dots along the wire: alternating warm white, yellow, orange, pink
- Each bulb is 2x2 pixels with a 1px glow halo

**Animation (JewishQuarterScene):**
```typescript
// In onCreateExtras(), after decorations:
JQ_DECORATIONS.filter(d => d.type === 'bp-string-lights').forEach(deco => {
  const pos = tileToWorld(deco.tileX, deco.tileY);
  for (let i = 0; i < 5; i++) {
    const bulb = this.add.circle(
      pos.x - 8 + i * 5, pos.y - 4 + i * 3,
      2, [0xFFEE88, 0xFFCC44, 0xFF8844, 0xFFAACC][i % 4]
    ).setAlpha(0.5).setDepth(-9);
    this.tweens.add({
      targets: bulb,
      alpha: { from: 0.4, to: 0.9 },
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 800,
    });
  }
});
```

**Files changed:**
- `BudapestTextures.ts` -- update `deco-bp-string-lights` texture (~20 lines modified) (SMALL)
- `JewishQuarterScene.ts` -- add twinkling bulb animation in `onCreateExtras()` (~20 lines) (SMALL)

---

### E. NEW CONTENT

#### E1. Danube Evening Cruise (New Cutscene Scene)

**New file:** `src/game/scenes/budapest/DanubeCruiseScene.ts`

**Trigger:** New checkpoint on the Pest riverside promenade near Parliament:
```typescript
{ id: 'bp_danube_cruise', centerX: ..., centerY: ..., radius: 56, promptText: 'Take an evening cruise?' }
```

**Scene design:** 30 seconds, 5 phases. Pure cutscene (Phaser scene, no tilemap).

**Phase 1: Boarding (0-4s)**
- Dock view: stone promenade at bottom, dark Danube water filling most of screen
- White cruise boat at dock (large version of `budapest-river-boat`, ~200x60)
- Couple walks onto the boat
- Letterbox bars in
- Dialogue: *"I've always wanted to do this."*

**Phase 2: Departure (4-8s)**
- Boat moves slowly right (tween x)
- Promenade scrolls away on left
- Parliament building (large skyline version) slides into view from right
- Parliament is lit up: warm yellow windows, floodlight glow (orange tint overlay on building texture)
- Water reflects the warm light: orange/gold rectangles on water surface, alpha pulsing

**Phase 3: Under the Bridges (8-16s)**
- Chain Bridge appears ahead, passes overhead
  - Visual: bridge structure at top of screen, catenary curves, lion silhouettes on pillars
  - Brief shadow as boat passes under (screen darkens 20% for 1 second)
- Margaret Bridge in distance (smaller silhouette)
- Dialogue: *"The city looks so different from the water."* (14s)
- Stars in the sky: 20+ tiny white dots with gentle alpha twinkle

**Phase 4: City of Lights (16-24s)**
- Both riverbanks visible: buildings on each side with illuminated windows
- Buda Castle on the hill to the right, lit up with floodlights (warm white glow)
- Fisherman's Bastion visible above, also lit
- THE MOMENT: Couple is shown in close-up (`bp-cutscene-couple-close`), facing the city view
- Dialogue:
  - *"It's like the city is made of light."* (partner, 18s)
  - *"Just like you."* (player, 20s)
  - Response pause, then: *"...That was so cheesy."* (partner, 22s)
  - *"You're smiling though."* (player, 23s)

**Phase 5: Return (24-30s)**
- Boat turns (boat sprite flips)
- View of the city receding
- Warm glow fades to cooler blue tones
- Stars multiply
- Dialogue: *"Best night ever."* (partner, 27s)
- Fade to black, return to overworld

**New textures:**
- `bp-cruise-boat` (200x60) -- detailed white cruise boat, deck, windows, flag
- `bp-cruise-parliament-lit` (256x120) -- Parliament with lit windows (yellow pixels in window positions) and warm glow overlay
- `bp-cruise-castle-lit` (200x80) -- Buda Castle with floodlight glow
- `bp-cruise-bridge-overhead` (400x40) -- Chain Bridge view from below, wide catenary curves
- `bp-cutscene-couple-close` (64x48) -- couple upper bodies, facing right (toward city view)

**Files changed:**
- New file: `src/game/scenes/budapest/DanubeCruiseScene.ts` (~250 lines) (LARGE)
- `BudapestTextures.ts` -- 5 new cutscene textures (~200 lines) (LARGE)
- `budapestMap.ts` -- new checkpoint zone (SMALL)
- `BudapestOverworldScene.ts` -- new checkpoint handler: `this.fadeToScene('DanubeCruiseScene')` (SMALL)
- `src/game/main.ts` -- register new scene (SMALL)

#### E2. Thermal Bath Visit (New Cutscene Scene)

**New file:** `src/game/scenes/budapest/ThermalBathScene.ts`

**Trigger:** `bp_thermal_baths` checkpoint (from A6).

**Scene design:** 25 seconds, 4 phases. Warm, dreamy, relaxing atmosphere.

**Phase 1: Entrance (0-5s)**
- Interior of the bath house: ornate columns, tiled floor, steam
- Art nouveau architecture: arched ceiling, mosaic patterns (simple geometric pixel patterns)
- Couple walks in from the left
- Warm golden light suffuses everything (amber tint overlay at alpha 0.15)
- Dialogue: *"Wow... this place is gorgeous."*

**Phase 2: The Pool (5-14s)**
- Camera "moves" (background elements tween) to show the thermal pool
- Turquoise water fills the center of the screen
- Steam rises continuously (white circles floating up, same pattern as C5)
- Ornate columns surround the pool (simple vertical rectangles with capital decorations)
- Couple is shown sitting at the pool edge (new sprite: `bp-cutscene-couple-pool`, feet implied to be in water)
- Water surface has gentle ripple animation (sine-wave horizontal tween on light patches)
- Dialogue:
  - *"The water is SO warm..."* (partner, 8s)
  - *"I could stay here forever."* (player, 11s)

**Phase 3: Relaxation (14-22s)**
- Slow zoom effect (scale tween 1.0 -> 1.05 over 8 seconds, very subtle)
- Steam intensifies slightly
- Light shifts warmer (amber overlay alpha increases from 0.15 to 0.25)
- Stars of light on the water surface (reflections from overhead lamps)
- Dialogue:
  - *"This is hundreds of years old, you know."* (player, 16s)
  - *"Mmm... the Romans knew what they were doing."* (partner, 18s)
  - *"Actually, it was the Ottomans--"* (player, 20s)
  - *"Shhh. Just relax."* (partner, 21s)

**Phase 4: Exit (22-25s)**
- Fade to warm white (instead of black -- feels like emerging into light)
- Return to overworld

**New textures:**
- `bp-bath-interior` (400x300) -- tiled floor, columns, arched ceiling, turquoise pool in center
- `bp-bath-columns` (32x96) -- single ornate column with capital
- `bp-cutscene-couple-pool` (64x32) -- couple sitting at pool edge, seen from behind/side
- `bp-bath-mosaic` (32x32) -- geometric tile pattern for floor decoration

**Files changed:**
- New file: `src/game/scenes/budapest/ThermalBathScene.ts` (~200 lines) (LARGE)
- `BudapestTextures.ts` -- 4 new cutscene textures (~160 lines) (LARGE)
- `BudapestOverworldScene.ts` -- checkpoint handler for `bp_thermal_baths` (SMALL)
- `src/game/main.ts` -- register new scene (SMALL)

#### E3. Ruin Bar Evening Enhancement

The Ruin Bar already exists as an interior scene. Enhance it, don't replace it.

**Improvements:**
1. **Neon sign glow animation:** The `bp-neon-sign` decoration at (19, 11) gets a color-cycling glow effect. Tween between pink, blue, and purple tint. Implementation: circle overlay behind the sign sprite with color tween.

2. **Dance floor lights:** The dance floor room (tileX=4-10, tileY=9-13, floor type `tile_floor`) gets a colored light overlay that slowly shifts colors. Implementation: single large rectangle at low alpha, fillColor tween cycling through party colors.

3. **Ambient chatter particles:** Small text fragments that briefly appear and fade above sitting/idle NPC heads. Not readable text -- just tiny gray text objects that suggest conversation: `"..."`, `"ha!"`, `"!!!"`. One appears every 3 seconds at a random NPC position.

4. **Music notes from the dance area:** Same pattern as C4's street musician, but with more notes and faster timing. Float upward from the dance floor area.

**Files changed:**
- `RuinBarScene.ts` -- add animation effects in `create()` after super.create() (~40 lines) (MEDIUM)
- `BudapestTextures.ts` -- no new textures needed (reuse `deco-bp-music-note`, `deco-bp-neon-sign` already exists)

#### E4. Fisherman's Bastion Viewpoint (Enhanced Checkpoint)

**Current:** Dialog-only checkpoint that shows 3 lines of text.

**New:** A brief "viewpoint moment" -- when triggered, instead of just dialog:
1. Screen zooms out slightly (camera zoom tween 2.0 -> 1.5 over 1 second)
2. A translucent overlay panel appears with a "postcard" view -- the `budapest-skyline` texture rendered at the top of the screen with warm tint
3. Dialog plays over this backdrop
4. 4 new dialog lines that are more romantic:
   - *"Fisherman's Bastion -- seven towers for seven tribes."*
   - *"From up here, you can see the entire city."*
   - *"The Danube, Parliament, everything..."*
   - *"I wish we could freeze this view."*
5. After dialog ends, zoom returns to normal, overlay fades

This pattern could be reused for Gellert Hill and Citadella viewpoints.

**Files changed:**
- `BudapestOverworldScene.ts` -- replace the `bp_fishermans_bastion` checkpoint handler with viewpoint moment (~30 lines) (SMALL)

#### E5. New NPCs for Expanded Areas

**New NPCs for the expanded overworld (to add to `BUDAPEST_NPCS` array):**

```
Bridge NPCs:
- bp-liberty-walker: walk across Liberty Bridge (x=8-12, y=12)
- bp-margaret-jogger: jog across Margaret Bridge (x=50-54, y=12), speed: 70

Gellert Hill:
- bp-hiker: walk along hill path, with walking stick texture
- bp-viewpoint-couple: sit at Citadella viewpoint (idle)

Andrassy Avenue:
- bp-andrassy-walker-1: walk along the boulevard
- bp-andrassy-walker-2: walk opposite direction
- bp-window-shopper: idle, looking at shop building

Thermal Baths area:
- bp-bath-goer: walk toward baths entrance, carrying towel
- bp-bath-exit: walk away from baths (opposite direction)

Riverside (expanded):
- bp-fisherman: sit at riverside (y=15), fishing rod texture
- bp-riverside-couple: walk slowly along promenade (y=15)
```

Total: 11 new NPCs, bringing overworld total from 25 to 36.

**New NPC textures needed:**
- `npc-bp-hiker` (48x48) -- hiking gear, walking stick, hat
- `npc-bp-fisherman` (48x48) -- sitting pose, fishing rod extending to right
- `npc-bp-bath-goer` (48x48) -- casual clothes, towel over shoulder

Other new NPCs can reuse existing textures (`npc-bp-tourist`, `npc-bp-local`, `npc-bp-couple`, etc.)

**Files changed:**
- `budapestMap.ts` -- add 11 NPCDef entries (~50 lines) (MEDIUM)
- `BudapestTextures.ts` -- 3 new NPC textures in `generateBudapestNPCs()` (~90 lines) (MEDIUM)

---

## 6. Implementation Order

The changes have dependencies. Recommended build order:

### Phase 1: Map Foundation (do first, everything depends on it)
1. **A1** - Expand overworld to 65x40
2. **A2** - Widen Danube to 5 tiles
3. **A3** - Three bridges
4. **A4** - Gellert Hill area
5. **A5** - Andrassy Avenue
6. **A6** - Thermal baths entrance

### Phase 2: Graphics (can parallelize with Phase 3)
7. **D1** - Improved building textures
8. **D2** - New building textures
9. **D4** - Improved water tile texture
10. **D3** - Couple character textures

### Phase 3: Cutscene Overhauls (highest emotional impact)
11. **B3** - Cutscene helpers (shared utility)
12. **B1** - Bus ride overhaul
13. **B2** - Budapest Eye overhaul

### Phase 4: Animation Systems (bring the city to life)
14. **C1** - Enhanced Danube water
15. **C2** - Danube boats
16. **C3** - Pigeon improvements
17. **C4** - Street musician animation
18. **C6** - Ambient lamplight glow
19. **C7** - Vehicle improvements

### Phase 5: New Content (builds on everything above)
20. **E1** - Danube Evening Cruise scene
21. **E2** - Thermal Bath Visit scene
22. **E3** - Ruin Bar evening enhancement
23. **E4** - Fisherman's Bastion viewpoint
24. **E5** - New NPCs for expanded areas
25. **D5** - Jewish Quarter string light enhancement
26. **C5** - Steam effects at thermal baths

---

## 7. File Change Summary

### Modified Files

| File | Scope | Changes |
|------|-------|---------|
| `src/game/scenes/budapest/budapestMap.ts` | LARGE | Expand to 65x40, 3 bridges, new areas, new NPCs, new checkpoints, new decorations |
| `src/game/rendering/BudapestTextures.ts` | LARGE | ~20 new textures, ~5 improved textures, new terrain frame |
| `src/game/scenes/budapest/BudapestOverworldScene.ts` | LARGE | Updated dimensions, new animation methods, new checkpoint handlers |
| `src/game/scenes/budapest/BudapestBusRideScene.ts` | LARGE | Complete rewrite with cinematic phases |
| `src/game/scenes/budapest/BudapestEyeScene.ts` | LARGE | Complete rewrite with romantic phases |
| `src/game/scenes/budapest/JewishQuarterScene.ts` | SMALL | String light animations |
| `src/game/scenes/budapest/RuinBarScene.ts` | MEDIUM | Evening ambiance enhancements |
| `src/game/main.ts` | SMALL | Register 2 new scenes |

### New Files

| File | Scope | Purpose |
|------|-------|---------|
| `src/game/scenes/budapest/cutsceneHelpers.ts` | SMALL (~40 lines) | Letterbox bars + dialogue text utilities |
| `src/game/scenes/budapest/DanubeCruiseScene.ts` | LARGE (~250 lines) | Evening river cruise cutscene |
| `src/game/scenes/budapest/ThermalBathScene.ts` | LARGE (~200 lines) | Thermal bath visit cutscene |

### Estimated Total New/Changed Lines

- `budapestMap.ts`: ~250 lines rewritten
- `BudapestTextures.ts`: ~800 lines added
- `BudapestOverworldScene.ts`: ~150 lines added/modified
- `BudapestBusRideScene.ts`: ~200 lines (rewrite)
- `BudapestEyeScene.ts`: ~300 lines (rewrite)
- `DanubeCruiseScene.ts`: ~250 lines (new)
- `ThermalBathScene.ts`: ~200 lines (new)
- `cutsceneHelpers.ts`: ~40 lines (new)
- Other small changes: ~100 lines

**Total: ~2,300 lines of new/modified code**

---

## 8. What This Design Does NOT Include (YAGNI)

- **Day/night cycle system.** Cutscenes handle time-of-day through manual tint overlays. A global time system would be over-engineering.
- **Interior scenes for all new buildings.** The Opera House, Citadella, and individual bridge viewpoints are dialog-only checkpoints, not full interior scenes. New interiors are limited to the 2 cutscene scenes.
- **NPC pathfinding.** NPCs continue using predefined walkPaths. No A* or nav mesh.
- **Sound system.** The game doesn't have audio. Don't add it.
- **Weather system.** No rain, snow, or dynamic weather. The warm/cool lighting in cutscenes is manually choreographed.
- **Save state for cutscene progress.** Cutscenes are fire-and-forget. No need to save which cutscenes have been viewed.
- **Mini-map updates.** The minimap will automatically reflect the larger map through the existing MinimapRenderer system.
