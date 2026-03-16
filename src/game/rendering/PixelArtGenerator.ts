// src/game/rendering/PixelArtGenerator.ts
// Generates all game textures as pixel art using Canvas 2D

type Ctx = CanvasRenderingContext2D;

// ── helpers ──────────────────────────────────────────────────────────────

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function darken(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = amount;
  return `#${Math.min(255, Math.round(r + (255 - r) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(g + (255 - g) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(b + (255 - b) * f)).toString(16).padStart(2, '0')}`;
}

// Seeded random for deterministic patterns
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── terrain ──────────────────────────────────────────────────────────────

function drawTerrainTile(ctx: Ctx, offsetX: number, type: 'grass' | 'dirt' | 'stone' | 'darkgrass'): void {
  const colors: Record<string, { base: string; detail: string; accent: string }> = {
    grass:     { base: '#4a7c4f', detail: '#3d6b42', accent: '#5a9c5f' },
    dirt:      { base: '#c4a265', detail: '#a88b52', accent: '#d4b87a' },
    stone:     { base: '#8a8a8a', detail: '#737373', accent: '#9e9e9e' },
    darkgrass: { base: '#3a6b3f', detail: '#2d5832', accent: '#4a8b4f' },
  };
  const c = colors[type];
  const rng = seededRandom(offsetX * 17 + type.length * 31);

  // Base fill
  rect(ctx, offsetX, 0, 32, 32, c.base);

  // Scatter detail pixels for texture
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, rng() > 0.5 ? c.detail : c.accent);
  }

  // Type-specific details
  if (type === 'grass' || type === 'darkgrass') {
    // Grass blades
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 28) + 2;
      px(ctx, offsetX + x, y, c.accent);
      px(ctx, offsetX + x, y - 1, lighten(c.accent, 0.15));
    }
  } else if (type === 'dirt') {
    // Pebbles
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rng() * 28) + 2;
      const y = Math.floor(rng() * 28) + 2;
      px(ctx, offsetX + x, y, '#9a8255');
      px(ctx, offsetX + x + 1, y, '#b09a65');
    }
  } else if (type === 'stone') {
    // Cracks
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(rng() * 24) + 4;
      const y = Math.floor(rng() * 24) + 4;
      for (let j = 0; j < 4; j++) {
        px(ctx, offsetX + x + j, y + (j % 2), c.detail);
      }
    }
  }
}

export function generateTerrain(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('terrain', 128, 32);
  if (!canvas) return;
  const ctx = canvas.context;
  drawTerrainTile(ctx, 0, 'grass');
  drawTerrainTile(ctx, 32, 'dirt');
  drawTerrainTile(ctx, 64, 'stone');
  drawTerrainTile(ctx, 96, 'darkgrass');
  canvas.refresh();
}

// ── characters ───────────────────────────────────────────────────────────

