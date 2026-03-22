# Budapest Expansion - Complete Design Document

**Date:** 2026-03-18
**Status:** Design Phase
**Depends on:** Existing airport Gate 2 slot, AirplaneCutscene destination system, OverworldScene/InteriorScene base classes

---

## 1. Approach Analysis

### Approach A: Single Large Overworld (Maui Pattern)

One big overworld (60x40+) containing all of Budapest: Danube river, both Buda and Pest sides, Parliament, Jewish Quarter, Budapest Eye, etc. Player walks everywhere. Airport is a separate interior scene.

**Pros:** Simple scene graph, one map file, easy to understand.
**Cons:** A 60x40 map at 32px tiles = 1920x1280px. To fit the Danube, Chain Bridge, Parliament, Jewish Quarter, Budapest Eye, AND the Airbnb area, we'd need something closer to 80x50 (2560x1600). Performance concern: rendering 40+ NPCs + vehicle tweens on a single massive tilemap. But the bigger problem is that Budapest's geography is fundamentally different from Maui -- Maui is a small beach town. Budapest is a sprawling city. Cramming it into one overworld would either make it feel tiny or make the player walk forever.

### Approach B: Hub-and-Spoke with Tram/Bus Transport

A medium Budapest overworld (50x35) as the main hub, with sub-scenes for key locations (Jewish Quarter as its own overworld, Budapest Eye as a cutscene, Airbnb as an interior). Tram/bus system moves the player between zones within the overworld (similar to Maui's DrivingScene).

**Pros:** Keeps each scene manageable. Transport system adds city flavor and solves the "too big to walk" problem. Jewish Quarter gets its own dense, alive sub-overworld. Modular -- each area can be developed independently.
**Cons:** More scenes = more scene transition code. But the existing codebase already handles this pattern well (Maui has 7+ scenes). The transport cutscene is another new scene type, but it follows the HanaDrivingScene pattern closely.

### Approach C: Linear Progression (Airport -> Bus -> City -> Attractions)

Strictly linear: Budapest Airport -> Bus Ride cutscene -> arrives at one fixed point -> must walk through the city in order. No free roaming, no transport choices.

**Pros:** Simpler to build, guaranteed the player sees everything.
**Cons:** Destroys the "alive city" feel. The whole point of Budapest is exploration and vibrancy. Linear progression worked for the airport check-in process, but Budapest should feel like an open world. This approach fundamentally conflicts with the user's vision.

---

## 2. Chosen Approach: B (Hub-and-Spoke with Transport)

### Justification

1. **Matches user's vision:** The user wants Budapest to feel EXTREMELY alive -- tons of NPCs, trams, buses, cars everywhere. A medium overworld (50x35) gives enough space for major landmarks while keeping NPC density high. Splitting the Jewish Quarter into its own sub-overworld means we can pack it with 15+ NPCs in a small dense space.

2. **Follows existing patterns:** This is exactly how Maui works -- MauiOverworldScene (45x30) as hub, DrivingScene as transport, sub-destinations (SunBeachScene, AirbnbCompoundScene, HanaPulloverScene). Budapest replaces the driving car with a tram/bus ride cutscene.

3. **Performance:** Vehicle animations (trams, buses, cars) are tweens on sprite images, same as Maui's `carDefs` pattern. 30+ NPCs on a 50x35 map is fine -- Maui already runs 10+ NPCs plus car tweens. The sub-scenes keep each individual scene's NPC count manageable.

4. **Scalability:** New Budapest attractions can be added as sub-scenes later without touching the main overworld.

---

## 3. Self-Critique

**Challenge 1: "50x35 is still small for a city."**
True. At 32px/tile, that's 1600x1120px. With camera zoom at 2x, the player sees ~400x300px viewport = ~12x9 tiles at a time. The map needs to feel bigger than Maui's 45x30, but not so big that walking becomes tedious. The tram system solves long-distance travel, so the overworld just needs to feel dense, not vast.

**Challenge 2: "Vehicle animations will clip through buildings."**
Trams and buses follow fixed routes on roads. If a tram tween path crosses a building footprint, it'll look broken. Need to define vehicle routes as coordinate arrays that follow actual roads, not simple left-to-right tweens like Maui's cars.

**Challenge 3: "How does the player return to the airport? Maui uses DrivingScene -> Airport option."**
Budapest needs the same pattern: a transport hub (tram stop / metro station) with a "Go to Airport" option that triggers AirplaneCutscene with destination 'home'.

**Challenge 4: "The bus ride from airport to city -- is it a cutscene or a DrivingScene-style scene?"**
The HanaDrivingScene pattern (scrolling road + scenery) works perfectly. Adapt it for a bus ride with city-approaching scenery.

**Challenge 5: "Budapest Eye sunset animation -- how complex?"**
It's a cutscene scene (like AirplaneCutscene). Player triggers it via checkpoint, gets a Phaser scene with animated Ferris wheel rotation + sunset color gradient shift. Keep it as a timed sprite animation, not a new game system.

**Challenge 6: "NPC count targets -- how many is 'tons'?"**
Maui overworld has 10 NPCs. Maui total (including compound, beach) ~18. For Budapest to feel noticeably more alive: main overworld needs 20+ NPCs, Jewish Quarter 15+, Airport scene 8+, Airbnb 4+. Total: ~50 NPCs across all Budapest scenes. That's ambitious but buildable -- each NPC is just an NPCDef object in an array.

**Challenge 7: "Two texture files (BudapestTextures + BudapestAirportTextures) or one?"**
One BudapestTextures.ts for the main city + sub-scenes, one BudapestAirportTextures.ts for airport-specific sprites. Follows the Maui pattern (MauiTextures + AirbnbCompoundTextures + SunBeachTextures).

---

## 4. Addressing Critiques -- Revised Design

- **Map size:** 55x35 tiles (1760x1120px). Slightly larger than Maui's 45x30, with denser content per tile.
- **Vehicle routes:** Define as explicit waypoint arrays (like NPC walkPaths), not simple left-right tweens. Vehicles follow road tiles only.
- **Return to airport:** Transport hub checkpoint offers "Airport (Go Home)" option, same as Maui's DrivingScene.
- **Bus ride:** New `BudapestBusRideScene` extending the HanaDrivingScene scrolling-road pattern.
- **Budapest Eye:** New `BudapestEyeScene` as a pure cutscene (like AirplaneCutscene). Timed phases, skip button.
- **NPC count:** 50+ total, distributed across 5 scenes.
- **Textures:** Two files -- `BudapestTextures.ts` (city terrain, NPCs, decorations, buildings, vehicles) and `BudapestAirportTextures.ts` (airport-specific).

---

## 5. Final Design

---

### 5.1 Scene Architecture

#### Scene Inventory

| Scene Name | Type | Dimensions | Purpose |
|---|---|---|---|
| `BudapestAirportScene` | InteriorScene | 40x14 tiles | Arrivals hall: money exchange, bus ticket, exit to bus |
| `BudapestBusRideScene` | Custom (Phaser.Scene) | N/A (cutscene) | Animated bus ride from airport to city center |
| `BudapestOverworldScene` | OverworldScene | 55x35 tiles | Main city hub: Danube, Parliament, Chain Bridge, Budapest Eye, tram stops |
| `JewishQuarterScene` | OverworldScene | 30x25 tiles | Dense sub-overworld: Dohany Synagogue, ruin bars, narrow streets |
| `RuinBarScene` | InteriorScene | 20x16 tiles | Szimpla Kert ruin bar interior |
| `BudapestEyeScene` | Custom (Phaser.Scene) | N/A (cutscene) | Ferris wheel ride with sunset animation |
| `BudapestAirbnbScene` | InteriorScene | 16x12 tiles | Apartment interior |
| `BudapestTransportScene` | Custom (Phaser.Scene) | N/A (hub menu) | Tram/metro route selector (like DrivingScene) |

#### Scene Flow Diagram

```
AirportInteriorScene (Gate 2 boarding)
    |
    v
AirplaneCutscene { destination: 'budapest' }
    |
    v
BudapestAirportScene (arrivals)
    |  [Money exchange] [Bus ticket booth]
    |
    v  (exit checkpoint)
BudapestBusRideScene (animated ride)
    |
    v
BudapestOverworldScene (main hub)
    |--- [Tram stop checkpoint] --> BudapestTransportScene
    |       |--- "Jewish Quarter" --> JewishQuarterScene
    |       |--- "Airport (Go Home)" --> AirplaneCutscene { destination: 'home' }
    |       |--- "Go Back" --> BudapestOverworldScene
    |
    |--- [Budapest Eye checkpoint] --> BudapestEyeScene --> BudapestOverworldScene
    |--- [Airbnb checkpoint] --> BudapestAirbnbScene --> BudapestOverworldScene
    |--- [Jewish Quarter walk-in] --> JewishQuarterScene
    |
    JewishQuarterScene
        |--- [Ruin bar checkpoint] --> RuinBarScene --> JewishQuarterScene
        |--- [Exit checkpoint] --> BudapestOverworldScene
        |--- [Tram stop] --> BudapestTransportScene
```

#### Connection to Existing Airport

**Detailed Gate 2 wiring (addresses reviewer feedback):**

The current airport has a linear station-progression system. After the 4th (final) station completes, `runStation()` at line 432-434 auto-calls `startBoarding()` which hardcodes `{ destination: 'maui' }`. This must be decoupled.

**Required changes to `AirportInteriorScene.ts`:**

1. **Remove auto-boarding after final station (line 431-434).** Replace:
   ```typescript
   if (this.currentStation >= STATIONS.length) {
     this.startBoarding();
   }
   ```
   With: nothing. After security, all gates are already unlocked (doorways 2-5 open at station 3). The player is free to walk to any gate.

2. **Add gate checkpoint zones in `update()` (line 462-467).** After stations are complete, check if the player is standing at a gate tile:
   - Gate 1 tile (~76, 12): triggers `startBoarding('maui')`
   - Gate 2 tile (~68, 12): triggers `startBoarding('budapest')`

3. **Modify `startBoarding()` to accept a destination parameter:**
   ```typescript
   private startBoarding(destination: 'maui' | 'budapest'): void {
     if (this.boardingTriggered) return;
     this.boardingTriggered = true;
     uiManager.hideInteractionPrompt();
     const cam = this.cameras.main;
     this.tweens.add({
       targets: cam, alpha: 0, duration: 500, ease: 'Linear',
       onComplete: () => {
         this.scene.start('AirplaneCutscene', { destination });
       },
     });
   }
   ```

4. **Update Gate 2 sign** from "Coming Soon" to "Gate 2 — Budapest" in the sign tooltip definitions.

This is ~30-50 lines of changes, not a trivial edit.

---

### 5.2 Budapest Airport Scene

**Scene class:** `BudapestAirportScene extends InteriorScene`
**Layout:** 40 tiles wide x 14 tiles tall
**Theme:** Modern arrivals hall with gray tile floor, glass walls, luggage carousels

#### Layout Grid (40x14)

```
Rows 0-2:   Wall (top boundary)
Rows 3-4:   Luggage carousel area (decorative, 2 belt sprites at x=8-16 and x=22-30)
Rows 5-10:  Main hall floor (tile_floor)
  - x=4-8, y=6-8:    Money Exchange booth (NPC + counter decoration)
  - x=14-18, y=6-8:  Bus Ticket booth (NPC + counter decoration)
  - x=30-34, y=6-8:  Info desk (NPC + counter decoration)
Rows 11-12: Exit corridor leading to bus stop
Row 13:     Exit zone (south wall with glass doors)
```

#### Money Exchange Interaction

The money exchange is an interactable NPC with `onInteract: 'dialog'`. When triggered:
1. Dialog: "Welcome to Budapest! Need to exchange some money?"
2. Dialog: "The Hungarian Forint is the local currency. 1 USD = about 360 HUF."
3. Dialog: "Here you go! You're all set for the city."

No actual currency system -- it's narrative flavor only. This is a YAGNI decision: building a currency system adds complexity with no gameplay payoff.

#### Bus Ticket Booth Interaction

Interactable NPC dialog:
1. "Bus 100E goes straight to the city center!"
2. "The ride takes about 40 minutes through the outskirts."
3. "Here's your ticket. Head to the exit for the bus stop!"

#### Exit Checkpoint

The south exit zone triggers a prompt: "Take Bus 100E to the city." On confirm, fades to `BudapestBusRideScene`.

#### Entrance/Spawn

Player spawns at tile (20, 5) -- center of the arrivals hall. This is where they "arrive" after the airplane cutscene.

---

### 5.3 Bus Ride to City (BudapestBusRideScene)

**Pattern:** Follows `HanaDrivingScene` exactly -- scrolling road, tween-animated scenery, auto-progression.

**Implementation:**

```
Phase 1 (0-3s):    Suburban outskirts -- gray buildings, sparse trees, highway
Phase 2 (3-6s):    Approaching city -- denser buildings, road signs
Phase 3 (6-9s):    City arrival -- tall buildings, tram tracks appear, "Budapest" sign
Phase 4 (9-10s):   Fade to black, transition to BudapestOverworldScene
```

- Background color shifts from green (suburbs) to gray-blue (city)
- Scrolling bus window frame overlay (static at edges)
- Road scrolls vertically (same as HanaDrivingScene line animation)
- Building sprites scroll past on both sides
- Skip button (same pattern as AirplaneCutscene)

**Total duration:** ~10 seconds. No interaction -- pure cutscene.

---

### 5.4 Budapest Overworld (Main City)

**Scene class:** `BudapestOverworldScene extends OverworldScene`
**Map:** 55 tiles wide x 35 tiles tall (1760x1120px)
**Terrain texture key:** `'budapest-terrain'`

#### Tile Types (BudapestTileType enum)

```typescript
export const enum BudapestTileType {
  Cobblestone = 0,     // Main walkable surface (Pest side streets)
  Road = 1,            // Vehicle roads
  TramTrack = 2,       // Tram line on road (still walkable, visual distinction)
  Sidewalk = 3,        // Sidewalk along roads
  Grass = 4,           // Parks, Danube bank
  Water = 5,           // Danube river (impassable)
  Bridge = 6,          // Chain Bridge surface (walkable)
  Plaza = 7,           // Erzsebet Square, Parliament plaza
  ParkPath = 8,        // Paths through green areas
  BudaCastle = 9,      // Castle Hill area (elevated, decorative)
}
```

#### Map Layout Concept (55x35)

```
Y=0-2:    Northern boundary -- Buda hillside (grass + castle decorations, impassable)
Y=3-6:    Fisherman's Bastion area (elevated decorative zone, impassable buildings)
           Castle building footprint at x=3-10, y=3-5
Y=7-9:    Buda riverside (grass bank, some walkable)

Y=10-12:  DANUBE RIVER (Water tiles, impassable, full width x=0-54)
           Chain Bridge: x=22-26, y=10-12 (Bridge tiles, walkable)

Y=13-15:  Pest riverside -- Parliament zone
           Parliament building: x=10-18, y=13-15 (impassable footprint)
           Riverside promenade: y=13 sidewalk along water

Y=16-18:  Major east-west road with tram line
           Tram track tiles at y=17
           Tram stops at x=12 and x=40

Y=19-23:  Central Pest -- main exploration area
           Erzsebet Square (Budapest Eye): x=24-30, y=19-23 (Plaza tiles)
           Budapest Eye structure at center: x=26-28, y=20-22
           Shops and cafes along streets

Y=24-27:  Jewish Quarter entrance zone (northeast)
           Checkpoint to JewishQuarterScene at x=42, y=25
           Dohany Synagogue facade (decorative building): x=40-44, y=24-26

Y=28-30:  Southern streets
           Airbnb building: x=34-37, y=28-30
           Restaurants: x=8-12, y=28-30 and x=16-20, y=28-30
           Tram stop: x=25, y=29

Y=31-34:  Southern boundary -- more streets, exit zones
           Transport hub checkpoint: x=25, y=33
```

#### Vehicle System (Trams, Buses, Cars)

Vehicles are purely visual sprite tweens following waypoint paths along road tiles. They do NOT interact with the player -- they're depth-sorted behind/above the player based on Y position.

**Tram (Yellow, iconic Budapest tram):**
```typescript
// Tram follows tram track tiles at y=17, moving left-to-right and back
const tram = this.add.sprite(-80, 17 * TILE_SIZE + TILE_SIZE/2, 'budapest-tram').setDepth(-3);
this.tweens.add({
  targets: tram,
  x: 55 * TILE_SIZE + 80,
  duration: 20000,
  ease: 'Linear',
  repeat: -1,
  onRepeat: () => { tram.x = -80; },
});
```

**Vehicle definitions (following Maui carDefs pattern):**

```typescript
const vehicleDefs = [
  // Trams (2, bidirectional on tram track row)
  { key: 'budapest-tram',     y: 17, direction: 1,  delay: 0,    duration: 20000 },
  { key: 'budapest-tram',     y: 17, direction: -1, delay: 10000, duration: 22000 },
  // Buses
  { key: 'budapest-bus',      y: 16, direction: 1,  delay: 5000,  duration: 15000 },
  { key: 'budapest-bus',      y: 18, direction: -1, delay: 12000, duration: 18000 },
  // Cars (scattered on road rows)
  { key: 'budapest-car-blue', y: 16, direction: 1,  delay: 0,     duration: 12000 },
  { key: 'budapest-car-red',  y: 18, direction: -1, delay: 3000,  duration: 10000 },
  { key: 'budapest-car-white',y: 16, direction: 1,  delay: 7000,  duration: 11000 },
  { key: 'budapest-car-gray', y: 18, direction: -1, delay: 9000,  duration: 13000 },
  // Riverside cars (y=13-14 promenade road)
  { key: 'budapest-car-red',  y: 14, direction: 1,  delay: 2000,  duration: 14000 },
  { key: 'budapest-car-blue', y: 14, direction: -1, delay: 8000,  duration: 16000 },
];
```

**Total vehicles: 10** (2 trams + 2 buses + 6 cars) -- significantly more than Maui's 3 cars.

#### Making It Feel ALIVE

**NPC Density Target: 25 NPCs on the main overworld** (vs Maui's 10)

Strategy:
1. **Walking NPCs (10):** Patrol routes along sidewalks, across the bridge, through plazas. Mix of locals, tourists with cameras, couples.
2. **Sitting NPCs (6):** On benches along the Danube, in Erzsebet Square, at cafe tables.
3. **Idle NPCs (5):** Street performers, vendors, a police officer, tourists looking at Parliament.
4. **Interactable NPCs (4):** Tourist info booth, hot dog vendor, tram conductor, photographer.

**Ambient Motion Layers:**
- 10 vehicles on roads (tweens)
- Wave/ripple animation on Danube tiles (same WaterEffectSystem pattern)
- Pigeons in Erzsebet Square (small sprite tweens, like wave-foam but scattered)
- Flickering street lamp animations at dusk-tinted areas
- Parliament flag waving (small tween rotation on flag sprite)

---

### 5.5 Budapest Eye (Ferris Wheel)

**Scene class:** `BudapestEyeScene extends Phaser.Scene`
**Trigger:** Checkpoint zone at Erzsebet Square. Prompt: "Ride the Budapest Eye?"

#### Ride Sequence (Pure Cutscene, ~25 seconds)

**Phase 1: Boarding (0-3s)**
- Static scene: Budapest Eye wheel drawn large, centered
- Player + partner sprites walk toward a cabin at the bottom
- Cabin door "opens" (sprite swap), they enter, door closes

**Phase 2: Ascending (3-10s)**
- Wheel slowly rotates (entire wheel sprite group rotates via tween)
- Player cabin highlighted/tracked
- City skyline visible in background (static decorative sprites)
- As cabin rises, the "view" behind shifts -- buildings appear below

**Phase 3: Sunset at the Top (10-18s)**
- Cabin reaches apex (top of wheel)
- Background transitions through sunset gradient:
  - Sky shifts: light blue -> orange -> deep pink -> purple
  - Done with overlapping rectangle layers + alpha tweens (same technique as tarmac sky in airport)
- Danube river sprite below reflects sunset colors (tinted rectangle overlay)
- Parliament silhouette visible on the horizon
- Castle Hill silhouette on the other side
- Subtle particle effects: warm light specks / golden hour glow
- Player and partner sprites visible in cabin, partner rests head on player (same lean mechanic as airplane cutscene cozy moment)

**Phase 4: Descending (18-23s)**
- Wheel continues rotating
- Sky gradually returns to normal or deepens to twilight
- Cabin descends back to bottom

**Phase 5: Exit (23-25s)**
- Fade to black
- Return to BudapestOverworldScene at Budapest Eye checkpoint position

**Skip button:** Yes, same pattern as AirplaneCutscene.

#### Sunset Implementation Detail

The sunset is NOT a new system. It's the same approach as the airport tarmac sky:

```typescript
// Sky gradient overlay rectangles
const skyOverlay = this.add.rectangle(w/2, h * 0.3, w, h * 0.6, 0xFF6B35).setAlpha(0).setDepth(0);

// Phase 3: tween sky from blue to sunset
this.tweens.add({
  targets: skyOverlay,
  alpha: 0.6,
  duration: 4000,
  ease: 'Sine.easeInOut',
});

// Add second overlay for deeper sunset
const deepSky = this.add.rectangle(w/2, h * 0.2, w, h * 0.4, 0xCC3366).setAlpha(0).setDepth(0);
this.time.delayedCall(3000, () => {
  this.tweens.add({ targets: deepSky, alpha: 0.4, duration: 3000 });
});
```

---

### 5.6 Jewish Quarter

**Scene class:** `JewishQuarterScene extends OverworldScene`
**Map:** 30 tiles wide x 25 tiles tall (960x800px)
**Theme:** Dense narrow streets, colorful murals, crowded, vibrant nightlife feel

#### Layout Concept (30x25)

```
Y=0-2:    Northern wall/boundary -- building facades
Y=3-6:    Dohany Street Synagogue area
           Building footprint: x=3-10, y=3-5 (large, ornate facade)
           Plaza in front: x=3-10, y=6 (cobblestone)
Y=7-9:    Kazinczy Street (main east-west street)
           Narrow (2-tile wide road), densely lined with buildings
Y=10-14:  Ruin Bar District
           Szimpla Kert entrance: x=18-22, y=12 (checkpoint to RuinBarScene)
           Street art murals (decoration sprites on walls)
           More bars/shops as building facades
Y=15-18:  Side streets with restaurants
           Outdoor seating areas (cafe table decorations)
           Food vendors (interactable NPCs)
Y=19-22:  Southern streets
           More residential, quieter
Y=23-24:  Exit zone (south) -- checkpoint back to BudapestOverworldScene
           Tram stop -- checkpoint to BudapestTransportScene
```

#### NPC Target: 15 NPCs

Dense for 30x25. This is intentional -- narrow streets + lots of NPCs = crowded feel.

**Walking (6):** Bar-hoppers weaving between locations, tourists with cameras, a stray cat
**Sitting (4):** Outdoor cafe patrons, bench sitters, busker audience
**Idle (2):** Bouncer at ruin bar entrance, mural artist
**Interactable (3):** Synagogue guide, street food vendor ("Try a chimney cake!"), bar tout

#### Atmosphere

- Decorative string lights between buildings (static sprites at y-offsets between building facades)
- Mural decorations on walls (large multi-tile decoration sprites)
- Narrower streets = buildings close together = more visual density per screen
- Music note particle sprites near buskers (small tweened sprites)

---

### 5.7 Ruin Bar Interior (Szimpla Kert)

**Scene class:** `RuinBarScene extends InteriorScene`
**Layout:** 20 tiles wide x 16 tiles tall
**Theme:** Eclectic, mismatched furniture, colorful walls, bohemian atmosphere

#### Layout

```
Walls: Standard InteriorScene wall grid
Floor type: 'wood' (main areas) + 'tile_floor' (bar area)

Rooms/Zones:
- Main bar area (x=2-8, y=2-6): Bar counter decoration, bartender NPC
- Seating area (x=10-18, y=2-8): Mismatched furniture decorations (tables, chairs, bathtub-couch)
- Dance floor (x=4-10, y=9-13): Open space, string light decorations
- Back garden (x=12-18, y=9-14): Outdoor-ish area with plants, graffiti wall

Entrance: (10, 15) -- south center
Exit zone: (10, 15) -- south wall, back to JewishQuarterScene
```

#### NPCs: 6

- Bartender (interactable): "What'll it be? We have palinka, spritzer, or craft beer!"
- 2 sitting patrons at tables
- 1 dancing NPC (walk behavior with small circular walkPath)
- 1 idle tourist taking photos
- 1 interactable local: tells you about the history of ruin bars

---

### 5.8 Airbnb + Restaurants

#### Budapest Airbnb (BudapestAirbnbScene)

**Scene class:** `BudapestAirbnbScene extends InteriorScene`
**Layout:** 16 tiles wide x 12 tiles tall
**Theme:** Cozy Budapest apartment -- high ceilings, wooden floors, European furniture

NOT a compound like Maui. Budapest Airbnbs are typically apartments, not resort compounds. An interior scene is more authentic.

```
Layout:
- Living room (x=2-8, y=2-6): Couch, coffee table, bookshelf, window with city view
- Kitchen (x=10-14, y=2-5): Counter, stove, fridge decorations
- Bedroom (x=2-8, y=7-10): Bed, nightstand, wardrobe
- Bathroom (x=10-14, y=7-10): Small room, decorative only

Entrance: (8, 11) -- apartment door
Exit: south wall back to BudapestOverworldScene
```

**No NPCs inside** (it's your apartment). Optional: a note on the table as an interactable decoration with dialog: "Welcome! Wi-Fi password: budapest2024. Enjoy your stay! - Anna"

#### InteriorScene Exit Routing (addresses reviewer feedback)

**CRITICAL:** The base `InteriorScene.exitToOverworld()` hardcodes `this.scene.start('WorldScene', ...)`. All Budapest interior scenes MUST override this method to return to the correct scene:

- **BudapestAirportScene:** Override `exitToOverworld()` — exit goes FORWARD to `BudapestBusRideScene` (not back to airplane). The back wall should be impassable. Use `forwardExit` on the layout pointing south to the bus stop.
- **RuinBarScene:** Override `exitToOverworld()` to `this.scene.start('JewishQuarterScene', { returnFromInterior: true, returnX, returnY })`
- **BudapestAirbnbScene:** Override `exitToOverworld()` to `this.scene.start('BudapestOverworldScene', { returnFromInterior: true, returnX, returnY })`

Each scene stores `returnX`/`returnY` from `this.returnData` (set in `init()` from the calling scene's checkpoint position).

#### Restaurants

Restaurants are NOT separate scenes. They're NPC interactions on the overworld:

- **Checkpoint zone at restaurant building** (x=8-12, y=28-30 on overworld)
- When triggered, shows interactable dialog from a chef/waiter NPC:
  - "Welcome to Goulash House! Try our famous Hungarian goulash!"
  - "The langos with sour cream is incredible today."
  - "Bon appetit!"
- Second restaurant zone (x=16-20, y=28-30):
  - "This is Budapest's best chimney cake shop!"
  - "Would you like cinnamon, chocolate, or walnut?"

This is the YAGNI approach -- building full restaurant interiors adds scenes with no gameplay value. The dialog captures the flavor.

---

### 5.9 Transportation System

#### BudapestTransportScene

**Pattern:** Identical to `DrivingScene` -- a menu hub, not a scrolling animation.

**Trigger:** Tram stop checkpoint zones on overworld and sub-scenes.

```typescript
// Same pattern as DrivingScene.showDestinationChoice()
uiManager.showDialog({
  title: 'Tram Stop',
  message: 'Where would you like to go?',
  buttons: [
    { label: 'Jewish Quarter', onClick: () => { /* fade -> JewishQuarterScene */ } },
    { label: 'Budapest Eye', onClick: () => { /* fade -> BudapestOverworldScene at Eye pos */ } },
    { label: 'Airport (Go Home)', onClick: () => { /* fade -> AirplaneCutscene { destination: 'home' } */ } },
    { label: 'Go Back', onClick: () => { /* return to calling scene */ } },
  ],
});
```

Between selecting a destination and arriving, a brief tram ride animation plays (3-4 seconds):
- Scrolling tram interior frame
- City buildings whizzing past the windows
- Then fade to destination scene

This is simpler than building a full scene -- it's a tween sequence within BudapestTransportScene before the scene.start() call.

#### Bus Ride from Airport (BudapestBusRideScene)

As described in section 5.3. One-way cutscene, airport -> city. Not reusable for later transport.

#### Vehicles on Overworld

As described in section 5.4. All vehicles are visual-only tweened sprites. They do not collide with the player. They're rendered at depth -3 (below player) on roads.

---

### 5.10 NPC Inventory

#### BudapestAirportScene (8 NPCs)

| ID | Tile | Behavior | Texture | Interactable | Dialogue Theme |
|---|---|---|---|---|---|
| bp-airport-exchange | (6, 7) | idle | npc-bp-exchange-clerk | yes | Money exchange, HUF explanation |
| bp-airport-bus-ticket | (16, 7) | idle | npc-bp-ticket-clerk | yes | Bus 100E info, ticket |
| bp-airport-info | (32, 7) | idle | npc-bp-info-desk | yes | Welcome to Budapest, city tips |
| bp-airport-traveler-1 | (10, 9) | walk | npc-bp-traveler | no | -- |
| bp-airport-traveler-2 | (25, 8) | walk | npc-bp-traveler-2 | no | -- |
| bp-airport-traveler-3 | (20, 10) | idle | npc-bp-traveler | no | -- |
| bp-airport-luggage-1 | (12, 5) | idle | npc-bp-traveler-2 | no | -- (waiting at carousel) |
| bp-airport-luggage-2 | (26, 5) | sit | npc-bp-traveler | no | -- (sitting on suitcase) |

Walk paths:
- traveler-1: [(10,9) -> (20,9)]
- traveler-2: [(25,8) -> (35,8)]

#### BudapestOverworldScene (25 NPCs)

| ID | Tile | Behavior | Texture | Interactable | Dialogue Theme |
|---|---|---|---|---|---|
| bp-tourist-info | (28, 19) | idle | npc-bp-guide | yes | "The Eye gives the best sunset views!" |
| bp-hotdog-vendor | (22, 20) | idle | npc-bp-vendor | yes | "Hot dog? Kolbasz? Best in Budapest!" |
| bp-tram-conductor | (12, 17) | idle | npc-bp-conductor | yes | "Tram 2 is the most scenic in Europe!" |
| bp-photographer | (14, 13) | idle | npc-bp-tourist | yes | "Parliament is gorgeous! Can you take my photo?" |
| bp-walker-1 | (5, 16) | walk | npc-bp-local | no | -- |
| bp-walker-2 | (30, 16) | walk | npc-bp-local-2 | no | -- |
| bp-walker-3 | (20, 19) | walk | npc-bp-tourist | no | -- |
| bp-walker-4 | (35, 24) | walk | npc-bp-local | no | -- |
| bp-walker-5 | (15, 28) | walk | npc-bp-tourist-2 | no | -- |
| bp-walker-6 | (45, 20) | walk | npc-bp-local-2 | no | -- |
| bp-bridge-walker-1 | (23, 11) | walk | npc-bp-tourist | no | -- |
| bp-bridge-walker-2 | (25, 11) | walk | npc-bp-local | no | -- |
| bp-jogger | (8, 13) | walk | npc-bp-jogger | no | -- |
| bp-couple | (40, 22) | walk | npc-bp-couple | no | -- |
| bp-bench-1 | (18, 13) | sit | npc-bp-local | no | -- (riverside bench) |
| bp-bench-2 | (32, 19) | sit | npc-bp-tourist | no | -- (Erzsebet Square) |
| bp-bench-3 | (26, 22) | sit | npc-bp-local-2 | no | -- |
| bp-bench-4 | (10, 29) | sit | npc-bp-local | no | -- (restaurant area) |
| bp-bench-5 | (48, 16) | sit | npc-bp-tourist-2 | no | -- |
| bp-bench-6 | (5, 22) | sit | npc-bp-local-2 | no | -- |
| bp-street-performer | (27, 20) | idle | npc-bp-performer | no | -- (near Eye) |
| bp-police | (38, 17) | idle | npc-bp-police | no | -- |
| bp-vendor-flowers | (20, 28) | idle | npc-bp-vendor-2 | no | -- |
| bp-tourist-selfie | (24, 11) | idle | npc-bp-tourist-2 | no | -- (on bridge) |
| bp-elderly-couple | (15, 20) | walk | npc-bp-elderly | no | -- |

Walk paths (key examples):
- walker-1: [(5,16) -> (20,16)] (along road)
- walker-2: [(30,16) -> (50,16)] (along road, opposite side)
- walker-3: [(20,19) -> (20,25)] (north-south through center)
- bridge-walker-1: [(22,11) -> (26,11)] (across Chain Bridge)
- jogger: [(8,13) -> (18,13)] (along Danube promenade)
- couple: [(40,22) -> (40,26)] (strolling south)
- elderly-couple: [(15,20) -> (25,20)] (through Erzsebet Square)

#### JewishQuarterScene (15 NPCs)

| ID | Tile | Behavior | Texture | Interactable | Dialogue Theme |
|---|---|---|---|---|---|
| jq-synagogue-guide | (6, 7) | idle | npc-bp-guide | yes | "The Dohany Synagogue is Europe's largest!" |
| jq-food-vendor | (15, 16) | idle | npc-bp-vendor | yes | "Chimney cake! Hot off the spit!" |
| jq-bar-tout | (19, 12) | idle | npc-bp-bouncer | yes | "Best ruin bar in Budapest! Come in!" |
| jq-walker-1 | (5, 8) | walk | npc-bp-tourist | no | -- |
| jq-walker-2 | (14, 10) | walk | npc-bp-local | no | -- |
| jq-walker-3 | (22, 8) | walk | npc-bp-tourist-2 | no | -- |
| jq-walker-4 | (8, 15) | walk | npc-bp-local-2 | no | -- |
| jq-walker-5 | (20, 18) | walk | npc-bp-tourist | no | -- |
| jq-walker-6 | (12, 20) | walk | npc-bp-local | no | -- |
| jq-cafe-1 | (10, 16) | sit | npc-bp-tourist | no | -- |
| jq-cafe-2 | (12, 16) | sit | npc-bp-local-2 | no | -- |
| jq-bench-1 | (6, 20) | sit | npc-bp-tourist-2 | no | -- |
| jq-bench-2 | (24, 14) | sit | npc-bp-local | no | -- |
| jq-busker | (16, 8) | idle | npc-bp-performer | no | -- |
| jq-mural-artist | (26, 10) | idle | npc-bp-artist | no | -- |

Walk paths:
- walker-1: [(5,8) -> (12,8)] (Kazinczy Street)
- walker-2: [(14,10) -> (14,16)] (north-south side street)
- walker-3: [(22,8) -> (28,8)] (east end of Kazinczy)
- walker-4: [(8,15) -> (8,20)] (side street)
- walker-5: [(20,18) -> (26,18)] (southern street)
- walker-6: [(12,20) -> (20,20)] (southern area)

#### RuinBarScene (6 NPCs)

| ID | Tile | Behavior | Texture | Interactable | Dialogue Theme |
|---|---|---|---|---|---|
| rb-bartender | (5, 3) | idle | npc-bp-bartender | yes | "Palinka, spritzer, or craft beer?" |
| rb-local | (14, 6) | idle | npc-bp-local | yes | "Ruin bars started in abandoned buildings!" |
| rb-patron-1 | (12, 4) | sit | npc-bp-tourist | no | -- |
| rb-patron-2 | (16, 4) | sit | npc-bp-local-2 | no | -- |
| rb-dancer | (7, 11) | walk | npc-bp-tourist-2 | no | -- (small circle) |
| rb-photo-tourist | (14, 12) | idle | npc-bp-tourist | no | -- |

Walk paths:
- dancer: [(7,11) -> (9,11) -> (9,13) -> (7,13)] (small dance loop)

#### BudapestAirbnbScene (0 NPCs)

Empty apartment. Optional note decoration.

#### TOTAL NPC COUNT: 54

---

### 5.11 Checkpoint Zones

#### BudapestAirportScene

| ID | Center Tile | Radius | Prompt | Action |
|---|---|---|---|---|
| bp_airport_exit | (20, 12) | 48px | "Take Bus 100E to the city" | Fade to BudapestBusRideScene |

#### BudapestOverworldScene

| ID | Center Tile | Radius | Prompt | Action |
|---|---|---|---|---|
| bp_eye | (27, 21) | 56px | "Ride the Budapest Eye?" | Fade to BudapestEyeScene |
| bp_airbnb | (36, 29) | 48px | "Enter Airbnb" | Fade to BudapestAirbnbScene |
| bp_jewish_quarter | (42, 25) | 56px | "Enter Jewish Quarter" | Fade to JewishQuarterScene |
| bp_tram_stop_north | (12, 17) | 48px | "Tram Stop" | Fade to BudapestTransportScene |
| bp_tram_stop_south | (25, 33) | 48px | "Tram Stop" | Fade to BudapestTransportScene |
| bp_restaurant_1 | (10, 29) | 48px | "Enter Restaurant" | NPC dialog (goulash house) |
| bp_restaurant_2 | (18, 29) | 48px | "Enter Restaurant" | NPC dialog (chimney cake) |
| bp_parliament | (14, 14) | 56px | "Look at Parliament" | NPC dialog (history/facts) |
| bp_chain_bridge | (24, 10) | 56px | "Cross Chain Bridge" | NPC dialog (bridge facts) |
| bp_fishermans_bastion | (6, 4) | 56px | "Fisherman's Bastion" | NPC dialog (view description) |

#### JewishQuarterScene

| ID | Center Tile | Radius | Prompt | Action |
|---|---|---|---|---|
| jq_ruin_bar | (20, 12) | 48px | "Enter Szimpla Kert" | Fade to RuinBarScene |
| jq_synagogue | (6, 6) | 56px | "Visit Synagogue" | NPC dialog (synagogue guide) |
| jq_exit | (15, 24) | 48px | "Leave Jewish Quarter" | Fade to BudapestOverworldScene |
| jq_tram_stop | (25, 24) | 48px | "Tram Stop" | Fade to BudapestTransportScene |

#### RuinBarScene

Uses InteriorScene exit zone (south wall) -- no checkpoint zones needed. Exit returns to JewishQuarterScene.

#### BudapestAirbnbScene

Uses InteriorScene exit zone -- no checkpoint zones needed. Exit returns to BudapestOverworldScene.

---

### 5.12 Texture Requirements

#### Terrain Tiles (32x32 spritesheet: 'budapest-terrain')

| Frame | Type | Description |
|---|---|---|
| 0 | Cobblestone | Gray-beige cobblestone pattern, European street |
| 1 | Road | Dark gray asphalt with subtle texture |
| 2 | TramTrack | Road with embedded metal rail lines |
| 3 | Sidewalk | Light gray paved sidewalk |
| 4 | Grass | Green grass, parks |
| 5 | Water | Dark blue Danube water with ripple pattern |
| 6 | Bridge | Brown/gray stone bridge surface |
| 7 | Plaza | Decorative stone tile pattern |
| 8 | ParkPath | Gravel/packed earth path |
| 9 | BudaCastle | Elevated stone (decorative, not walkable) |

#### NPC Sprites (16x32 or 32x32)

New textures needed:
- `npc-bp-local` -- Hungarian man, casual European clothes
- `npc-bp-local-2` -- Hungarian woman, casual European clothes
- `npc-bp-tourist` -- Tourist with camera/backpack
- `npc-bp-tourist-2` -- Tourist variant (different colors)
- `npc-bp-guide` -- Tour guide with hat/clipboard
- `npc-bp-vendor` -- Street food vendor with apron
- `npc-bp-vendor-2` -- Flower vendor
- `npc-bp-conductor` -- Tram conductor in uniform
- `npc-bp-police` -- Police officer
- `npc-bp-performer` -- Street musician with instrument
- `npc-bp-bouncer` -- Bar bouncer, dark clothes
- `npc-bp-bartender` -- Bartender with apron
- `npc-bp-artist` -- Artist with beret/brush
- `npc-bp-jogger` -- Runner in sportswear
- `npc-bp-couple` -- Two-person sprite (arm in arm)
- `npc-bp-elderly` -- Elderly couple sprite
- `npc-bp-exchange-clerk` -- Airport exchange booth worker
- `npc-bp-ticket-clerk` -- Bus ticket booth worker
- `npc-bp-info-desk` -- Airport info desk worker
- `npc-bp-traveler` -- Airport traveler with suitcase
- `npc-bp-traveler-2` -- Airport traveler variant

**Total: 21 NPC textures**

#### Vehicle Sprites (48x24 or 64x32)

- `budapest-tram` -- Yellow tram (elongated, 64x24)
- `budapest-bus` -- Blue city bus (48x24)
- `budapest-car-blue` -- Small European car, blue
- `budapest-car-red` -- Small European car, red
- `budapest-car-white` -- Small European car, white
- `budapest-car-gray` -- Small European car, gray

**Total: 6 vehicle textures**

#### Building Sprites (multi-tile, various sizes)

- `building-parliament` -- Neo-Gothic Parliament (8x3 tiles = 256x96px)
- `building-fishermans-bastion` -- White turrets (8x3 tiles)
- `building-buda-castle` -- Castle silhouette on hill (8x3 tiles)
- `building-dohany-synagogue` -- Ornate synagogue facade (5x3 tiles)
- `building-kazinczy-synagogue` -- Smaller synagogue (3x2 tiles)
- `building-bp-airbnb` -- Apartment building (4x3 tiles)
- `building-bp-restaurant-1` -- Goulash house (4x3 tiles)
- `building-bp-restaurant-2` -- Chimney cake shop (4x3 tiles)
- `building-budapest-eye` -- Ferris wheel structure (3x3 tiles)
- `building-bp-hotel` -- Generic hotel facade (4x3 tiles)
- `building-ruin-bar-exterior` -- Szimpla Kert facade (4x3 tiles)
- `building-bp-shop-1` through `building-bp-shop-4` -- Generic shop facades (2x2 tiles each)
- `building-bp-airport-terminal` -- Airport building for arrivals (6x3 tiles)

**Total: 16 building textures**

#### Decoration Sprites (32x32 unless noted)

- `deco-bp-bench` -- European park bench
- `deco-bp-lamp` -- Ornate European street lamp
- `deco-bp-tree` -- Deciduous tree (not palm!)
- `deco-bp-tree-autumn` -- Tree with autumn leaves (optional color variant)
- `deco-bp-bush` -- Trimmed hedge bush
- `deco-bp-flower-bed` -- Garden flower bed
- `deco-bp-fountain` -- Ornamental fountain
- `deco-bp-statue` -- Statue/monument
- `deco-bp-cafe-table` -- Outdoor cafe table with chairs
- `deco-bp-string-lights` -- Horizontal string light decoration (64x8)
- `deco-bp-mural` -- Colorful wall mural (64x64)
- `deco-bp-mural-2` -- Second mural variant
- `deco-bp-flag-hungarian` -- Hungarian flag on pole
- `deco-bp-flag-eu` -- EU flag (Parliament area)
- `deco-bp-pigeon` -- Small pigeon sprite (16x16)
- `deco-bp-luggage-carousel` -- Airport luggage belt (64x32)
- `deco-bp-exchange-booth` -- Money exchange counter (32x32)
- `deco-bp-bus-stop-sign` -- Bus stop pole with sign
- `deco-bp-tram-stop` -- Tram shelter/stop marker
- `deco-bp-chain-bridge-pillar` -- Bridge pillar/tower detail (32x64)
- `deco-bp-bathtub-couch` -- Ruin bar iconic bathtub seating
- `deco-bp-graffiti` -- Ruin bar wall graffiti
- `deco-bp-neon-sign` -- Ruin bar neon sign
- `deco-bp-barrels` -- Wine/beer barrels in ruin bar
- `deco-bp-mismatched-chair` -- Eclectic ruin bar chair
- `deco-bp-plants-hanging` -- Hanging plants (ruin bar garden)

**Total: 26 decoration textures**

#### Cutscene-Specific Sprites

- `budapest-eye-wheel` -- Large Ferris wheel (128x128 or larger)
- `budapest-eye-cabin` -- Single cabin sprite (16x16)
- `budapest-skyline` -- City silhouette for Eye cutscene background (800x200)
- `budapest-sunset-gradient` -- Could be procedural (rectangles), no sprite needed
- `bp-bus-interior-frame` -- Bus window frame overlay for bus ride cutscene
- `bp-bus-building-1` through `bp-bus-building-3` -- Scrolling buildings for bus ride

**Total: 6 cutscene textures**

#### GRAND TOTAL TEXTURES: ~75 new textures
(21 NPC + 6 vehicle + 16 building + 26 decoration + 6 cutscene)

---

### 5.13 File Manifest

#### New Files to Create

**Scene files:**

| Path | Description |
|---|---|
| `src/game/scenes/budapest/BudapestAirportScene.ts` | Arrivals hall (extends InteriorScene) |
| `src/game/scenes/budapest/budapestAirportLayout.ts` | Airport interior layout definition |
| `src/game/scenes/budapest/BudapestBusRideScene.ts` | Bus ride cutscene (extends Phaser.Scene) |
| `src/game/scenes/budapest/BudapestOverworldScene.ts` | Main city hub (extends OverworldScene) |
| `src/game/scenes/budapest/budapestMap.ts` | Tile grid, walk grid, NPCs, checkpoints, decorations, buildings |
| `src/game/scenes/budapest/JewishQuarterScene.ts` | Jewish Quarter sub-overworld (extends OverworldScene) |
| `src/game/scenes/budapest/jewishQuarterMap.ts` | JQ tile grid, walk grid, NPCs, checkpoints, decorations |
| `src/game/scenes/budapest/RuinBarScene.ts` | Ruin bar interior (extends InteriorScene) |
| `src/game/scenes/budapest/ruinBarLayout.ts` | Ruin bar interior layout definition |
| `src/game/scenes/budapest/BudapestEyeScene.ts` | Ferris wheel cutscene (extends Phaser.Scene) |
| `src/game/scenes/budapest/BudapestAirbnbScene.ts` | Airbnb interior (extends InteriorScene) |
| `src/game/scenes/budapest/budapestAirbnbLayout.ts` | Airbnb interior layout definition |
| `src/game/scenes/budapest/BudapestTransportScene.ts` | Transport hub menu (extends Phaser.Scene) |

**Texture files:**

| Path | Description |
|---|---|
| `src/game/rendering/BudapestTextures.ts` | City terrain, NPCs, decorations, buildings, vehicles |
| `src/game/rendering/BudapestAirportTextures.ts` | Airport-specific textures (exchange booth, carousel, etc.) |
| `src/game/rendering/BudapestEyeTextures.ts` | Ferris wheel, skyline, cabin sprites |

#### Existing Files to Modify

| Path | Change |
|---|---|
| `src/main.ts` | Import and register all 8 new scene classes in the `scene` array |
| `src/game/rendering/PixelArtGenerator.ts` | Import and call `generateBudapestTextures()`, `generateBudapestAirportTextures()`, `generateBudapestEyeTextures()` in `generateAllTextures()` |
| `src/game/scenes/airport/AirportInteriorScene.ts` | Change Gate 2 sign from "Coming Soon" to "Gate 2 -- Budapest". Wire Gate 2 agent NPC to trigger boarding for Budapest. Modify `startBoarding()` or add `startBudapestBoarding()` to pass `{ destination: 'budapest' }` to AirplaneCutscene |
| `src/game/scenes/airport/AirplaneCutscene.ts` | Widen destination type from `'maui' \| 'home'` to `'maui' \| 'budapest' \| 'home'`. Refactor `transitionToDestination()` from if/else to switch: `case 'maui'` → MauiOverworldScene, `case 'budapest'` → BudapestAirportScene, `case 'home'` (default) → WorldScene. The current `else` catch-all would silently send 'budapest' to WorldScene without this fix. |
| `src/game/systems/SaveSystem.ts` | Add Budapest scene keys to the valid scene list (if it has one) for save/load support |
| `src/utils/constants.ts` | No changes needed -- TILE_SIZE, GAME_WIDTH/HEIGHT are shared |

---

### 5.14 YAGNI Check

**Included (necessary for the vision):**
- 8 new scenes (all follow existing patterns, no new base classes)
- 54 NPCs (lots of content, but each is just an NPCDef in an array)
- 10 vehicles (tween sprites, same as Maui cars)
- ~75 textures (biggest effort, but they're all Canvas 2D pixel art)
- Transport hub (DrivingScene clone)
- Budapest Eye cutscene (AirplaneCutscene clone)
- Bus ride cutscene (HanaDrivingScene clone)

**Excluded (YAGNI):**
- Currency/money system -- dialog-only flavor, no gameplay mechanics
- Restaurant interiors -- dialog at checkpoint zones, no separate scenes
- Thermal baths scene -- cut for scope. Can be added later as a sub-scene
- Szechenyi Baths -- cut for scope (potential Phase 2 addition)
- Metro system -- tram stops handle all transport needs
- Day/night cycle -- the sunset is ONLY in the Budapest Eye cutscene, not a world system
- NPC pathfinding around vehicles -- vehicles are visual layer only, NPCs ignore them
- Danube boat ride -- cut for scope
- Buda Castle interior -- dialog only at checkpoint, no interior scene
- Parliament interior -- dialog only at checkpoint
- Shopping/inventory system -- no
- Interactive minigames in Budapest -- none in this phase (could add in Phase 2: e.g., thermal bath relay race, chimney cake making)

**Risk assessment:**
- The 75 textures are the biggest time investment. Each Canvas 2D texture function is ~30-100 lines. Estimated ~4000 lines of texture code total.
- The 13 new files + 6 modified files is manageable -- each scene file follows a tight pattern (100-300 lines for overworld scenes, 50-150 for interior scenes, 200-400 for cutscenes).
- Total estimated new code: ~6000-8000 lines across all files.
- Biggest risk: the BudapestEyeScene cutscene is the most novel piece (rotating wheel with sunset). If the wheel rotation looks bad, fall back to a simpler "cabin rises, view changes" without visible wheel rotation.

---

### Summary

Budapest is a **hub-and-spoke** expansion with 8 scenes, 54 NPCs, 10 vehicles, and ~75 textures. It connects to the existing airport via Gate 2 and follows every established codebase pattern (OverworldScene, InteriorScene, DrivingScene, AirplaneCutscene). No new systems, no new base classes, no new game mechanics. All the complexity is in content density -- exactly what the user asked for.
