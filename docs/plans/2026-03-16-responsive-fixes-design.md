# Responsive Fixes Design — Phone Compatibility (360x780)

**Date:** 2026-03-16
**Target Device:** Samsung Galaxy S22 (360x780 viewport)
**Strategy:** Inline `Math.min()`/`Math.max()` at each call site. No utility files.

---

## WorldScene.ts

### 1. Add `baseZoom` property to class

```ts
// ADD to class properties (after line 55):
private baseZoom = 1.5;
```

### 2. Fix camera zoom — setupCamera (lines 333-340)

**Current:**
```ts
const { width, height } = this.cameras.main;
const mapW = MAP_WIDTH * TILE_SIZE;
const mapH = MAP_HEIGHT * TILE_SIZE;
const minZoomForMap = Math.max(width / mapW, height / mapH);
const targetZoom = Math.min(width / 533, height / 400);
const zoom = Phaser.Math.Clamp(Math.max(targetZoom, minZoomForMap), 0.7, 3);
this.cameras.main.setZoom(zoom);
```

**Replace with:**
```ts
const { width, height } = this.cameras.main;
const mapW = MAP_WIDTH * TILE_SIZE;
const mapH = MAP_HEIGHT * TILE_SIZE;
const minZoomForMap = Math.max(width / mapW, height / mapH);
this.baseZoom = Phaser.Math.Clamp(Math.max(1.5, minZoomForMap), 0.7, 3);
this.cameras.main.setZoom(this.baseZoom);
```

**Why:** The old formula produced zoom 0.675 on 360px (360/533), showing almost the entire map. Fixed zoom of 1.5, clamped by map bounds, gives a consistent close-up feel on all devices.

### 3. Fix resize handler (lines 321-326)

**Current:**
```ts
const mapW = MAP_WIDTH * TILE_SIZE;
const mapH = MAP_HEIGHT * TILE_SIZE;
const minZoomForMap = Math.max(gameSize.width / mapW, gameSize.height / mapH);
const targetZoom = Math.min(gameSize.width / 533, gameSize.height / 400);
const zoom = Phaser.Math.Clamp(Math.max(targetZoom, minZoomForMap), 0.7, 3);
this.cameras.main.setZoom(zoom);
```

**Replace with:**
```ts
const mapW = MAP_WIDTH * TILE_SIZE;
const mapH = MAP_HEIGHT * TILE_SIZE;
const minZoomForMap = Math.max(gameSize.width / mapW, gameSize.height / mapH);
this.baseZoom = Phaser.Math.Clamp(Math.max(1.5, minZoomForMap), 0.7, 3);
this.cameras.main.setZoom(this.baseZoom);
```

### 4. Fix checkpoint zoom (lines 601-616)

**Current:**
```ts
zoom: 1.7,  // entry
...
zoom: 1.5,  // exit
```

**Replace with:**
```ts
zoom: this.baseZoom * 1.15,  // entry
...
zoom: this.baseZoom,          // exit
```

### 5. Fix vignette borders (lines 429-433)

**Current:**
```ts
vignette.fillRect(0, 0, width, 30);
vignette.fillRect(0, height - 30, width, 30);
vignette.fillRect(0, 0, 30, height);
vignette.fillRect(width - 30, 0, 30, height);
```

**Replace with:**
```ts
const border = Math.max(10, Math.min(30, Math.min(width, height) * 0.04));
vignette.fillRect(0, 0, width, border);
vignette.fillRect(0, height - border, width, border);
vignette.fillRect(0, 0, border, height);
vignette.fillRect(width - border, 0, border, height);
```

### 6. Fix completion overlay panel (lines 692-693)

**Current:**
```ts
const panelW = 400;
const panelH = 200;
```

**Replace with:**
```ts
const panelW = Math.min(400, width * 0.9);
const panelH = Math.min(200, height * 0.4);
```

### 7. Fix completion overlay text (lines 700-707)

Add word wrap and responsive title font:

**Current:**
```ts
const title = this.add.text(width / 2, height / 2 - 40, 'You visited all our places!', {
  fontSize: '28px', color: '#ffd700', align: 'center',
}).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
```