// Draws a single character frame at (fx, fy) within a 32x32 cell.
// direction: 0=down, 1=left, 2=right, 3=up
// frame: 0=stand, 1=walk-left, 2=walk-right
function drawCharFrame(
  ctx: Ctx, fx: number, fy: number,
  direction: number, frame: number,
  outfit: { shirt: string; pants: string; shoes: string; hair: string; skin: string; accent: string },
  isPartner: boolean,
): void {
  const ox = fx * 32;
  const oy = fy * 32;

  // Walk bobbing
  const bob = frame === 0 ? 0 : (frame === 1 ? -1 : 1);
  const legSpread = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  // Skin color
  const skin = outfit.skin;
  const skinShadow = darken(skin, 0.15);

  // ── Head (6x6 centered at top) ──
  const headX = ox + 13;
  const headY = oy + 6 + (bob > 0 ? 1 : 0);

  // Head base
  rect(ctx, headX, headY, 6, 6, skin);
  // Head shadow on left
  rect(ctx, headX, headY, 1, 6, skinShadow);

  // Hair
  const hairColor = outfit.hair;
  const hairDark = darken(hairColor, 0.2);
  if (direction === 0) {
    // Facing down — hair on top
    rect(ctx, headX - 1, headY - 1, 8, 2, hairColor);
    rect(ctx, headX - 1, headY, 1, 3, hairColor); // left side
    rect(ctx, headX + 6, headY, 1, 3, hairColor);  // right side
    // Eyes
    px(ctx, headX + 1, headY + 2, '#222');
    px(ctx, headX + 4, headY + 2, '#222');
    // Mouth
    px(ctx, headX + 2, headY + 4, '#c77');
    px(ctx, headX + 3, headY + 4, '#c77');
  } else if (direction === 3) {
    // Facing up — all hair visible
    rect(ctx, headX - 1, headY - 1, 8, 7, hairColor);
    rect(ctx, headX, headY, 6, 5, hairDark); // depth
  } else {
    // Side view (left or right)
    const flip = direction === 2;
    rect(ctx, headX - 1, headY - 1, 8, 2, hairColor);
    if (flip) {
      rect(ctx, headX + 6, headY, 1, 4, hairColor);
      // Eye
      px(ctx, headX + 4, headY + 2, '#222');
    } else {
      rect(ctx, headX - 1, headY, 1, 4, hairColor);
      // Eye
      px(ctx, headX + 1, headY + 2, '#222');
    }
  }

  // ── Body / Shirt (8x6) ──
  const bodyX = ox + 12;
  const bodyY = headY + 6;
  rect(ctx, bodyX, bodyY, 8, 6, outfit.shirt);
  rect(ctx, bodyX, bodyY, 1, 6, darken(outfit.shirt, 0.15)); // shadow edge
  // Collar / accent
  rect(ctx, bodyX + 2, bodyY, 4, 1, outfit.accent);

  // Arms
  const armY = bodyY + 1;
  if (direction === 1 || direction === 2) {
    // Side view — one arm visible
    const armX = direction === 2 ? bodyX + 7 : bodyX;
    rect(ctx, armX, armY + bob, 2, 5, skin);
    rect(ctx, armX, armY + bob, 2, 3, outfit.shirt); // sleeve
  } else {
    // Front/back — both arms
    rect(ctx, bodyX - 2, armY + Math.abs(bob), 2, 5, skin);
    rect(ctx, bodyX - 2, armY + Math.abs(bob), 2, 3, outfit.shirt);
    rect(ctx, bodyX + 8, armY + Math.max(0, -bob), 2, 5, skin);
    rect(ctx, bodyX + 8, armY + Math.max(0, -bob), 2, 3, outfit.shirt);
  }

  // ── Legs / Pants (6x5) ──
  const legY = bodyY + 6;
  const pantsColor = outfit.pants;
  // Left leg
  rect(ctx, bodyX + 1 + legSpread, legY, 3, 5, pantsColor);
  // Right leg
  rect(ctx, bodyX + 4 - legSpread, legY, 3, 5, pantsColor);

  // ── Shoes (3x1 each) ──
  const shoeY = legY + 5;
  rect(ctx, bodyX + 1 + legSpread, shoeY, 3, 1, outfit.shoes);
  rect(ctx, bodyX + 4 - legSpread, shoeY, 3, 1, outfit.shoes);

  // Partner indicator — small heart/bow
  if (isPartner) {
    px(ctx, headX + 6, headY - 1, '#ff69b4');
    px(ctx, headX + 7, headY - 1, '#ff69b4');
  }
}

const OUTFIT_STYLES: Array<{
  shirt: string; pants: string; shoes: string; hair: string; skin: string; accent: string;
}> = [
  { shirt: '#4488cc', pants: '#334466', shoes: '#553322', hair: '#8B4513', skin: '#f5d0a9', accent: '#ffffff' }, // Casual
  { shirt: '#222222', pants: '#1a1a2e', shoes: '#111111', hair: '#1a1a1a', skin: '#f5d0a9', accent: '#cc9944' }, // Formal
  { shirt: '#ff7744', pants: '#44aacc', shoes: '#ddcc88', hair: '#daa520', skin: '#d4a574', accent: '#ffffff' }, // Beach
  { shirt: '#8844aa', pants: '#555577', shoes: '#443322', hair: '#4a2511', skin: '#f5d0a9', accent: '#dddddd' }, // Winter
  { shirt: '#222222', pants: '#111111', shoes: '#222222', hair: '#1a1a1a', skin: '#e8c8a0', accent: '#cc2222' }, // Gothic
  { shirt: '#44cc44', pants: '#333333', shoes: '#ffffff', hair: '#c47a34', skin: '#f5d0a9', accent: '#ffcc00' }, // Sporty
  { shirt: '#ff44cc', pants: '#ffffff', shoes: '#ff8844', hair: '#ff4488', skin: '#f0c8a0', accent: '#44ffcc' }, // Festival
  { shirt: '#cc9944', pants: '#222244', shoes: '#443322', hair: '#2c1810', skin: '#f5d0a9', accent: '#ffeedd' }, // Elegant
];

