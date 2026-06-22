# Task 4 Report: Restructure MAP into the City + Highway

## Status: DONE

## Commit

`2e97f7d feat(world): restructure map into a city grid with building rows + highway`

## tsc Result

`npx tsc --noEmit` — clean, no output (exit 0).

## MAP Changes (src/world/map.ts)

### Step 1: World size + grid
- `GROUND_SIZE`: 220 → **280**
- `cityGrid` params: `{ pitch:56, half:1, length:140, seed:1 }` → `{ pitch:56, half:2, length:260, seed:1 }`
- `PLAYER_SPAWN`, `CAR_SPAWN`, `pavement` unchanged.

### Step 2: Core kept unchanged
All of the following were left intact:
- `...lot(phoneRepairShop, ...)` block
- `...lot(restaurant, ...)` block
- `{ kind:"terraceRow", x:28, z:12, rot:180, ... }` (SE block)
- `{ kind:"plaza", x:-28, z:28, ... }`
- Two `kioskCart` placements
- Four `trafficLight` placements

### Step 3: 12 buildingRow placements added (outer-ring blocks only)
North band (z=-84, rot:0, district:"north"):
- x=-84, seed:61
- x=-28, seed:62
- x=28,  seed:63
- x=84,  seed:64

South band (z=84, rot:180, district:"east"):
- x=-84, seed:65
- x=-28, seed:66
- x=28,  seed:67
- x=84,  seed:68

West band (x=-84, rot:90, district:"west"):
- z=-28, seed:71
- z=28,  seed:72

East band (x=84, rot:270, district:"west"):
- z=-28, seed:73
- z=28,  seed:74

All rows: units:3, d:12, anchor:"center".

### Step 4: Removed 4 standalone fillerBuilding tower lines
Deleted:
- `{ kind:"fillerBuilding", x:-40, z:-68, ... seed:21 }`
- `{ kind:"fillerBuilding", x:-14, z:-72, ... seed:22 }`
- `{ kind:"fillerBuilding", x:12,  z:-70, ... seed:23 }`
- `{ kind:"fillerBuilding", x:38,  z:-68, ... seed:24 }`

### Step 5: Highway placement added
```
{ kind:"highway", x:0, z:-128, rot:0, params:{ length:260, lanes:2, laneW:3.6, medianW:4, shoulderW:1.2, gantry:true, seed:1 } }
```
Highway spans z ∈ [-138.4, -117.6] — inside the 280m world edge (-140).

### Steps 6-7: Header comment updated
Comment block now accurately states: 280m world, 5×5 arterials, half=2, outer-ring block centres ±84, highway at z=-128.

## Static No-Overlap Confirmation (Step 7)

- **North buildingRow footprints**: centred at z=-84, depth 12 → z ∈ [-90, -78]. No overlap with inner blocks (|z| ≤ ~30+12).
- **South buildingRow footprints**: centred at z=84 → z ∈ [78, 90]. No overlap with inner blocks.
- **West buildingRow footprints**: centred at x=-84, run ≈40.5m centred at z=-28 and z=28. Separate block positions.
- **East buildingRow footprints**: centred at x=84, z=-28 and z=28. Separate.
- **Highway footprint**: z ∈ [-138.4, -117.6]. Northernmost building row reaches z≈-78. Gap of ~39.6m between closest building and highway — no overlap.
- **Inner core** (terraceRow, stores, plaza, kiosks, traffic lights) all at |x|,|z| ≤ ~40 — untouched and far from every new outer-band row.
- No two placed footprint AABBs intersect.

## Final Placement List

1. ground (size:280)
2. cityGrid (pitch:56, half:2, length:260, seed:1)
3. pavement (w:112, d:112)
4-10. phoneRepairShop lot (via ...lot spread, 7 props)
11-14. restaurant lot (via ...lot spread, 4 props)
15. terraceRow x:28 z:12 rot:180
16-19. buildingRow north band (x:-84,-28,28,84, z:-84)
20-23. buildingRow south band (x:-84,-28,28,84, z:84)
24-25. buildingRow west band (x:-84, z:-28,28)
26-27. buildingRow east band (x:84, z:-28,28)
28. highway x:0 z:-128 (gantry:true)
29. plaza x:-28 z:28
30. kioskCart x:-14 z:8
31. kioskCart x:-20 z:8
32. trafficLight x:7 z:7 rot:0
33. trafficLight x:-7 z:-7 rot:180
34. trafficLight x:7 z:-7 rot:270
35. trafficLight x:-7 z:7 rot:90
