// src/game/rendering/MauiTextures.ts
// Generates all Maui-related textures: terrain, NPCs, decorations, buildings

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
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

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── NPC helper (48×48) ──────────────────────────────────────────────────

function drawNPCBase(ctx: Ctx, opts: {
  skin: string;
  hair: string;
  top: string;
  pants: string;
  shoes?: string;
  detail?: (ctx: Ctx) => void;
}): void {
  const { skin, hair, top, pants } = opts;
  const shoes = opts.shoes || '#443322';

  // Shadow
  rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

  // Shoes
  rect(ctx, 17, 39, 5, 2, shoes);
  rect(ctx, 26, 39, 5, 2, shoes);

  // Legs / pants
  rect(ctx, 15, 35, 8, 4, pants);
  rect(ctx, 25, 35, 8, 4, pants);

  // Body / top
  rect(ctx, 14, 19, 20, 16, top);

  // Arms
  rect(ctx, 10, 24, 4, 10, top);
  rect(ctx, 34, 24, 4, 10, top);

  // Hands
  rect(ctx, 10, 34, 3, 2, skin);
  rect(ctx, 35, 34, 3, 2, skin);

  // Head
  rect(ctx, 19, 7, 10, 11, skin);
  rect(ctx, 18, 8, 12, 9, skin);

  // Hair
  rect(ctx, 18, 5, 12, 4, hair);
  rect(ctx, 19, 4, 10, 2, hair);
  px(ctx, 18, 9, hair);
  px(ctx, 29, 9, hair);

  // Eyes
  rect(ctx, 19, 12, 3, 3, '#fff');
  rect(ctx, 26, 12, 3, 3, '#fff');
  px(ctx, 20, 12, '#334');
  px(ctx, 21, 12, '#334');
  px(ctx, 27, 12, '#334');
  px(ctx, 28, 12, '#334');

  // Mouth
  rect(ctx, 22, 16, 4, 1, '#c88');

  // Detail overlay
  if (opts.detail) opts.detail(ctx);
}

// ── Terrain spritesheet ─────────────────────────────────────────────────

function generateMauiTerrain(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('maui-terrain', 192, 32);
  if (!c) return;
  const ctx = c.context;

  // Index 0 — Sand
  {
    const ox = 0;
    const rng = seededRandom(100);
    rect(ctx, ox, 0, 32, 32, '#F4D03F');
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const r = rng();
        if (r < 0.15) px(ctx, ox + x, y, '#D4B030');
        else if (r < 0.25) px(ctx, ox + x, y, '#FFEC8B');
      }
    }
  }

  // Index 1 — SandStone
  {
    const ox = 32;
    const rng = seededRandom(200);
    rect(ctx, ox, 0, 32, 32, '#DEB887');
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const r = rng();
        if (r < 0.12) px(ctx, ox + x, y, darken('#DEB887', 0.1));
        else if (r < 0.22) px(ctx, ox + x, y, lighten('#DEB887', 0.1));
      }
    }
  }

  // Index 2 — Stone
  {
    const ox = 64;
    const rng = seededRandom(300);
    rect(ctx, ox, 0, 32, 32, '#8A8A8A');
    // Dithered mid-tone
    for (let y = 0; y < 32; y += 2) {
      for (let x = (y % 4 === 0 ? 0 : 1); x < 32; x += 4) {
        px(ctx, ox + x, y, '#808080');
      }
    }
    // Detail scatter
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      const r = rng();
      px(ctx, ox + x, y, r > 0.6 ? '#6e6e6e' : r > 0.3 ? '#9e9e9e' : '#aaaaaa');
    }
  }

  // Index 3 — ShallowWater
  {
    const ox = 96;
    const rng = seededRandom(400);
    rect(ctx, ox, 0, 32, 32, '#5DADE2');
    // Wave-like lighter horizontal stripes
    for (let y = 0; y < 32; y++) {
      if (y % 6 < 2) {
        for (let x = 0; x < 32; x++) {
          const shift = Math.floor(Math.sin(y * 0.5 + x * 0.3) * 2);
          if ((x + shift) % 4 < 2) {
            px(ctx, ox + x, y, '#87CEEB');
          }
        }
      }
    }
    // Small shimmer
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, lighten('#87CEEB', 0.15));
    }
  }

  // Index 4 — Ocean
  {
    const ox = 128;
    const rng = seededRandom(500);
    rect(ctx, ox, 0, 32, 32, '#2E86C1');
    // Darker wave pattern
    for (let y = 0; y < 32; y++) {
      if (y % 8 < 3) {
        for (let x = 0; x < 32; x++) {
          const shift = Math.floor(Math.sin(y * 0.4 + x * 0.2) * 3);
          if ((x + shift) % 5 < 2) {
            px(ctx, ox + x, y, '#1A5276');
          }
        }
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, lighten('#2E86C1', 0.15));
    }
  }

  // Index 5 — Grass (tropical bright)
  {
    const ox = 160;
    const rng = seededRandom(600);
    rect(ctx, ox, 0, 32, 32, '#3D8B37');
    // Dithered mid-tone
    for (let y = 0; y < 32; y += 2) {
      for (let x = (y % 4 === 0 ? 0 : 1); x < 32; x += 4) {
        px(ctx, ox + x, y, '#358030');
      }
    }
    // Detail scatter
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      const r = rng();
      px(ctx, ox + x, y, r > 0.6 ? '#2d6b2a' : r > 0.3 ? '#4a9c47' : '#5ab857');
    }
    // Grass tufts
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 26) + 4;
      px(ctx, ox + x, y, '#4a9c47');
      px(ctx, ox + x, y - 1, '#5ab857');
      if (rng() > 0.5) px(ctx, ox + x, y - 2, lighten('#5ab857', 0.1));
    }
  }

  c.refresh();
}