export function generateCharacterOutfits(scene: Phaser.Scene): void {
  for (let c = 0; c < 2; c++) {
    const prefix = c === 0 ? 'player' : 'partner';
    const isPartner = c === 1;

    for (let o = 0; o < 8; o++) {
      const key = `${prefix}-outfit-${o}`;
      const canvas = scene.textures.createCanvas(key, 96, 128);
      if (!canvas) continue;
      const ctx = canvas.context;

      const style = OUTFIT_STYLES[o];
      // Partner gets slightly different skin/hair tones
      const outfit = isPartner
        ? { ...style, skin: lighten(style.skin, 0.05), hair: lighten(style.hair, 0.1) }
        : style;

      // 4 rows (directions: down, left, right, up) × 3 cols (frames)
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 3; frame++) {
          drawCharFrame(ctx, frame, dir, dir, frame, outfit, isPartner);
        }
      }
      canvas.refresh();

      // Register spritesheet frames (3 cols × 4 rows, 32×32 each)
      const texture = scene.textures.get(key);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          texture.add(row * 3 + col, 0, col * 32, row * 32, 32, 32);
        }
      }
    }
  }
}

// ── NPC ──────────────────────────────────────────────────────────────────

export function generateNPC(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('npc-default', 32, 32);
  if (!canvas) return;
  const ctx = canvas.context;

  const skin = '#d4a574';
  const robe = '#6644aa';

  // Head
  rect(ctx, 13, 6, 6, 6, skin);
  // Hair / hat
  rect(ctx, 12, 4, 8, 3, '#554488');
  // Eyes
  px(ctx, 14, 8, '#222');
  px(ctx, 17, 8, '#222');
  // Robe body
  rect(ctx, 11, 12, 10, 8, robe);
  rect(ctx, 11, 12, 10, 1, lighten(robe, 0.2));
  // Legs
  rect(ctx, 13, 20, 3, 4, '#554488');
  rect(ctx, 16, 20, 3, 4, '#554488');
  // Feet
  rect(ctx, 13, 24, 3, 1, '#443322');
  rect(ctx, 16, 24, 3, 1, '#443322');

  canvas.refresh();
}

// ── buildings ────────────────────────────────────────────────────────────

function drawRestaurant(ctx: Ctx): void {
  // Wall
  rect(ctx, 8, 30, 80, 58, '#cc8855');
  rect(ctx, 8, 30, 80, 3, darken('#cc8855', 0.1));

  // Roof
  for (let i = 0; i < 12; i++) {
    rect(ctx, 4 + i, 18 + i, 88 - i * 2, 1, i % 2 === 0 ? '#aa3322' : '#993322');
  }

  // Door
  rect(ctx, 38, 56, 20, 32, '#664422');
  rect(ctx, 38, 56, 20, 2, '#553311');
  // Doorknob
  px(ctx, 54, 72, '#ccaa44');
  px(ctx, 55, 72, '#ccaa44');

  // Windows
  for (const wx of [14, 62]) {
    rect(ctx, wx, 40, 14, 14, '#88ccff');
    rect(ctx, wx, 40, 14, 1, '#666');
    rect(ctx, wx, 40, 1, 14, '#666');
    rect(ctx, wx + 13, 40, 1, 14, '#666');
    rect(ctx, wx, 53, 14, 1, '#666');
    // Cross bar
    rect(ctx, wx + 6, 40, 2, 14, '#666');
    rect(ctx, wx, 46, 14, 2, '#666');
    // Warm glow
    rect(ctx, wx + 2, 42, 4, 4, '#ffeeaa');
  }

  // Sign
  rect(ctx, 30, 22, 36, 8, '#ffeedd');
  rect(ctx, 30, 22, 36, 1, '#aa8866');
  // "FOOD" text in pixels
  const foodPixels = [
    // F
    [32, 24], [32, 25], [32, 26], [32, 27], [33, 24], [34, 24], [33, 26],
    // O
    [37, 24], [37, 25], [37, 26], [37, 27], [38, 24], [39, 24], [38, 27], [39, 27], [40, 24], [40, 25], [40, 26], [40, 27],
    // O
    [42, 24], [42, 25], [42, 26], [42, 27], [43, 24], [44, 24], [43, 27], [44, 27], [45, 24], [45, 25], [45, 26], [45, 27],
    // D
    [47, 24], [47, 25], [47, 26], [47, 27], [48, 24], [49, 24], [48, 27], [49, 27], [50, 25], [50, 26],
  ];
  foodPixels.forEach(([x, y]) => px(ctx, x, y, '#884422'));

  // Awning stripes
  for (let i = 0; i < 80; i += 8) {
    rect(ctx, 8 + i, 30, 4, 3, '#cc3333');
  }
}