**Replace with:**
```ts
const titleFs = Math.min(28, Math.round(width * 0.07));
const title = this.add.text(width / 2, height / 2 - 40, 'You visited all our places!', {
  fontSize: `${titleFs}px`, color: '#ffd700', align: 'center',
  wordWrap: { width: panelW - 40 },
}).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
```

Add wordWrap to the message text too:
```ts
const msg = this.add.text(width / 2, height / 2 + 20, 'Thank you for being my favourite person.', {
  fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
  wordWrap: { width: panelW - 40 },
}).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
```

---

## QuizGame.ts

### 1. Question text wordWrap (line 80)

**Current:** `wordWrap: { width: 600 }`
**Replace:** `wordWrap: { width: Math.min(600, width * 0.85) }`

### 2. Answer button width (line 91)

**Current:** `width: 500`
**Replace:** `width: Math.min(500, width * 0.85)`

### 3. Answer button Y spacing (line 87)

**Current:** `height / 2 + i * 60`
**Replace:** `height / 2 + i * Math.min(60, height * 0.08)`

### 4. Results panel (lines 122-123)

**Current:**
```ts
const panelW = 360;
const panelH = 240;
```

**Replace with:**
```ts
const panelW = Math.min(360, width * 0.9);
const panelH = Math.min(240, height * 0.4);
```

---

## MemoryCard.ts

### 1. Card dimensions (lines 37-38)

**Current:**
```ts
const cardW = 420;
const cardH = 480;
```

**Replace with:**
```ts
const cardW = Math.min(420, width * 0.92);
const cardH = Math.min(480, height * 0.75);
```

### 2. Photo display size (line 80)

**Current:** `photo.setDisplaySize(380, 180);`
**Replace:** `photo.setDisplaySize(Math.min(380, cardW - 40), Math.min(180, cardH * 0.35));`

### 3. Message text wordWrap (line 96)

**Current:** `wordWrap: { width: 360 }`
**Replace:** `wordWrap: { width: Math.min(360, cardW - 60) }`

---

## MatchGame.ts

### 1. Add card dimension properties to class

```ts
// ADD to class properties:
private cardW = 140;
private cardH = 60;
```

### 2. Dynamic grid layout (lines 82-87)

**Current:**
```ts
const cols = 4;
const cardW = 140;
const cardH = 60;
const gap = 10;
const startX = width / 2 - ((cols * (cardW + gap)) - gap) / 2 + cardW / 2;
const startY = 90 + cardH / 2;
```

**Replace with:**
```ts
const gap = 10;
const availW = width - 20;
const cols = availW >= 580 ? 4 : availW >= 340 ? 3 : 2;
const cardW = Math.floor((availW - (cols - 1) * gap) / cols);
const cardH = Math.min(60, Math.round(cardW * 0.43));
this.cardW = cardW;
this.cardH = cardH;
const startX = width / 2 - ((cols * (cardW + gap)) - gap) / 2 + cardW / 2;
const startY = 90 + cardH / 2;
```

**Phone (360px):** `availW=340`, `cols=3`, `cardW=106`, `cardH=46`. 3 rows for 8 cards. Fits perfectly.

### 3. Card text wordWrap (line 106)

Add wordWrap to prevent text overflow on narrower cards:

**Current:**
```ts
const label = this.add.text(x, y, '?', {
  fontSize: '14px', color: '#666',
  fontFamily: 'Georgia, serif',
}).setOrigin(0.5);
```

**Replace with:**
```ts
const label = this.add.text(x, y, '?', {
  fontSize: '14px', color: '#666',
  fontFamily: 'Georgia, serif',
  wordWrap: { width: cardW - 10 },
  align: 'center',
}).setOrigin(0.5);
```

### 4. flipCard card dimensions (line 133)

**Current:** `const { width: cardW, height: cardH } = { width: 140, height: 60 };`
**Replace:** `const cardW = this.cardW; const cardH = this.cardH;`

### 5. checkMatch card dimensions (line 176-177)

**Current:** `const cardW = 140; const cardH = 60;`
**Replace:** `const cardW = this.cardW; const cardH = this.cardH;`