// ── NPC textures ────────────────────────────────────────────────────────

function generateMauiNPCs(scene: Phaser.Scene): void {
  // npc-maui-local — Hawaiian shirt (green with pink/yellow dots), tan shorts, dark skin
  {
    const c = scene.textures.createCanvas('npc-maui-local', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#B87333', hair: '#222222', top: '#228B22', pants: '#C4A265',
      shoes: '#886644',
      detail: (ctx) => {
        // Floral dots on Hawaiian shirt body
        px(ctx, 16, 22, '#FF69B4');
        px(ctx, 20, 24, '#FFD700');
        px(ctx, 18, 27, '#FF69B4');
        px(ctx, 24, 22, '#FFD700');
        px(ctx, 28, 25, '#FF69B4');
        px(ctx, 22, 30, '#FFD700');
        px(ctx, 30, 28, '#FF69B4');
        px(ctx, 26, 32, '#FFD700');
        px(ctx, 16, 31, '#FF69B4');
        // Floral dots on arms
        px(ctx, 11, 27, '#FF69B4');
        px(ctx, 35, 27, '#FFD700');
        // Open collar
        rect(ctx, 21, 19, 6, 2, '#B87333');
      },
    });
    c.refresh();
  }

  // npc-surfer — no shirt (tanned skin torso), teal shorts, wider build
  {
    const c = scene.textures.createCanvas('npc-surfer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#D2A679';
    drawNPCBase(ctx, {
      skin, hair: '#DDBB66', top: skin, pants: '#20B2AA',
      shoes: '#886644',
      detail: (ctx) => {
        // Wider muscular torso — extend body slightly
        rect(ctx, 12, 20, 2, 14, skin);
        rect(ctx, 34, 20, 2, 14, skin);
        // Chest definition (subtle darker lines)
        rect(ctx, 20, 22, 8, 1, darken(skin, 0.08));
        rect(ctx, 23, 23, 2, 4, darken(skin, 0.06));
        // Board shorts waistband
        rect(ctx, 14, 34, 20, 1, darken('#20B2AA', 0.2));
        // Shorts pattern stripe
        rect(ctx, 15, 37, 8, 1, lighten('#20B2AA', 0.15));
        rect(ctx, 25, 37, 8, 1, lighten('#20B2AA', 0.15));
      },
    });
    c.refresh();
  }

  // npc-maui-shopkeeper — purple top, yellow sash, colorful
  {
    const c = scene.textures.createCanvas('npc-maui-shopkeeper', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D2A679', hair: '#443322', top: '#800080', pants: '#333333',
      detail: (ctx) => {
        // Yellow sash / belt across body
        rect(ctx, 14, 29, 20, 2, '#FFD700');
        // Yellow collar trim
        rect(ctx, 18, 19, 12, 2, '#FFD700');
        // Yellow cuff trim on arms
        rect(ctx, 10, 33, 4, 1, '#FFD700');
        rect(ctx, 34, 33, 4, 1, '#FFD700');
        // Colorful necklace beads
        px(ctx, 20, 18, '#FF69B4');
        px(ctx, 22, 18, '#20B2AA');
        px(ctx, 24, 18, '#FF69B4');
        px(ctx, 26, 18, '#20B2AA');
      },
    });
    c.refresh();
  }
}