function drawParkEntrance(ctx: Ctx): void {
  // Ground
  rect(ctx, 0, 70, 96, 26, '#5a8a4f');

  // Path
  rect(ctx, 32, 60, 32, 36, '#c4a265');
  rect(ctx, 34, 62, 28, 34, '#d4b87a');

  // Arch posts
  rect(ctx, 24, 16, 8, 60, '#8B7355');
  rect(ctx, 64, 16, 8, 60, '#8B7355');
  // Post detail
  rect(ctx, 24, 16, 8, 3, '#a08060');
  rect(ctx, 64, 16, 8, 3, '#a08060');

  // Arch top
  for (let i = 0; i < 5; i++) {
    rect(ctx, 24 + i * 2, 12 + i, 48 - i * 4, 2, i < 2 ? '#6a5a3a' : '#8B7355');
  }

  // "PARK" sign
  rect(ctx, 34, 14, 28, 8, '#44774a');
  rect(ctx, 34, 14, 28, 1, '#55885a');

  // Trees on sides
  // Left tree
  rect(ctx, 6, 30, 4, 30, '#6B4226');
  rect(ctx, 0, 14, 16, 20, '#2d6b2f');
  rect(ctx, 2, 10, 12, 8, '#3a8a3f');
  rect(ctx, 4, 6, 8, 6, '#4a9a4f');

  // Right tree
  rect(ctx, 82, 30, 4, 30, '#6B4226');
  rect(ctx, 76, 14, 16, 20, '#2d6b2f');
  rect(ctx, 78, 10, 12, 8, '#3a8a3f');
  rect(ctx, 80, 6, 8, 6, '#4a9a4f');

  // Fence segments
  for (let x = 0; x < 24; x += 4) {
    rect(ctx, x, 56, 2, 18, '#8B7355');
    rect(ctx, x, 56, 4, 2, '#a08060');
  }
  for (let x = 72; x < 96; x += 4) {
    rect(ctx, x, 56, 2, 18, '#8B7355');
    rect(ctx, x, 56, 4, 2, '#a08060');
  }

  // Flowers along path
  const flowerColors = ['#ff6688', '#ffaa44', '#ff44aa', '#ffff44'];
  for (let i = 0; i < 4; i++) {
    px(ctx, 28 + i * 2, 66, flowerColors[i]);
    px(ctx, 66 + i * 2, 68, flowerColors[(i + 2) % 4]);
  }
}

