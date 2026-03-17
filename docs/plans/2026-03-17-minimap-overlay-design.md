# Minimap/Map Overlay — Design Document

## Requirements

- Bird's-eye minimap: zoomed-out view of the entire tilemap, player position as a blinking dot
- HUD button (next to settings gear) + `M` keyboard shortcut to open/close
- Player dot + checkpoint markers (visited vs unvisited) + text labels for area names
- System supports any overworld scene; only WorldScene map data implemented initially

## Approach: HTML Canvas Overlay

The entire UI system is DOM-based (`UIManager` singleton). A `<canvas>` element in `#hud` follows this pattern exactly — no interference with Phaser's camera/render pipeline, full control over markers and labels, and consistent with every other overlay in the codebase.

Rejected alternatives:
- **Second Phaser camera** — breaks DOM-based UI convention; markers/labels as GameObjects fight scene object management; camera zoom interactions with main camera
- **RenderTexture sprite** — same GameObjects-as-UI problem; heavyweight snapshot for a minimap

## Architecture

```
OverworldScene
  ├── player.getPosition()  ──┐
  ├── cachedConfig            ──┼──> MinimapRenderer
  └── inputSystem (M key)   ──┘        │
                                         ▼
UIManager (DOM)
  #hud
    ├── .hud (settings gear + map button)
    └── #minimap-overlay
          ├── .minimap-header (title + close btn)
          ├── <canvas> (tilemap + markers)
          └── .minimap-legend
```

## New File: `src/ui/MinimapRenderer.ts` (~180 lines)

Plain TypeScript class (not a Phaser GameObject).

### Constructor

```ts
constructor(
  scene: Phaser.Scene,       // for texture manager + player position
  config: OverworldConfig,   // reuse existing config — has everything needed
  labelMap: Record<string, string>,  // checkpoint id → display name
)
```

The `labelMap` bridges the gap between `CheckpointZone` (which has `id` and `promptText` but no display name) and the minimap labels. Each scene passes its own label map.

### Public API

- `open(): void` — creates DOM, draws static layer, starts update interval
- `close(): void` — removes DOM, cancels interval
- `toggle(): void`
- `isOpen: boolean` (getter)
- `destroy(): void` — full cleanup, called on scene shutdown

### Two-Layer Rendering

**Static layer (tilemap)** — drawn once onto an offscreen canvas when `open()` is called:
- Get tileset source image: `scene.textures.get(config.terrainTextureKey).getSourceImage()`
- Get frame data for each tile type: `scene.textures.get(key).get(frameIndex)` → `cutX`, `cutY`, `cutWidth`, `cutHeight`
- Draw each tile at minimap scale onto the offscreen canvas

**Dynamic layer (markers + player)** — redrawn via `scene.time.addEvent()` every ~250ms:
- Composite static layer onto visible canvas via `drawImage()`
- Draw checkpoint markers: gold filled circle (visited) or purple stroked circle (unvisited)
- Draw text labels below each marker
- Draw player dot with CSS-animated blink (separate `<div>` positioned via `style.left/top`)

### Coordinate Projection

```ts
canvasX = worldX * (canvasWidth / mapPixelWidth)
canvasY = worldY * (canvasHeight / mapPixelHeight)
```

### Canvas Sizing

Max bounding box: **320x320 CSS pixels**. Map fits within it preserving aspect ratio:
- WorldScene (1280x1216, ~1.05:1): renders ~320x304
- MauiOverworldScene (1440x960, 1.5:1): renders ~320x213

At these dimensions each 32px tile ≈ 8px on the minimap — legible for colored rectangles.

Use 1:1 canvas pixels with `image-rendering: pixelated` CSS. No 2x ratio needed for pixel art.

## New File: `src/ui/styles/minimap.css` (~60 lines)

Linked from `index.html` alongside other CSS files.

Key styles:
- `#minimap-overlay`: `position: absolute` within `#hud`, centered, `background: rgba(0,0,0,0.85)`, `border: 2px solid #d4a574`, `border-radius: 8px`, `pointer-events: auto`, `z-index: 100`
- `.minimap-backdrop`: full-screen transparent overlay behind the map panel, receives clicks to close (matches dialog pattern)
- `.minimap-canvas`: `image-rendering: pixelated`
- `.minimap-header`: `font-family: 'Press Start 2P'`, `color: #d4a574`
- `.minimap-legend`: `font-family: 'Inter'`, `color: #ccc`
- `.minimap-player-dot`: absolute-positioned div with CSS `@keyframes blink` animation (coral color, toggles opacity)
- Fade-in via CSS `opacity` transition (150ms)

## Modified: `src/ui/UIManager.ts` (~10 lines added)

Add the map button inside `showHUD()`, next to the existing settings gear:

```ts
showHUD(): void {
  // ... existing gear button ...
  const mapBtn = document.createElement('button');
  mapBtn.className = 'hud__map-btn';
  mapBtn.title = 'Map';
  mapBtn.textContent = '\u{1F5FA}'; // or a grid icon
  mapBtn.addEventListener('click', () => this.minimapHandler?.());
  hudEl.appendChild(mapBtn);
}
```

New methods:
- `setMinimapHandler(handler: () => void): void` — stores callback, like `setSettingsHandler()`
- `removeMinimapHandler(): void` — cleanup

## Modified: `src/game/systems/InputSystem.ts` (~5 lines added)