### 6. Results panel (lines 253-254)

**Current:** `const panelW = 320; const panelH = 220;`
**Replace:** `const panelW = Math.min(320, width * 0.9); const panelH = Math.min(220, height * 0.4);`

---

## CatchGame.ts

### 1. Results panel (lines 230-231)

**Current:** `const panelW = 320; const panelH = 220;`
**Replace:** `const panelW = Math.min(320, width * 0.9); const panelH = Math.min(220, height * 0.4);`

---

## CookingGame.ts

### 1. Order display panel width (line 83)

**Current:**
```ts
this.orderPanel = createPanel(this, width / 2 - 160, 75, 320, 60, {
```

**Replace with:**
```ts
const orderPanelW = Math.min(320, width * 0.9);
this.orderPanel = createPanel(this, width / 2 - orderPanelW / 2, 75, orderPanelW, 60, {
```

### 2. Item button spacing (line 113)

**Current:**
```ts
width / 2 - ((itemList.length - 1) * 80) / 2 + i * 80,
```

**Replace with:**
```ts
const itemSpacing = Math.min(80, (width - 40) / itemList.length);
// ... then in the forEach:
width / 2 - ((itemList.length - 1) * itemSpacing) / 2 + i * itemSpacing,
```

**Note:** `itemSpacing` must be computed before the `forEach` loop.

### 3. Results panel (lines 230-231)

**Current:** `const panelW = 320; const panelH = 220;`
**Replace:** `const panelW = Math.min(320, width * 0.9); const panelH = Math.min(220, height * 0.4);`

---

## PuzzleGame.ts

### 1. Tile size (line 64)

**Current:** `const tileSize = 80;`
**Replace:**
```ts
const tileSize = Math.min(80, Math.floor((Math.min(width, height) - 120) / this.gridSize) - 4);
```

On 360px with 3x3: `Math.floor((360 - 120) / 3) - 4 = 76px`. Close to 80, slightly smaller. Fits well.

### 2. Results panel (lines 229-230)

**Current:** `const panelW = 320; const panelH = 220;`
**Replace:** `const panelW = Math.min(320, width * 0.9); const panelH = Math.min(220, height * 0.4);`

---

## DressingRoomScene.ts

### 1. Arrow button spacing (lines 72, 80)

**Current:**
```ts
const leftArrow = createStyledButton(this, width / 2 - 120, height - 150, '<', {
const rightArrow = createStyledButton(this, width / 2 + 120, height - 150, '>', {
```

**Replace with:**
```ts
const arrowSpacing = Math.min(120, width * 0.28);
const leftArrow = createStyledButton(this, width / 2 - arrowSpacing, height - 150, '<', {
// ...
const rightArrow = createStyledButton(this, width / 2 + arrowSpacing, height - 150, '>', {
```

On 360px: `360 * 0.28 = 100px`. Arrows at +-100px from center (160px and 260px), well within 360px.

---

## MenuScene.ts

### 1. Title font size (line 36)

**Current:** `fontSize: '56px'`
**Replace:** `` fontSize: `${Math.min(56, Math.round(width * 0.12))}px` ``

On 360px: `Math.round(360 * 0.12) = 43px`. Readable, proportionate.

---

## Summary

| File | Changes | Pattern |
|------|---------|---------|
| WorldScene.ts | 7 changes | baseZoom prop, fixed 1.5 zoom, relative checkpoint zoom, responsive vignette/panel |
| QuizGame.ts | 4 changes | `Math.min(hardcoded, width * frac)` on text wrap, buttons, panel |
| MemoryCard.ts | 3 changes | Responsive card/photo/text |
| MatchGame.ts | 6 changes | Dynamic columns, stored card dims, responsive panel |
| CatchGame.ts | 1 change | Responsive panel |
| CookingGame.ts | 3 changes | Responsive panel, order panel, item spacing |
| PuzzleGame.ts | 2 changes | Responsive tile size, panel |
| DressingRoomScene.ts | 1 change | Arrow spacing |
| MenuScene.ts | 1 change | Title font size |

**Total: 28 changes across 9 files. Zero new files. Zero abstractions.**