function drawCinema(ctx: Ctx): void {
  // Main wall
  rect(ctx, 4, 24, 88, 68, '#3a3a5a');
  rect(ctx, 4, 24, 88, 2, '#4a4a6a');

  // Marquee
  rect(ctx, 8, 12, 80, 14, '#cc2244');
  rect(ctx, 8, 12, 80, 2, '#dd3355');
  // Marquee lights
  for (let x = 10; x < 86; x += 4) {
    px(ctx, x, 14, '#ffff88');
    px(ctx, x, 24, '#ffff88');
  }

  // "CINEMA" text
  const letterW = 8;
  const letters = 'CINEMA';
  const startX = 48 - (letters.length * letterW) / 2;
  for (let i = 0; i < letters.length; i++) {
    rect(ctx, startX + i * letterW + 1, 16, 6, 8, '#ffddaa');
  }

  // Ticket booth (door area)
  rect(ctx, 36, 56, 24, 36, '#553344');
  rect(ctx, 36, 56, 24, 2, '#664455');
  // Glass
  rect(ctx, 40, 60, 16, 12, '#88aacc');
  rect(ctx, 40, 60, 16, 1, '#6688aa');

  // Movie posters
  for (const px_ of [12, 68]) {
    rect(ctx, px_, 34, 16, 22, '#222244');
    rect(ctx, px_ + 1, 35, 14, 20, '#445566');
    rect(ctx, px_ + 3, 38, 10, 8, '#667788');
    rect(ctx, px_ + 3, 48, 10, 4, '#334455');
  }

  // Stars on facade
  const starPositions = [[20, 28], [48, 10], [76, 28]];
  starPositions.forEach(([sx, sy]) => {
    px(ctx, sx, sy, '#ffff44');
    px(ctx, sx - 1, sy, '#ffcc22');
    px(ctx, sx + 1, sy, '#ffcc22');
    px(ctx, sx, sy - 1, '#ffcc22');
    px(ctx, sx, sy + 1, '#ffcc22');
  });
}