Add `M` key alongside existing keys:

```ts
private mapKey!: Phaser.Input.Keyboard.Key;
// In constructor:
this.mapKey = scene.input.keyboard.addKey('M');

isMapPressed(): boolean {
  if (this.frozen) return false;
  return this.mapKey?.isDown || false;
}
```

## Modified: `src/game/scenes/OverworldScene.ts` (~25 lines added)

In `create()`, after HUD setup:
1. Create `MinimapRenderer` using `this.cachedConfig` + scene-specific `getLabelMap()`
2. Register `uiManager.setMinimapHandler(() => this.minimap.toggle())`
3. In `update()`, check `this.inputSystem.isMapPressed()` with cooldown, toggle minimap (only if no dialog active)
4. In `shutdown()`, call `this.minimap.destroy()` and `uiManager.removeMinimapHandler()`

New abstract method:
```ts
abstract getLabelMap(): Record<string, string>;
```

## Modified: `src/game/scenes/WorldScene.ts` (~15 lines added)

```ts
getLabelMap(): Record<string, string> {
  return {
    restaurant: 'Restaurant',
    park: 'Park',
    cinema: 'Cinema',
    michaels_house: "Michael's House",
    hadars_house: "Hadar's House",
    airport: 'Airport',
  };
}
```

## Modified: `src/game/scenes/maui/MauiOverworldScene.ts` (~10 lines added)

```ts
getLabelMap(): Record<string, string> {
  return {
    maui_hotel: 'Airbnb',
    maui_tennis: 'Tennis Court',
    maui_surfing: 'Surf Spot',
    maui_taxi: 'Taxi Stand',
  };
}
```

## Modified: `index.html` (1 line)

Add CSS link:
```html
<link rel="stylesheet" href="/src/ui/styles/minimap.css" />
```

## DOM Structure

```html
<!-- Inside #hud, created by MinimapRenderer.open() -->
<div id="minimap-overlay" class="minimap-backdrop">
  <div class="minimap-panel">
    <div class="minimap-header">
      <span class="minimap-title">Map</span>
      <button class="minimap-close btn btn--icon">&times;</button>
    </div>
    <div class="minimap-canvas-wrap">
      <canvas class="minimap-canvas" width="320" height="304" />
      <div class="minimap-player-dot" />
    </div>
    <div class="minimap-legend">
      <span class="legend-item legend-item--visited">&#9679; Visited</span>
      <span class="legend-item legend-item--unvisited">&#9675; Unvisited</span>
    </div>
  </div>
</div>
```

## Edge Cases

| Case | Handling |
|---|---|
| Scene transition while open | `shutdown` event calls `destroy()` which calls `close()` |
| `M` pressed during dialog | Check `UIManager` active overlays before toggling; if dialog open, ignore |
| Rapid open/close toggle | `isOpen` flag gates both paths, no-op if already in target state |
| SaveSystem not loaded | Empty visited array → all markers render as unvisited |
| Tap outside map panel | `.minimap-backdrop` click handler calls `close()` (matches dialog pattern) |
| ESC key while map open | `isBackPressed()` check in update → close minimap before doing scene-level back |
| Window resize | `position: absolute` within `#hud` handles repositioning via CSS |

## Data Flow

1. Player presses M or taps map button
2. `MinimapRenderer.open()`:
   - Creates DOM elements, appends to `#hud`
   - Gets tileset source image from Phaser texture manager
   - Gets frame data for each tile type
   - Draws tilemap onto offscreen canvas (once, cached)
   - Gets visited checkpoints from `SaveSystem`
   - Draws checkpoint markers + labels onto visible canvas
   - Positions player dot via CSS
   - Starts Phaser time event for position updates (~250ms)
3. Each update tick:
   - Reads `player.getPosition()` from scene
   - Updates player dot CSS position
   - Optionally re-reads visited state (cheap array lookup)
4. Player closes map (M, close button, ESC, tap backdrop)
5. `MinimapRenderer.close()`:
   - Cancels Phaser time event
   - Removes DOM elements

## Implementation Order

1. `minimap.css` + `index.html` link
2. `MinimapRenderer` — static layer only (tilemap drawing)
3. `UIManager` — map button + handler
4. `InputSystem` — M key
5. `OverworldScene` — wiring, lifecycle, abstract `getLabelMap()`
6. `WorldScene.getLabelMap()` — first scene
7. Dynamic layer — checkpoint markers, labels, player dot, blink
8. `MauiOverworldScene.getLabelMap()` — second scene
9. Polish — ESC to close, dialog-active guard, backdrop click, fade transition

## File Summary

| File | Change | Est. Lines |
|---|---|---|
| `src/ui/MinimapRenderer.ts` | NEW | ~180 |
| `src/ui/styles/minimap.css` | NEW | ~60 |
| `index.html` | ADD css link | 1 |
| `src/ui/UIManager.ts` | ADD map button + handler | ~10 |
| `src/game/systems/InputSystem.ts` | ADD M key | ~5 |
| `src/game/scenes/OverworldScene.ts` | ADD minimap init, update, shutdown, abstract method | ~25 |
| `src/game/scenes/WorldScene.ts` | ADD getLabelMap() | ~12 |
| `src/game/scenes/maui/MauiOverworldScene.ts` | ADD getLabelMap() | ~10 |

**Total: ~240 new lines, ~60 modified lines across 6 existing files.**
