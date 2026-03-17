# Airport Check-In Process Design

## Overview

Transform the airport scene from a walk-through space with dialogue NPCs into an interactive check-in experience. The player completes 5 sequential stations — each a short animated process sequence — before boarding the plane. No dialogue trees; the experience is driven by animations and visual feedback.

## Stations

The player must complete stations in order. Each station activates when the player steps onto its trigger zone, provided the previous station is complete.

### 1. Ticket Counter

- **Trigger:** Player walks onto the check-in desk trigger tile
- **Sequence (~4s):**
  1. Camera focuses on the counter area
  2. Departure board appears above the counter showing destinations: **Maui** (selectable), others greyed out with "Coming Soon"
  3. Player clicks/taps Maui (or it auto-selects as the only option)
  4. Agent types on keyboard (brief animation), printer sound effect concept (visual: paper slides out)
  5. Boarding pass slides across counter to player — briefly shown enlarged on screen (destination, seat number, flight number)
  6. Boarding pass fades, camera returns to normal
- **State change:** Station 1 complete

### 2. Luggage Check-In

- **Trigger:** Player walks onto the luggage belt trigger tile
- **Sequence (~4s):**
  1. Camera focuses on the luggage area
  2. Player's suitcase slides off their sprite onto the conveyor belt
  3. Scale display appears showing weight (e.g., "18.5 kg" with a green checkmark)
  4. Luggage tag gets slapped onto the suitcase (small tag sprite appears)
  5. Suitcase rolls away down the conveyor belt and disappears
  6. Camera returns to normal
- **State change:** Station 2 complete. Player and partner lose suitcase textures (they checked their bags)

### 3. Passport Control

- **Trigger:** Player walks onto the passport booth trigger tile
- **Sequence (~3s):**
  1. Camera focuses on the passport booth
  2. Passport sprite slides from player to officer across the desk
  3. Officer looks down at passport (brief pause, ~0.5s)
  4. Stamp comes down onto passport — bold stamp animation (ink stamp visual, slight screen shake or bounce)
  5. Passport slides back to player
  6. Camera returns to normal
- **State change:** Station 3 complete

### 4. Security Screening

- **Trigger:** Player walks onto the security conveyor trigger tile
- **Sequence (~5s):**
  1. Camera focuses on the security area
  2. A bin appears on the conveyor belt; small items (phone, keys, wallet sprites) slide into the bin
  3. Bin rolls into the X-ray machine (disappears behind it)
  4. Player sprite walks through the metal detector arch
  5. Metal detector flashes green (brief green glow effect)
  6. Bin emerges on the other side of the X-ray machine
  7. Items slide back to player (bin disappears)
  8. Camera returns to normal
- **State change:** Station 4 complete

### 5. Boarding Gate

- **Trigger:** Player walks onto the gate desk trigger tile
- **Sequence (~3s):**
  1. Camera focuses on the gate area
  2. Boarding pass sprite slides from player to gate agent
  3. Agent scans it (brief scanner line animation on the pass)
  4. Green checkmark appears above agent
  5. Agent nods, pass slides back
  6. Gate door opens (visual change on the gate area)
  7. Camera returns to normal
- **Transition:** Player walks toward the gate door → triggers existing `AirplaneCutscene`
- **State change:** Station 5 complete (all stations done)

## Progression System

### State Tracking

Add to the existing game state (`GameStateV3` → extend or add airport-specific state):

```
airportProgress: {
  currentStation: number  // 0 = not started, 1-5 = station index, 5 = all done
  completed: boolean      // true after boarding
}
```

This resets each time the player enters the airport (the check-in process starts fresh each visit — you always need to check in for a new flight).

### Station States

Each station has 3 visual states:
- **Inactive:** Default appearance. NPC is idle at their post. Station cannot be interacted with yet.
- **Active/Next:** Subtle pulsing glow on the trigger tile (or a small arrow indicator) showing this is the next station. NPC may have a slightly different idle animation (e.g., looking toward the player).
- **Complete:** NPC returns to relaxed idle. Trigger tile no longer activates.

### Flow Control