export function generateBuildings(scene: Phaser.Scene): void {
  const builders: Record<string, (ctx: Ctx) => void> = {
    restaurant: drawRestaurant,
    'park-entrance': drawParkEntrance,
    cinema: drawCinema,
  };

  for (const [name, draw] of Object.entries(builders)) {
    const canvas = scene.textures.createCanvas(`building-${name}`, 96, 96);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}

// ── decorations ──────────────────────────────────────────────────────────

function drawTree(ctx: Ctx): void {
  // Trunk
  rect(ctx, 14, 18, 4, 12, '#6B4226');
  rect(ctx, 14, 18, 1, 12, '#5a3620');
  // Canopy layers
  rect(ctx, 8, 6, 16, 14, '#2d7b2f');
  rect(ctx, 10, 2, 12, 8, '#3a9a3f');
  rect(ctx, 12, 0, 8, 4, '#4aaa4f');
  // Highlights
  px(ctx, 14, 3, '#5abb5f');
  px(ctx, 18, 8, '#5abb5f');
  px(ctx, 11, 12, '#226622');
}

function drawBench(ctx: Ctx): void {
  // Seat
  rect(ctx, 4, 14, 24, 4, '#8B6914');
  rect(ctx, 4, 14, 24, 1, '#a07a20');
  // Back rest
  rect(ctx, 4, 10, 24, 4, '#7B5914');
  rect(ctx, 4, 10, 24, 1, '#8B6914');
  // Legs
  rect(ctx, 6, 18, 2, 8, '#554422');
  rect(ctx, 24, 18, 2, 8, '#554422');
  // Arm rests
  rect(ctx, 4, 12, 2, 6, '#6B5414');
  rect(ctx, 26, 12, 2, 6, '#6B5414');
}

function drawLamp(ctx: Ctx): void {
  // Post
  rect(ctx, 15, 10, 2, 20, '#555555');
  rect(ctx, 15, 10, 1, 20, '#666666');
  // Base
  rect(ctx, 12, 28, 8, 3, '#444444');
  rect(ctx, 13, 27, 6, 1, '#555555');
  // Lamp head
  rect(ctx, 11, 4, 10, 7, '#888855');
  rect(ctx, 11, 4, 10, 1, '#aaaa66');
  // Glow
  rect(ctx, 13, 6, 6, 4, '#ffee88');
  rect(ctx, 14, 7, 4, 2, '#ffffaa');
}

function drawFence(ctx: Ctx): void {
  // Horizontal rails
  rect(ctx, 0, 10, 32, 2, '#8B7355');
  rect(ctx, 0, 20, 32, 2, '#8B7355');
  rect(ctx, 0, 10, 32, 1, '#a08060');
  // Vertical posts
  for (let x = 2; x < 32; x += 8) {
    rect(ctx, x, 6, 3, 20, '#7B6345');
    rect(ctx, x, 6, 3, 1, '#9B8365');
  }
}

function drawFlower(ctx: Ctx): void {
  // Stem
  rect(ctx, 15, 16, 2, 12, '#338833');
  // Leaves
  rect(ctx, 12, 20, 3, 2, '#44aa44');
  rect(ctx, 17, 22, 3, 2, '#44aa44');
  // Petals
  const petalColor = '#ff6688';
  rect(ctx, 13, 10, 6, 6, petalColor);
  rect(ctx, 11, 12, 2, 2, petalColor);
  rect(ctx, 19, 12, 2, 2, petalColor);
  rect(ctx, 14, 8, 4, 2, petalColor);
  rect(ctx, 14, 16, 4, 2, petalColor);
  // Center
  rect(ctx, 14, 11, 4, 4, '#ffcc44');
  rect(ctx, 15, 12, 2, 2, '#ffdd66');
}

function drawFountain(ctx: Ctx): void {
  // Base pool
  rect(ctx, 4, 22, 24, 8, '#6688aa');
  rect(ctx, 2, 26, 28, 4, '#778899');
  rect(ctx, 2, 26, 28, 1, '#8899aa');
  // Center pillar
  rect(ctx, 14, 10, 4, 14, '#aaaaaa');
  rect(ctx, 14, 10, 1, 14, '#bbbbbb');
  // Top bowl
  rect(ctx, 10, 8, 12, 3, '#999999');
  rect(ctx, 10, 8, 12, 1, '#aaaaaa');
  // Water spray (pixel dots)
  px(ctx, 15, 4, '#aaddff');
  px(ctx, 16, 3, '#aaddff');
  px(ctx, 17, 5, '#88ccff');
  px(ctx, 14, 5, '#88ccff');
  px(ctx, 16, 2, '#cceeff');
  // Water in pool
  rect(ctx, 6, 24, 20, 4, '#88bbdd');
  px(ctx, 10, 25, '#aaddff');
  px(ctx, 18, 25, '#aaddff');
}

export function generateDecorations(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    tree: drawTree,
    bench: drawBench,
    lamp: drawLamp,
    fence: drawFence,
    flower: drawFlower,
    fountain: drawFountain,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`deco-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}

// ── catch mini-game ──────────────────────────────────────────────────────

function drawPetal(ctx: Ctx): void {
  // Cherry blossom petal
  ctx.fillStyle = '#ffaabb';
  ctx.beginPath();
  ctx.ellipse(16, 14, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8899';
  ctx.beginPath();
  ctx.ellipse(16, 16, 6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  px(ctx, 14, 12, '#ffccdd');
  px(ctx, 15, 11, '#ffddee');
}

function drawLeaf(ctx: Ctx): void {
  // Leaf shape
  ctx.fillStyle = '#55aa55';
  ctx.beginPath();
  ctx.ellipse(16, 16, 10, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Vein
  rect(ctx, 10, 15, 12, 1, '#44884a');
  // Tip highlight
  px(ctx, 22, 13, '#66bb66');
  px(ctx, 23, 12, '#77cc77');
}

function drawButterfly(ctx: Ctx): void {
  // Body
  rect(ctx, 15, 12, 2, 8, '#553322');
  // Left wing
  rect(ctx, 7, 10, 8, 6, '#ff8844');
  rect(ctx, 5, 12, 4, 4, '#ff6633');
  rect(ctx, 9, 11, 4, 4, '#ffaa66');
  px(ctx, 8, 12, '#ffcc88');
  // Right wing
  rect(ctx, 17, 10, 8, 6, '#ff8844');
  rect(ctx, 23, 12, 4, 4, '#ff6633');
  rect(ctx, 19, 11, 4, 4, '#ffaa66');
  px(ctx, 23, 12, '#ffcc88');
  // Antennae
  px(ctx, 14, 10, '#553322');
  px(ctx, 13, 9, '#553322');
  px(ctx, 17, 10, '#553322');
  px(ctx, 18, 9, '#553322');
  // Wing dots
  px(ctx, 10, 13, '#222222');
  px(ctx, 21, 13, '#222222');
}

export function generateCatchItems(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    petal: drawPetal,
    leaf: drawLeaf,
    butterfly: drawButterfly,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`catch-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }

  // Basket
  const basket = scene.textures.createCanvas('catch-basket', 64, 32);
  if (basket) {
    const ctx = basket.context;
    // Basket body — woven look
    rect(ctx, 8, 8, 48, 22, '#8B5A2B');
    rect(ctx, 12, 6, 40, 4, '#9B6A3B');
    // Weave pattern
    for (let y = 10; y < 28; y += 4) {
      for (let x = 10; x < 54; x += 6) {
        rect(ctx, x, y, 4, 2, '#7B4A1B');
      }
    }
    // Rim
    rect(ctx, 6, 6, 52, 3, '#a0703B');
    rect(ctx, 6, 6, 52, 1, '#b08040');
    // Handle hint
    rect(ctx, 28, 2, 8, 4, '#8B5A2B');
    rect(ctx, 28, 2, 8, 1, '#9B6A3B');
    basket.refresh();
  }
}

