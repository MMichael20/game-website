# NPC Trigger Zone Interaction Design

## Overview

Replace the current tap/click + proximity-prompt NPC interaction model with passive trigger zone tiles. When the player stands on an NPC's trigger tile for 1 second, the dialogue opens automatically. This is input-method-agnostic: touch, click-to-move, and keyboard movement all work identically.

---

## 1. Code Removals (~40 lines across 4+ files)

### NPC.ts
- **Remove** `checkProximity()` method entirely (handles distance calculation, prompt show/hide).
- **Remove** `promptText` creation, destruction, and per-frame positioning logic.
- **Remove** `_inRange` boolean state and its `inRange` getter.

### NPCSystem.ts
- **Remove** `getInteractableInRange()` method.
- **Remove** proximity-checking logic from `update()` loop.
- **Keep** `getNPCAtPosition()` for debug/future use.

### OverworldScene.ts
- **Remove** `pendingNPCInteract` flow (tap NPC, walk to them, auto-interact on arrival).
- **Remove** `activeNPC` tracking variable and all reads/writes.
- **Remove** NPC prompt priority section from `update()` loop.
- **Remove** NPC branch from `onWorldTap` callback (only click-to-move remains).

### InteriorScene subclasses
- **Remove** `onInteractPressed()` NPC branches in AirportEntranceScene, AirportGateScene, AirportSecurityScene, MauiScene.

### InputSystem.ts
- **Remove** E/Space-to-NPC-interact dispatch. E/Space may still be used for non-NPC interactables.

---

## 2. NPC.ts Changes

### New readonly property: `facingDirection`
- Type: `'up' | 'down' | 'left' | 'right'`
- Set once at construction from NPCDef. Default: `'down'`.

### New readonly property: `triggerTile`
- Type: `{ tileX: number; tileY: number }`
- Computed once at construction: NPC's tile + facing offset.
- Offsets: down -> tileY+1, up -> tileY-1, right -> tileX+1, left -> tileX-1

### New indicator sprite
- Semi-transparent rectangle or small glow on the trigger tile.
- Initial alpha: **0.25** (idle state).
- **Destroyed in `NPC.destroy()`** to prevent leaks.

---

## 3. NPCSystem.ts Changes

### New state
- Per-NPC `dwellTimer: number` (ms accumulated), initialized to 0.
- `DWELL_THRESHOLD = 1000` ms.

### Modified `update(delta)` loop

For each interactable NPC:
1. Get player's current tile via `worldToTile()`.
2. Compare against `npc.triggerTile`.
3. **If match:** increment `dwellTimer` by delta. Lerp indicator alpha from 0.25 to 0.6 based on progress. If timer >= threshold: fire dialogue callback, reset timer and alpha.
4. **If no match:** reset `dwellTimer` to 0, reset alpha to 0.25.

### Dialogue guard
- If dialogue is already open, do not fire again. Player must leave tile and return to re-trigger.

---

## 4. OverworldScene.ts Changes

- Wire dwell callback to `handleNPCInteract()` during NPC creation.
- `onWorldTap` simplified to pathfinding only.
- No other new infrastructure needed.

---

## 5. InteriorScene Subclass Changes

These scenes already have NPCSystem instances and call `npcSystem.update()`.
- Add `facingDirection` to NPCDef arrays.
- Wire dwell dialogue callback.
- Remove `onInteractPressed()` NPC branches.

---

## 6. Data Model Changes

### NPCDef type
- Add optional `facingDirection: 'up' | 'down' | 'left' | 'right'` (default 'down').

### Constants
- `DWELL_TIME_MS = 1000`
- `DWELL_COOLDOWN_MS = 2000`
- `FACING_OFFSETS = { up: {dx:0,dy:-1}, down: {dx:0,dy:1}, left: {dx:-1,dy:0}, right: {dx:1,dy:0} }`
- `TRIGGER_INDICATOR_ALPHA = 0.25`
- `TRIGGER_INDICATOR_COLOR = 0xFFFF00`

---

## 7. File Change Summary

| File | Removals | Additions |
|---|---|---|
| `NPC.ts` | checkProximity, promptText, _inRange | facingDirection, triggerTile, indicator sprite |
| `NPCSystem.ts` | getInteractableInRange, proximity logic | dwellTimer state, dwell check + alpha ramp |
| `OverworldScene.ts` | pendingNPCInteract, activeNPC, NPC prompts, NPC tap branch | Dwell callback wiring |
| `InteriorScene subclasses` | onInteractPressed NPC branches | facingDirection in defs, dwell callback |
| `InputSystem.ts` | E/Space NPC dispatch | isFrozen getter |
| `constants.ts` | None | Dwell/indicator constants, facingDirection on NPCDef |

---

## 8. Behavioral Notes

- **Keyboard players:** Walk onto trigger tiles same as click-to-move. 1-second dwell fires regardless of input method.
- **Touch players:** Tap location, player walks there. If destination is trigger tile, dwell starts on arrival.
- **Visual feedback:** Indicator alpha ramps 0.25 -> 0.6 over the 1-second dwell.
- **Re-trigger prevention:** Dialogue guard prevents repeated firing. Player must leave and return.
- **Cleanup:** Indicator sprite destroyed in NPC.destroy() on scene transitions.
