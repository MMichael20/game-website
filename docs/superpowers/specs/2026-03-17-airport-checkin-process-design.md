# Airport Check-In Process Design

## Overview

Transform the airport scene from a walk-through space with dialogue NPCs into an interactive check-in experience. The player completes 5 sequential stations — each a short animated process sequence — before boarding the plane. No dialogue trees; the experience is driven by animations and visual feedback.

## Stations

The player must complete stations in order. Each station activates when the player steps onto its trigger tile, provided the previous station is complete. The airport layout flows **bottom-to-top** (entry at bottom, gate at top), so stations are ordered to match the physical layout as the player walks upward through the airport.

### 1. Ticket Counter (Check-In Zone, ~y=15)

- **Trigger:** Player walks onto the trigger tile in front of the check-in desk
- **Sequence (~4s):**
  1. Freeze player input, stop camera follow, smooth pan/zoom to counter area (~300ms)
  2. Departure board appears above the counter showing destinations: **Maui** highlighted, others greyed out with "Coming Soon"
  3. Brief pause (~1s) then Maui auto-selects (highlight animation)
  4. Agent types on keyboard (brief sprite frame toggle), paper slides out from counter
  5. Boarding pass shown enlarged on screen briefly (destination: Maui, seat, flight number) then fades
  6. Restore camera follow, unfreeze input (~300ms)
- **State change:** Station 1 complete

### 2. Luggage Check-In (Check-In Zone, ~y=14-15)

- **Location:** Adjacent to the ticket counter, using the existing luggage cart decorations near (10,17) and (22,17). A small luggage belt decoration and scale will be added to the layout near the check-in counters.
- **Trigger:** Player walks onto the trigger tile next to the luggage belt
- **Sequence (~4s):**
  1. Freeze input, stop camera follow, pan/zoom to luggage area (~300ms)
  2. Player's suitcase slides off their sprite onto the conveyor belt
  3. Scale display appears showing weight (e.g., "18.5 kg" with a green checkmark)
  4. Luggage tag gets slapped onto the suitcase (small tag sprite appears)
  5. Suitcase rolls away down the conveyor belt and disappears off-screen
  6. Restore camera follow, unfreeze input (~300ms)
- **State change:** Station 2 complete. Call `this.player.restoreTexture(this)` and `this.partner.restoreTexture(this)` to remove suitcase textures (they checked their bags).

### 3. Passport Control (Corridor Zone, ~y=12-13)

- **Location:** A new passport booth desk placed in the corridor band between check-in (y=14-17) and security (y=8-11). This uses the existing carpet_beige corridor at y=12-13, adding a small desk decoration and a passport officer NPC.
- **Trigger:** Player walks onto the trigger tile in front of the passport booth
- **Sequence (~3s):**
  1. Freeze input, stop camera follow, pan/zoom to passport booth (~300ms)
  2. Passport sprite slides from player to officer across the desk
  3. Officer looks down at passport (brief pause, ~0.5s)
  4. Stamp comes down onto passport — bold stamp animation (ink stamp visual, slight bounce on the passport sprite)
  5. Passport slides back to player
  6. Restore camera follow, unfreeze input (~300ms)
- **State change:** Station 3 complete

### 4. Security Screening (Security Zone, ~y=9-10)

- **Trigger:** Player walks onto the trigger tile at the security conveyor entrance
- **Sequence (~6s):**
  1. Freeze input, stop camera follow, pan/zoom to security area (~300ms)
  2. A bin appears on the conveyor belt; small items (phone, keys, wallet sprites) slide into the bin
  3. Bin rolls into the X-ray machine (disappears behind it) (~1s)
  4. Player sprite walks through the metal detector arch (~1s)
  5. Metal detector flashes green (brief green glow effect)
  6. Bin emerges on the other side of the X-ray machine (~1s)
  7. Items slide back to player (bin disappears)
  8. Restore camera follow, unfreeze input (~300ms)
- **State change:** Station 4 complete

### 5. Boarding Gate (Gate Zone, ~y=3-5)

