# Airport Check-In Improvements — Design Document

## Overview

Two fixes for the airport interior scene:
1. **Clear visual path** — Add numbered station signs (1-5) above each check-in station so players know the order
2. **Fix desktop animation bug** — Check-in station overlay sprites (departure board, boarding pass) positioned incorrectly at high zoom levels

## Fix 1: Numbered Station Signs

Add 5 procedural sign textures (`interior-airport-sign-1` through `interior-airport-sign-5`) and place them as decorations in the airport layout. Each sign is a 32x32 pixel-art circle with a number.

**Sign positions** (placed above/near each station, avoiding existing decorations):

| Sign | Station | Tile Position | Notes |
|------|---------|---------------|-------|
| 1 | Ticket Counter | (8, 14) | Above counter at (8,15). Rope barrier at (7,14) is one tile left — no collision |
| 2 | Luggage Check-In | (14, 14) | Above belt at (14,16). Rope barrier at (13,14) — no collision |
| 3 | Passport Control | (18, 11) | Above desk at (18,12). Rope barrier at (16,11) — no collision |
| 4 | Security | (20, 9) | Near security area. Conveyor at (26,9) — no collision. Offset to x=20 to not overlap detector at (24,10) |
| 5 | Boarding Gate | (24, 2) | Above gate desk at (24,3). Departures board at (16,2) — no collision |

**Files changed:**
- `src/game/rendering/AirportTextures.ts` — Add 5 sign texture generators
- `src/game/scenes/airport/airportLayouts.ts` — Add 5 decoration entries

## Fix 2: Desktop Animation Bug

**Root cause:** In `playTicketCounter()` (CheckinStations.ts:97-98), viewport center is computed manually:
```typescript
const cx = cam.scrollX + cam.width / (2 * cam.zoom);
const cy = cam.scrollY + cam.height / (2 * cam.zoom);
```

This doesn't account for camera bounds clamping. On desktop (zoom 2.0, boosted to 2.3), the visible world area is tiny (~348x261px). When the camera pans to station tiles near the bottom of the map, bounds clamping shifts the actual camera position, making the manual formula compute a center that's outside the visible area.

**Fix:** Replace with `cam.getWorldPoint(cam.width / 2, cam.height / 2)` which correctly handles zoom, scroll, and bounds clamping. Also replace the fragile `delayAsync(320)` in `focusCamera()` with a pan completion callback.

**Affected code:**
- `CheckinStations.ts` lines 97-98 (viewport center formula)
- `CheckinStations.ts` lines 106, 123 (downstream uses of cx/cy)
- `CheckinStations.ts` lines 74-76 (focusCamera pan timing)

**Not affected:** Stations 2-5 use world-space tile positions, not viewport-relative. Only `playTicketCounter` has the bug.

## Files Changed

| File | Change |
|------|--------|
| `src/game/scenes/airport/CheckinStations.ts` | Fix viewport center formula + focusCamera timing |
| `src/game/scenes/airport/airportLayouts.ts` | Add 5 numbered sign decorations |
| `src/game/rendering/AirportTextures.ts` | Add 5 procedural sign textures |
