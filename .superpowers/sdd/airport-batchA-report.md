# Airport Batch A — Implementation Report

## Files Created

| File | Kind | Notes |
|------|------|-------|
| `src/world/catalog/airport/terminalHall.ts` | `terminalHall` | Grand departures hall hero building |
| `src/world/catalog/airport/checkInIsland.ts` | `checkInIsland` | Long check-in counter with desks/queue |
| `src/world/catalog/airport/flightBoard.ts` | `flightBoard` | FIDS departures board with CanvasTexture |
| `src/world/catalog/airport/securityLane.ts` | `securityLane` | Security checkpoint with X-ray / arches |
| `src/world/catalog/airport/airportSeating.ts` | `airportSeating` | Linked beam seat row with anchors |

## tsc status

`npx tsc --noEmit` — **0 errors in all 5 Batch A files**.
Other airport files (siblings from other batches) have unused-import warnings unrelated to this batch.

## Key decisions

### terminalHall
- Column bays spaced by `COL_BAY=8m`; column x-positions derived from `w/(nCols-1)`.
- Glass bays sized from actual bay width minus column footprint — no magic numbers.
- Rear gap doorway flanked by explicit arch-header + door-frame columns.
- Skylight strips at roof level with interior glow accent boxes.
- `concourseGap` and `door` anchors exposed.

### checkInIsland
- Desk count drives monitor/scale/belt positions; all x-positions derived from `len/desks`.
- Monitor screen uses a real CanvasTexture (blue airline check-in UI).
- Queue stanchion count derived from `len/1.5`, two rows of posts with gold ribbon.
- Overhead signboard on two posts with "CHECK-IN" + "DEPARTURES" signs.

### flightBoard
- 8-column FIDS canvas (1024×512) with TIME/DESTINATION/GATE/STATUS columns.
- Status color-coded: Boarding=green, On time=light, Delayed=amber, Gate Closed=red.
- Left accent bar per row also color-coded. Board is mounted on a center post bracket.
- No colliders (board is mounted high).

### securityLane
- Lane spacing = 2.0m, derived throughout (no magic offsets).
- Each lane: X-ray body + operator screen + infeed conveyor + outfeed conveyor + arch + tray cart.
- Arch posts get colliders; arch opening and conveyor tops left open for player passage.
- Lane dividers span the full lane depth.

### airportSeating
- Leg count = `ceil(seats/3)*2`, minimum 2 — avoids long unsupported spans.
- Armrests between every seat plus both ends; left end arm added after the loop.
- All seat_0..seat_{n-1} anchors registered as `Seat` with `faceYaw:0`.
- No solid colliders (seating is passable); obstacle rect covers full row.