- **Trigger:** Player walks onto the trigger tile at the gate desk
- **Sequence (~3s):**
  1. Freeze input, stop camera follow, pan/zoom to gate area (~300ms)
  2. Boarding pass sprite slides from player to gate agent
  3. Agent scans it (brief scanner line animation across the pass)
  4. Green checkmark appears above agent
  5. Agent nods, pass slides back
  6. Gate door visual changes (opens)
  7. Restore camera follow, unfreeze input (~300ms)
- **Transition:** Player walks toward the gate door → triggers existing `AirplaneCutscene`
- **State change:** Station 5 complete (all stations done)

## Progression System

### State Tracking

Airport progress is **transient** — it lives as scene-level instance variables on `AirportInteriorScene`, not in the `GameStateV3` save system. It resets each time the player enters the airport.

```typescript
// Scene-level properties on AirportInteriorScene
private currentStation: number = 0;  // 0 = not started, 1-5 = last completed station
private sequenceActive: boolean = false;  // true while an animation sequence is playing
```

### Station States

Each station has 3 visual states:
- **Inactive:** Default appearance. NPC is idle at their post. Station trigger tile does not respond.
- **Active/Next:** Pulsing alpha glow on the trigger tile (reuse the existing `triggerIndicator` pattern from `NPCSystem` — a semi-transparent colored square with pulsing alpha tween). This is the next station to complete.
- **Complete:** Trigger tile indicator removed. NPC returns to relaxed idle. Station no longer activates.

### Flow Control

- Stations must be completed in strict order (1 → 2 → 3 → 4 → 5)
- Player can freely roam the airport at all times — visit the cafe, walk around, etc.
- Only the "next" station responds to trigger activation
- If the player walks onto a future station's trigger before completing prerequisites, nothing happens

## Station Trigger Mechanism

Stations use **tile-based trigger zones** checked in the scene's `update()` loop — NOT the NPC dwell-trigger system. Each station defines a trigger tile position. On each update tick:

1. If `sequenceActive` is true, skip all checks
2. Get the player's current tile position
3. Check if player is on the trigger tile of the station matching `currentStation + 1`
4. If yes, start that station's animation sequence

The existing NPC dwell-trigger dialogue system is **removed** for station NPCs (ticket agent, luggage handler, passport officer, security guard, gate agent). These NPCs become **static sprites** managed directly by the scene — they exist visually at their posts and animate as part of station sequences, but they are not registered with `NPCSystem` for dialogue.

The **cafe barista** and **non-interactive passenger NPCs** remain on the `NPCSystem` as before.

## Animation System

### Approach: Tween-Based Sequences

Each station animation is a scripted sequence using Phaser tweens and timers, similar to the existing `AirplaneCutscene` phase system but simpler. Each sequence:

1. Sets `sequenceActive = true`
2. Freezes player input via `inputSystem.freeze()`
3. Stops camera follow: `this.cameras.main.stopFollow()`
4. Pans camera to station area: `this.cameras.main.pan(x, y, 300)`
5. Optionally zooms: `this.cameras.main.zoomTo(zoomLevel, 300)`
6. Creates temporary sprites for props (passport, boarding pass, stamp, bin, items)
7. Runs tween chain (move, scale, alpha, rotation as needed)
8. Destroys temporary sprites
9. Zooms back: `this.cameras.main.zoomTo(originalZoom, 300)`
10. Restores camera follow: `this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1)`
11. Unfreezes input via `inputSystem.unfreeze()`
12. Updates `currentStation` to mark this station as complete
13. Sets `sequenceActive = false`
14. Updates trigger indicators (remove current, show next)

### Prop Sprites

New textures needed (generated procedurally like all other game textures via `AirportTextures.ts`):
- **Boarding pass** — small rectangular card with text/barcode detail
- **Passport** — small booklet, dark blue/red
- **Stamp** — circular or rectangular ink stamp graphic
- **Luggage tag** — small tag with barcode
- **Scale display** — weight readout panel
- **Security bin** — grey/white tray
- **Small items** — phone, keys, wallet (tiny sprites, ~8x8 px)
- **Scanner line** — thin red/green line for boarding pass scan
- **Departure board** — flip-board style destination list
- **Passport booth desk** — small desk decoration for the corridor area