// ── match mini-game ──────────────────────────────────────────────────────

export function generateMatchCards(scene: Phaser.Scene): void {
  // Card back
  const back = scene.textures.createCanvas('card-back', 64, 80);
  if (back) {
    const ctx = back.context;
    // Card body
    rect(ctx, 0, 0, 64, 80, '#6b4e8a');
    // Border
    rect(ctx, 2, 2, 60, 76, '#7b5ea7');
    // Inner pattern — diamond grid
    for (let y = 8; y < 72; y += 8) {
      for (let x = 8; x < 56; x += 8) {
        px(ctx, x + 3, y, '#9b7ec7');
        px(ctx, x, y + 3, '#9b7ec7');
        px(ctx, x + 3, y + 6, '#9b7ec7');
        px(ctx, x + 6, y + 3, '#9b7ec7');
      }
    }
    // Center star
    rect(ctx, 28, 36, 8, 8, '#d4a574');
    px(ctx, 32, 34, '#d4a574');
    px(ctx, 32, 46, '#d4a574');
    px(ctx, 26, 40, '#d4a574');
    px(ctx, 36, 40, '#d4a574');
    // Question mark
    rect(ctx, 29, 37, 6, 1, '#fff');
    rect(ctx, 34, 38, 1, 2, '#fff');
    rect(ctx, 31, 40, 3, 1, '#fff');
    rect(ctx, 31, 41, 1, 2, '#fff');
    px(ctx, 31, 44, '#fff');
    back.refresh();
  }

  // Match icons — draw pixel art versions instead of emoji
  const iconDrawers: Array<(ctx: Ctx) => void> = [
    // 🍿 Popcorn
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Box
      rect(ctx, 18, 40, 28, 30, '#cc3333');
      rect(ctx, 20, 42, 24, 1, '#dd4444');
      // Stripes
      for (let x = 22; x < 42; x += 6) rect(ctx, x, 42, 3, 28, '#ffffff');
      // Popcorn kernels
      const kernels = [[22, 30], [26, 26], [30, 24], [34, 26], [38, 28], [28, 32], [34, 32], [24, 36], [32, 20], [36, 34]];
      kernels.forEach(([kx, ky]) => {
        rect(ctx, kx, ky, 6, 6, '#fff8dc');
        rect(ctx, kx + 1, ky + 1, 4, 4, '#fffaed');
        px(ctx, kx + 2, ky + 2, '#f5e6c8');
      });
    },
    // 🎬 Clapperboard
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Board
      rect(ctx, 10, 34, 44, 30, '#222');
      rect(ctx, 12, 36, 40, 26, '#333');
      // Clapper top
      rect(ctx, 10, 20, 44, 16, '#222');
      // Stripes
      for (let x = 10; x < 54; x += 8) {
        const isWhite = ((x - 10) / 8) % 2 === 0;
        ctx.fillStyle = isWhite ? '#fff' : '#222';
        ctx.beginPath();
        ctx.moveTo(x, 20); ctx.lineTo(x + 8, 20);
        ctx.lineTo(x + 4, 36); ctx.lineTo(x - 4, 36);
        ctx.fill();
      }
      // Text lines
      rect(ctx, 16, 42, 20, 2, '#666');
      rect(ctx, 16, 48, 30, 2, '#666');
      rect(ctx, 16, 54, 15, 2, '#666');
    },
    // 🎟 Ticket
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Ticket body
      rect(ctx, 8, 24, 48, 32, '#ff8844');
      rect(ctx, 8, 24, 48, 2, '#ffaa66');
      // Stub line
      for (let y = 26; y < 54; y += 3) {
        px(ctx, 40, y, '#cc6633');
      }
      // Star on ticket
      rect(ctx, 20, 36, 8, 8, '#ffdd44');
      px(ctx, 24, 34, '#ffdd44');
      px(ctx, 24, 46, '#ffdd44');
      px(ctx, 18, 40, '#ffdd44');
      px(ctx, 28, 40, '#ffdd44');
      // "ADMIT" text
      rect(ctx, 16, 28, 18, 3, '#ffffcc');
    },
    // 🎥 Camera
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Camera body
      rect(ctx, 12, 30, 32, 24, '#444');
      rect(ctx, 12, 30, 32, 2, '#555');
      // Lens
      rect(ctx, 22, 36, 12, 12, '#222');
      rect(ctx, 24, 38, 8, 8, '#334');
      rect(ctx, 26, 40, 4, 4, '#88aacc');
      px(ctx, 27, 41, '#aaccee');
      // Film reel
      rect(ctx, 44, 28, 10, 10, '#333');
      rect(ctx, 46, 30, 6, 6, '#555');
    },
    // ⭐ Star
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      const starColor = '#ffcc00';
      const starDark = '#ddaa00';
      // 5-pointed star pixel art
      rect(ctx, 28, 18, 8, 6, starColor);
      rect(ctx, 24, 24, 16, 6, starColor);
      rect(ctx, 16, 30, 32, 8, starColor);
      rect(ctx, 20, 38, 24, 6, starColor);
      rect(ctx, 24, 44, 16, 6, starColor);
      rect(ctx, 20, 50, 8, 6, starColor);
      rect(ctx, 36, 50, 8, 6, starColor);
      // Shading
      rect(ctx, 30, 20, 4, 4, '#ffdd44');
      rect(ctx, 28, 28, 8, 4, starDark);
    },
    // 🎭 Masks
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Happy mask
      rect(ctx, 10, 24, 22, 28, '#ffdd88');
      rect(ctx, 10, 24, 22, 2, '#ffee99');
      // Happy eyes
      rect(ctx, 14, 32, 4, 4, '#222');
      rect(ctx, 24, 32, 4, 4, '#222');
      // Happy mouth (smile)
      rect(ctx, 16, 42, 10, 2, '#cc4444');
      rect(ctx, 14, 40, 2, 2, '#cc4444');
      rect(ctx, 26, 40, 2, 2, '#cc4444');
      // Sad mask (offset, behind)
      rect(ctx, 32, 28, 22, 28, '#aabbcc');
      rect(ctx, 32, 28, 22, 2, '#bbccdd');
      // Sad eyes
      rect(ctx, 36, 36, 4, 4, '#222');
      rect(ctx, 46, 36, 4, 4, '#222');
      // Sad mouth (frown)
      rect(ctx, 38, 48, 10, 2, '#556677');
      rect(ctx, 36, 50, 2, 2, '#556677');
      rect(ctx, 48, 50, 2, 2, '#556677');
    },
  ];

  iconDrawers.forEach((draw, i) => {
    const canvas = scene.textures.createCanvas(`match-icon-${i}`, 64, 80);
    if (!canvas) return;
    draw(canvas.context);
    canvas.refresh();
  });
}

// ── sky (procedural, kept as-is) ─────────────────────────────────────────

export function generateSky(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('sky', 1, 256);
  if (!canvas) return;
  const ctx = canvas.context;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#E0F0FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, 256);
  canvas.refresh();
}

// ── master generator ─────────────────────────────────────────────────────

export function generateAllTextures(scene: Phaser.Scene): void {
  generateTerrain(scene);
  generateCharacterOutfits(scene);
  generateNPC(scene);
  generateBuildings(scene);
  generateDecorations(scene);
  generateCatchItems(scene);
  generateMatchCards(scene);
  generateSky(scene);
}