- Stations must be completed in strict order (1 → 2 → 3 → 4 → 5)
- Player can freely roam the airport at all times — visit the cafe, walk around, etc.
- Only the "next" station responds to trigger activation
- If the player walks onto a future station's trigger before completing prerequisites, nothing happens (or optionally a subtle indicator points them to the correct station)

## Animation System

### Approach: Tween-Based Sequences

Each station animation is a scripted sequence using Phaser tweens and timers, similar to the existing `AirplaneCutscene` phase system but simpler. Each sequence:

1. Freezes player input
2. Optionally adjusts camera focus (smooth pan to station area)
3. Creates temporary sprites for props (passport, boarding pass, stamp, bin, items)
4. Runs tween chain (move, scale, alpha, rotation as needed)
5. Destroys temporary sprites
6. Restores camera and unfreezes input

### Prop Sprites

New textures needed (generated procedurally like all other game textures):
- **Boarding pass** — small rectangular card with text/barcode detail
- **Passport** — small booklet, dark blue/red
- **Stamp** — circular or rectangular ink stamp graphic
- **Luggage tag** — small tag with barcode
- **Scale display** — weight readout panel
- **Security bin** — grey/white tray
- **Small items** — phone, keys, wallet (tiny sprites, ~8x8 px)
- **Scanner line** — thin red/green line for boarding pass scan
- **Departure board** — flip-board style destination list

### Camera Behavior

- Smooth pan to station center when sequence starts (Phaser camera pan, ~300ms)
- Slight zoom-in for detail visibility during sequences
- Smooth return to player-follow after sequence ends (~300ms)

## Airport Layout Changes

The existing 36x20 layout largely works. Minor adjustments needed:

- **Trigger tiles** for each station need clear placement (may need to adjust NPC/counter positions slightly to ensure good trigger tile placement)
- **Passport control booth** — the current layout has security but no dedicated passport control area. Need to add a small booth/desk area between check-in and security. This may require shifting the layout slightly or using existing space more efficiently.
- **Station order must match physical layout** — player should naturally walk left-to-right (or top-to-bottom) through: ticket counter → luggage → passport → security → gate

### Layout Flow (conceptual left-to-right):

```
[Entry] → [Ticket Counter] → [Luggage Belt] → [Passport Booth] → [Security] → [Gate] → [Cutscene]
                                                                      ↕
                                                                    [Cafe]
```

The cafe sits off to the side and remains freely accessible at any point.

## Existing System Integration

### What Changes

- **AirportInteriorScene.ts:** Add station progression logic, animation sequences, trigger zone handling per station
- **airportLayouts.ts:** Adjust layout to accommodate passport control booth and ensure station flow
- **AirportTextures.ts:** Add new prop textures (boarding pass, passport, stamp, etc.)
- **NPC behavior:** Airport NPCs become part of animation sequences rather than dialogue-trigger NPCs. They stay at their posts and animate during their station's sequence.

### What Stays the Same

- Free-roam movement and click-to-move pathfinding
- Cafe area and barista NPC (optional stop, not part of check-in flow)
- Scene entry/exit transitions
- AirplaneCutscene trigger (now triggered by completing station 5 instead of dwell on gate agent)
- Overall tile grid system and rendering pipeline

### Save System

- Airport progress is transient (resets on each visit), so it does NOT need to persist to localStorage
- The existing `saveCurrentScene('AirportInteriorScene')` continues to work for scene tracking
- Suitcase texture removal after luggage check-in is session-based (already handled as temp textures)

## Edge Cases

- **Player leaves airport mid-process:** Progress resets. Next time they enter, they start from station 1. This is intentional — you can't leave the airport mid-check-in and resume later.
- **Player already at Maui, taking return flight:** The same check-in process plays for the return trip. Destination shows "Home" instead of "Maui."
- **Partner behavior during sequences:** Partner stands beside player during animations (frozen in place alongside player). They don't independently animate during station sequences.
- **Skipping/interruption:** Sequences cannot be skipped or interrupted. They're short enough (3-5s) that this is fine.

## Non-Goals

- No inventory system (boarding pass / passport are animation props, not persistent items)
- No dialogue choices during sequences
- No mini-games at stations (this is about process and animation, not gameplay challenges)
- No sound effects (the game currently has no audio system)
- No additional destinations beyond Maui (future expansion)