### Camera Behavior

- Stop follow → pan to station center (~300ms) when sequence starts
- Slight zoom-in (e.g., 1.5x from current zoom) for detail visibility
- Pan back + zoom out → restart follow (~300ms) when sequence ends
- Camera bounds remain set to the map dimensions throughout

## Airport Layout Changes

The existing 36x20 layout is structured **bottom-to-top** with the player entering at the bottom and progressing upward:

### Layout Flow (bottom-to-top):

```
y=0-1:   [Top wall]
y=2-5:   [Gate Zone + Cafe]          ← Station 5: Boarding Gate
y=6-7:   [Corridor]
y=8-11:  [Security Zone]             ← Station 4: Security Screening
y=12-13: [Corridor → Passport Booth] ← Station 3: Passport Control (NEW)
y=14-17: [Check-In Zone]             ← Station 1: Ticket Counter + Station 2: Luggage
y=18-19: [Entry]                      ← Player enters here
```

### Specific Layout Modifications

1. **Luggage belt area (~y=14-15):** Add a luggage belt decoration and scale near the existing check-in counters. Repurpose one of the luggage cart positions to be the luggage check-in station with a small conveyor belt segment.

2. **Passport control booth (y=12-13):** Add a desk decoration and passport officer NPC sprite in the corridor band. This is currently open carpet, so a small booth fits without displacing anything. Add a desk (2-3 tiles wide), a wall/barrier segment behind the officer, and the officer sprite.

3. **Trigger tile positions:** Define explicit trigger tiles for each station, positioned in front of the respective NPC/desk so the player naturally walks up to them.

## Existing System Integration

### What Changes

- **AirportInteriorScene.ts:** Add station progression logic, animation sequences, tile-based trigger zone checking in `update()`. Remove dwell-trigger dialogue for station NPCs. Add camera management during sequences.
- **airportLayouts.ts:** Add luggage belt decoration, passport booth desk/barriers in corridor, define trigger tile positions per station.
- **AirportTextures.ts:** Add new prop textures (boarding pass, passport, stamp, bin, items, departure board, passport booth desk).
- **NPC handling:** Station NPCs (ticket agent, luggage handler, passport officer, security guard, gate agent) become scene-managed static sprites, not `NPCSystem` dialogue NPCs. Cafe barista and passengers remain as-is.

### What Stays the Same

- Free-roam movement and click-to-move pathfinding
- Cafe area and barista NPC (optional stop, not part of check-in flow)
- Scene entry/exit transitions
- AirplaneCutscene (triggered by completing station 5 instead of dwell on gate agent)
- Overall tile grid system and rendering pipeline
- Partner follow behavior (partner naturally stops when player stops; frozen alongside player during sequences)

### Save System

- Airport progress is transient (scene-level instance variables), no changes to `GameStateV3` or `SaveSystem.ts`
- The existing `saveCurrentScene('AirportInteriorScene')` continues to work for scene tracking
- Suitcase texture restoration uses existing `restoreTexture()` method on Player/Partner entities

## Edge Cases

- **Player leaves airport mid-process:** Progress resets. Next time they enter, they start from station 1. This is intentional — you can't leave the airport mid-check-in and resume later.
- **Player already at Maui, taking return flight:** The same check-in process plays for the return trip. Destination shows "Home" instead of "Maui."
- **Partner behavior during sequences:** Partner follows player as normal. When input is frozen, player velocity is 0, so partner catches up and stops naturally. Partner is not explicitly animated during sequences.
- **Skipping/interruption:** Sequences cannot be skipped or interrupted. They're short enough (3-6s) that this is fine.
- **Camera during sequences:** `stopFollow()` before pan, `startFollow()` after. Camera bounds remain set so pan doesn't go out of bounds.

## Non-Goals

- No inventory system (boarding pass / passport are animation props, not persistent items)
- No dialogue choices during sequences
- No player input during sequences (departure board auto-selects Maui)
- No mini-games at stations (this is about process and animation, not gameplay challenges)
- No sound effects (the game currently has no audio system)
- No additional destinations beyond Maui (future expansion)