// ── Decorations ─────────────────────────────────────────────────────────

function generateMauiDecorations(scene: Phaser.Scene): void {
  // deco-palm-tree — 32×64
  {
    const c = scene.textures.createCanvas('deco-palm-tree', 32, 64);
    if (!c) return;
    const ctx = c.context;
    const trunk = '#8B4513';
    const green = '#228B22';

    // Trunk — 4px wide, from y=30 to y=60
    rect(ctx, 14, 30, 4, 34, trunk);
    // Trunk texture
    for (let y = 32; y < 62; y += 4) {
      rect(ctx, 14, y, 4, 1, darken(trunk, 0.15));
    }

    // Fronds radiating from top
    const frondTop = 28;
    // Center top frond
    for (let i = 0; i < 10; i++) {
      rect(ctx, 13 + i % 3, frondTop - 10 + i, 6 - Math.abs(i - 5), 1, green);
    }
    // Left frond
    for (let i = 0; i < 12; i++) {
      const w = Math.max(1, 4 - Math.floor(i / 3));
      rect(ctx, 14 - i, frondTop - 2 + Math.floor(i * 0.6), w, 1, green);
    }
    // Right frond
    for (let i = 0; i < 12; i++) {
      const w = Math.max(1, 4 - Math.floor(i / 3));
      rect(ctx, 18 + i - w + 1, frondTop - 2 + Math.floor(i * 0.6), w, 1, green);
    }
    // Lower-left frond
    for (let i = 0; i < 10; i++) {
      const w = Math.max(1, 3 - Math.floor(i / 4));
      rect(ctx, 12 - i, frondTop + 2 + Math.floor(i * 0.8), w, 1, lighten(green, 0.1));
    }
    // Lower-right frond
    for (let i = 0; i < 10; i++) {
      const w = Math.max(1, 3 - Math.floor(i / 4));
      rect(ctx, 20 + i, frondTop + 2 + Math.floor(i * 0.8), w, 1, lighten(green, 0.1));
    }

    c.refresh();
  }

  // deco-beach-umbrella — 32×32
  {
    const c = scene.textures.createCanvas('deco-beach-umbrella', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const colors = ['#CC3333', '#FFD700', '#3366CC'];

    // Pole
    rect(ctx, 15, 12, 2, 20, '#8B4513');

    // Umbrella canopy — semi-circular top
    for (let y = 0; y < 10; y++) {
      const halfW = Math.floor(Math.sqrt(Math.max(0, 14 * 14 - (y - 10) * (y - 10))));
      const x0 = 16 - halfW;
      const x1 = 16 + halfW;
      for (let x = x0; x < x1; x++) {
        const stripe = Math.floor((x - x0) / Math.max(1, Math.floor((x1 - x0) / 3)));
        px(ctx, x, y, colors[Math.min(stripe, 2)]);
      }
    }

    c.refresh();
  }

  // deco-beach-towel — 32×16
  {
    const c = scene.textures.createCanvas('deco-beach-towel', 32, 16);
    if (!c) return;
    const ctx = c.context;

    rect(ctx, 2, 3, 28, 10, '#4488CC');
    // Lighter stripe in middle
    rect(ctx, 2, 7, 28, 2, lighten('#4488CC', 0.2));
    // Fringe at ends
    for (let x = 2; x < 30; x += 2) {
      px(ctx, x, 2, '#4488CC');
      px(ctx, x, 13, '#4488CC');
    }

    c.refresh();
  }

  // deco-surfboard — 16×48
  {
    const c = scene.textures.createCanvas('deco-surfboard', 16, 48);
    if (!c) return;
    const ctx = c.context;

    // Surfboard shape — pointed top, rounded bottom
    for (let y = 0; y < 48; y++) {
      let halfW: number;
      if (y < 8) {
        halfW = Math.floor(y * 0.5); // tapered top
      } else if (y > 40) {
        halfW = Math.max(0, Math.floor((48 - y) * 0.6)); // tapered bottom
      } else {
        halfW = 3; // body
      }
      if (halfW > 0) {
        rect(ctx, 8 - halfW, y, halfW * 2, 1, '#FFFFFF');
      }
    }
    // Blue stripe down center
    for (let y = 4; y < 44; y++) {
      px(ctx, 8, y, '#3366CC');
      if (y > 8 && y < 40) px(ctx, 7, y, '#3366CC');
    }
    // Outline
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;

    c.refresh();
  }

  // deco-maui-market-stall — 64×48
  {
    const c = scene.textures.createCanvas('deco-maui-market-stall', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const wood = '#A0522D';

    // Wooden frame posts
    rect(ctx, 2, 12, 4, 36, wood);
    rect(ctx, 58, 12, 4, 36, wood);
    // Cross beam
    rect(ctx, 2, 12, 60, 3, wood);

    // Colorful cloth top with red stripes
    for (let y = 0; y < 12; y++) {
      rect(ctx, 0, y, 64, 1, y % 4 < 2 ? '#CC3333' : '#FFEECC');
    }

    // Counter
    rect(ctx, 4, 34, 56, 4, lighten(wood, 0.15));
    rect(ctx, 4, 38, 56, 2, darken(wood, 0.1));

    // Counter items (little colored blocks)
    rect(ctx, 10, 32, 4, 2, '#FFD700');
    rect(ctx, 20, 32, 4, 2, '#FF69B4');
    rect(ctx, 30, 32, 4, 2, '#228B22');
    rect(ctx, 40, 32, 4, 2, '#5DADE2');

    c.refresh();
  }

  // deco-maui-fountain — 32×32
  {
    const c = scene.textures.createCanvas('deco-maui-fountain', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const stone = '#888888';

    // Stone basin (outer)
    circle(ctx, 16, 20, 12, stone);
    // Inner (darker)
    circle(ctx, 16, 20, 9, darken(stone, 0.2));
    // Water surface
    circle(ctx, 16, 20, 7, '#87CEEB');
    // Center water highlight
    circle(ctx, 16, 19, 2, lighten('#87CEEB', 0.3));
    // Rim highlight
    for (let x = 6; x < 26; x += 3) {
      px(ctx, x, 10, lighten(stone, 0.2));
    }

    c.refresh();
  }

  // deco-maui-flower-pot — 16×16
  {
    const c = scene.textures.createCanvas('deco-maui-flower-pot', 16, 16);
    if (!c) return;
    const ctx = c.context;

    // Terracotta pot
    rect(ctx, 4, 9, 8, 6, '#CC6633');
    rect(ctx, 5, 8, 6, 1, '#CC6633'); // rim
    rect(ctx, 3, 8, 10, 1, darken('#CC6633', 0.1)); // rim top
    // Pot taper
    px(ctx, 4, 14, '#CC6633');
    px(ctx, 11, 14, '#CC6633');

    // Green leaves
    rect(ctx, 6, 5, 4, 4, '#228B22');
    px(ctx, 5, 6, '#228B22');
    px(ctx, 10, 6, '#228B22');
    px(ctx, 4, 7, lighten('#228B22', 0.15));
    px(ctx, 11, 7, lighten('#228B22', 0.15));

    // Pink flower dot
    circle(ctx, 8, 4, 2, '#FF69B4');
    px(ctx, 8, 3, lighten('#FF69B4', 0.3));

    c.refresh();
  }
}

// ── Buildings ───────────────────────────────────────────────────────────

function generateMauiBuildings(scene: Phaser.Scene): void {
  // building-maui-shop — 64×64
  {
    const c = scene.textures.createCanvas('building-maui-shop', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const wood = '#A0522D';
    const thatch = '#C4A265';

    // Walls
    rect(ctx, 4, 24, 56, 38, wood);
    // Wall texture
    for (let y = 26; y < 60; y += 4) {
      rect(ctx, 4, y, 56, 1, darken(wood, 0.1));
    }

    // Thatched roof
    for (let y = 0; y < 24; y++) {
      const indent = Math.max(0, 8 - y);
      rect(ctx, indent, y, 64 - indent * 2, 1, y % 3 === 0 ? darken(thatch, 0.1) : thatch);
    }
    // Roof edge shadow
    rect(ctx, 0, 23, 64, 2, darken(thatch, 0.2));

    // Door
    rect(ctx, 24, 40, 16, 22, '#CC3333');
    rect(ctx, 24, 40, 16, 2, darken('#CC3333', 0.15));
    // Door handle
    px(ctx, 37, 50, '#FFD700');
    px(ctx, 37, 51, '#FFD700');

    // Window
    rect(ctx, 8, 32, 10, 8, '#AADDFF');
    rect(ctx, 8, 32, 10, 1, darken(wood, 0.15));
    rect(ctx, 8, 39, 10, 1, darken(wood, 0.15));
    rect(ctx, 8, 32, 1, 8, darken(wood, 0.15));
    rect(ctx, 17, 32, 1, 8, darken(wood, 0.15));

    c.refresh();
  }

  // building-maui-house — 64×64
  {
    const c = scene.textures.createCanvas('building-maui-house', 64, 64);
    if (!c) return;
    const ctx = c.context;

    // Walls
    rect(ctx, 4, 24, 56, 38, '#F5F5F5');

    // Blue roof
    for (let y = 0; y < 24; y++) {
      const indent = Math.max(0, Math.floor((24 - y) * 0.3));
      rect(ctx, indent, y, 64 - indent * 2, 1, y % 4 === 0 ? darken('#3366CC', 0.1) : '#3366CC');
    }
    rect(ctx, 0, 23, 64, 2, darken('#3366CC', 0.2));

    // Door
    rect(ctx, 24, 42, 14, 20, '#8B4513');
    px(ctx, 35, 52, '#FFD700');

    // Window
    rect(ctx, 8, 32, 12, 10, '#AADDFF');
    // Window frame
    rect(ctx, 8, 32, 12, 1, '#3366CC');
    rect(ctx, 8, 41, 12, 1, '#3366CC');
    rect(ctx, 8, 32, 1, 10, '#3366CC');
    rect(ctx, 19, 32, 1, 10, '#3366CC');
    // Cross in window
    rect(ctx, 13, 32, 1, 10, '#3366CC');
    rect(ctx, 8, 37, 12, 1, '#3366CC');

    // Second window
    rect(ctx, 44, 32, 12, 10, '#AADDFF');
    rect(ctx, 44, 32, 12, 1, '#3366CC');
    rect(ctx, 44, 41, 12, 1, '#3366CC');
    rect(ctx, 44, 32, 1, 10, '#3366CC');
    rect(ctx, 55, 32, 1, 10, '#3366CC');
    rect(ctx, 49, 32, 1, 10, '#3366CC');
    rect(ctx, 44, 37, 12, 1, '#3366CC');

    c.refresh();
  }

  // building-maui-airport — 96×64
  {
    const c = scene.textures.createCanvas('building-maui-airport', 96, 64);
    if (!c) return;
    const ctx = c.context;

    // Walls
    rect(ctx, 4, 16, 88, 46, '#CCCCCC');

    // Glass front
    rect(ctx, 10, 28, 76, 24, '#AADDFF');
    // Glass reflections
    for (let x = 10; x < 86; x += 12) {
      rect(ctx, x, 28, 1, 24, lighten('#AADDFF', 0.2));
    }
    // Glass frame dividers
    for (let x = 22; x < 86; x += 18) {
      rect(ctx, x, 28, 2, 24, '#999999');
    }

    // Roof
    rect(ctx, 0, 12, 96, 6, '#999999');
    rect(ctx, 0, 12, 96, 1, '#777777');

    // Door
    rect(ctx, 40, 36, 16, 16, lighten('#AADDFF', 0.15));
    rect(ctx, 47, 36, 2, 16, '#999999');

    // "MAUI" pixel text on top
    const textY = 4;
    const textColor = '#2E86C1';
    // M
    rect(ctx, 30, textY, 1, 6, textColor);
    rect(ctx, 34, textY, 1, 6, textColor);
    px(ctx, 31, textY + 1, textColor);
    px(ctx, 33, textY + 1, textColor);
    px(ctx, 32, textY + 2, textColor);
    // A
    rect(ctx, 37, textY + 1, 1, 5, textColor);
    rect(ctx, 41, textY + 1, 1, 5, textColor);
    rect(ctx, 38, textY, 3, 1, textColor);
    rect(ctx, 38, textY + 3, 3, 1, textColor);
    // U
    rect(ctx, 44, textY, 1, 6, textColor);
    rect(ctx, 48, textY, 1, 6, textColor);
    rect(ctx, 45, textY + 5, 3, 1, textColor);
    // I
    rect(ctx, 51, textY, 3, 1, textColor);
    rect(ctx, 52, textY, 1, 6, textColor);
    rect(ctx, 51, textY + 5, 3, 1, textColor);

    // Foundation
    rect(ctx, 4, 54, 88, 8, '#888888');

    c.refresh();
  }
}

// ── Main export ─────────────────────────────────────────────────────────

export function generateMauiTextures(scene: Phaser.Scene): void {
  generateMauiTerrain(scene);
  generateMauiNPCs(scene);
  generateMauiDecorations(scene);
  generateMauiBuildings(scene);
}
