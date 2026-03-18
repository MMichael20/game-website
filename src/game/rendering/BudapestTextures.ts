// src/game/rendering/BudapestTextures.ts
// Generates all Budapest-related textures: terrain, NPCs, vehicles, buildings, decorations, cutscene sprites

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

// ══════════════════════════════════════════════════════════════════════════
// ── TERRAIN SPRITESHEET ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestTerrain(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('budapest-terrain', 320, 32);
  if (!c) return;
  const ctx = c.context;

  // Frame 0: Cobblestone — gray-beige (#B0A89A) cobblestone pattern
  {
    const ox = 0;
    const rng = seededRandom(5000);
    rect(ctx, ox, 0, 32, 32, '#B0A89A');
    // Draw irregular cobblestone grid
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sx = col * 4 + Math.floor(rng() * 2);
        const sy = row * 4 + Math.floor(rng() * 2);
        const sw = 3;
        const sh = 3;
        const shade = rng();
        const stoneColor = shade > 0.6 ? darken('#B0A89A', 0.08) : shade > 0.3 ? lighten('#B0A89A', 0.06) : '#B0A89A';
        rect(ctx, ox + sx, sy, sw, sh, stoneColor);
        // Grout lines (darker gaps between stones)
        if (col < 7) px(ctx, ox + sx + sw, sy + 1, darken('#B0A89A', 0.25));
        if (row < 7) px(ctx, ox + sx + 1, sy + sh, darken('#B0A89A', 0.25));
      }
    }
    // Extra texture scatter
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? darken('#B0A89A', 0.12) : lighten('#B0A89A', 0.1));
    }
  }

  // Frame 1: Road — dark gray (#4A4A52) asphalt
  {
    const ox = 32;
    const rng = seededRandom(5100);
    rect(ctx, ox, 0, 32, 32, '#4A4A52');
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#424248' : '#52525A');
    }
    // Subtle asphalt grain
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x++) {
        if (rng() < 0.08) px(ctx, ox + x, y, darken('#4A4A52', 0.1));
      }
    }
  }

  // Frame 2: TramTrack — road base with yellow rail lines
  {
    const ox = 64;
    const rng = seededRandom(5200);
    rect(ctx, ox, 0, 32, 32, '#4A4A52');
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#424248' : '#52525A');
    }
    // Rail lines at y=10 and y=22
    rect(ctx, ox, 10, 32, 2, '#C8B020');
    rect(ctx, ox, 22, 32, 2, '#C8B020');
    // Rail shine highlights
    for (let x = 0; x < 32; x += 3) {
      px(ctx, ox + x, 10, lighten('#C8B020', 0.2));
      px(ctx, ox + x, 22, lighten('#C8B020', 0.2));
    }
  }

  // Frame 3: Sidewalk — light gray (#AAAAAA) paved
  {
    const ox = 96;
    const rng = seededRandom(5300);
    rect(ctx, ox, 0, 32, 32, '#AAAAAA');
    // Paving pattern — horizontal and vertical lines
    for (let y = 0; y < 32; y += 8) {
      for (let x = 0; x < 32; x++) {
        px(ctx, ox + x, y, darken('#AAAAAA', 0.12));
      }
    }
    for (let x = 0; x < 32; x += 8) {
      for (let y = 0; y < 32; y++) {
        px(ctx, ox + x, y, darken('#AAAAAA', 0.12));
      }
    }
    // Subtle variation
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#A2A2A2' : '#B2B2B2');
    }
  }

  // Frame 4: Grass — green (#4a7c4f) standard
  {
    const ox = 128;
    const rng = seededRandom(5400);
    rect(ctx, ox, 0, 32, 32, '#4a7c4f');
    // Dithered mid-tone
    for (let y = 0; y < 32; y += 2) {
      for (let x = (y % 4 === 0 ? 0 : 1); x < 32; x += 4) {
        px(ctx, ox + x, y, '#427246');
      }
    }
    // Detail scatter
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      const r = rng();
      px(ctx, ox + x, y, r > 0.6 ? '#3a6240' : r > 0.3 ? '#5a9060' : '#68a86e');
    }
    // Grass tufts
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 26) + 4;
      px(ctx, ox + x, y, '#5a9060');
      px(ctx, ox + x, y - 1, '#68a86e');
      if (rng() > 0.5) px(ctx, ox + x, y - 2, lighten('#68a86e', 0.1));
    }
  }

  // Frame 5: Water — dark blue (#1A3A6A) Danube with ripple pattern
  {
    const ox = 160;
    const rng = seededRandom(5500);
    rect(ctx, ox, 0, 32, 32, '#1A3A6A');
    // Wave pattern — darker bands
    for (let y = 0; y < 32; y++) {
      if (y % 7 < 3) {
        for (let x = 0; x < 32; x++) {
          const shift = Math.floor(Math.sin(y * 0.4 + x * 0.25) * 3);
          if ((x + shift) % 5 < 2) {
            px(ctx, ox + x, y, '#132E56');
          }
        }
      }
    }
    // Lighter ripple highlights
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, lighten('#1A3A6A', 0.15));
    }
    // Subtle surface shimmer
    for (let y = 0; y < 32; y += 6) {
      for (let x = 0; x < 32; x += 4) {
        if (rng() < 0.3) px(ctx, ox + x, y, '#2A4A7A');
      }
    }
  }

  // Frame 6: Bridge — brown-gray (#7A7060) stone bridge surface
  {
    const ox = 192;
    const rng = seededRandom(5600);
    rect(ctx, ox, 0, 32, 32, '#7A7060');
    // Stone block pattern
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const bx = col * 8;
        const by = row * 8;
        const shade = rng() > 0.5 ? darken('#7A7060', 0.08) : lighten('#7A7060', 0.06);
        rect(ctx, ox + bx + 1, by + 1, 6, 6, shade);
      }
    }
    // Railing marks at top and bottom
    rect(ctx, ox, 0, 32, 2, darken('#7A7060', 0.2));
    rect(ctx, ox, 30, 32, 2, darken('#7A7060', 0.2));
    // Railing posts
    for (let x = 0; x < 32; x += 8) {
      rect(ctx, ox + x, 0, 2, 2, darken('#7A7060', 0.3));
      rect(ctx, ox + x, 30, 2, 2, darken('#7A7060', 0.3));
    }
  }

  // Frame 7: Plaza — decorative stone tile (#9A8A7A)
  {
    const ox = 224;
    const rng = seededRandom(5700);
    rect(ctx, ox, 0, 32, 32, '#9A8A7A');
    // Grid lines for tile pattern
    for (let y = 0; y < 32; y += 8) {
      for (let x = 0; x < 32; x++) {
        px(ctx, ox + x, y, darken('#9A8A7A', 0.15));
      }
    }
    for (let x = 0; x < 32; x += 8) {
      for (let y = 0; y < 32; y++) {
        px(ctx, ox + x, y, darken('#9A8A7A', 0.15));
      }
    }
    // Alternate tile shading for checkerboard effect
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if ((row + col) % 2 === 0) {
          rect(ctx, ox + col * 8 + 1, row * 8 + 1, 6, 6, lighten('#9A8A7A', 0.06));
        }
      }
    }
    // Scatter detail
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? darken('#9A8A7A', 0.1) : lighten('#9A8A7A', 0.08));
    }
  }

  // Frame 8: ParkPath — gravel (#B8A888) packed earth path
  {
    const ox = 256;
    const rng = seededRandom(5800);
    rect(ctx, ox, 0, 32, 32, '#B8A888');
    // Gravel scatter — lots of small dots
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      const r = rng();
      if (r > 0.7) px(ctx, ox + x, y, darken('#B8A888', 0.15));
      else if (r > 0.4) px(ctx, ox + x, y, lighten('#B8A888', 0.1));
      else px(ctx, ox + x, y, '#A89878');
    }
    // Occasional small pebble clusters
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(rng() * 28) + 2;
      const y = Math.floor(rng() * 28) + 2;
      px(ctx, ox + x, y, darken('#B8A888', 0.2));
      px(ctx, ox + x + 1, y, darken('#B8A888', 0.18));
    }
  }

  // Frame 9: BudaCastle — elevated gray-brown (#6A6050) decorative stone
  {
    const ox = 288;
    const rng = seededRandom(5900);
    rect(ctx, ox, 0, 32, 32, '#6A6050');
    // Large stone block pattern
    for (let row = 0; row < 4; row++) {
      const offset = (row % 2) * 4;
      for (let col = -1; col < 5; col++) {
        const bx = col * 8 + offset;
        const by = row * 8;
        if (bx >= 0 && bx < 32) {
          const shade = rng() > 0.5 ? darken('#6A6050', 0.06) : lighten('#6A6050', 0.06);
          const w = Math.min(7, 32 - bx);
          rect(ctx, ox + bx + 1, by + 1, w - 1, 6, shade);
        }
      }
    }
    // Mortar lines
    for (let y = 0; y < 32; y += 8) {
      for (let x = 0; x < 32; x++) {
        px(ctx, ox + x, y, darken('#6A6050', 0.2));
      }
    }
    // Decorative carving marks
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 30) + 1;
      px(ctx, ox + x, y, lighten('#6A6050', 0.15));
    }
  }

  c.refresh();
}

// ══════════════════════════════════════════════════════════════════════════
// ── NPC TEXTURES ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestNPCs(scene: Phaser.Scene): void {

  // npc-bp-local — male, light skin, brown hair, navy jacket, khaki pants
  {
    const c = scene.textures.createCanvas('npc-bp-local', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#2A3A5A', pants: '#B8A878',
      shoes: '#3A2A1A',
      detail: (ctx) => {
        // Jacket collar
        rect(ctx, 16, 19, 3, 2, lighten('#2A3A5A', 0.15));
        rect(ctx, 29, 19, 3, 2, lighten('#2A3A5A', 0.15));
        // Jacket buttons
        px(ctx, 24, 22, '#888');
        px(ctx, 24, 25, '#888');
        px(ctx, 24, 28, '#888');
      },
    });
    c.refresh();
  }

  // npc-bp-local-2 — female, light skin, blonde hair, red top, dark skirt
  {
    const c = scene.textures.createCanvas('npc-bp-local-2', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#D4B060', top: '#C04040', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Longer hair strands
        rect(ctx, 16, 9, 2, 8, '#D4B060');
        rect(ctx, 30, 9, 2, 8, '#D4B060');
        // Earrings
        px(ctx, 17, 13, '#FFD700');
        px(ctx, 30, 13, '#FFD700');
        // Skirt shape (widen pants area)
        rect(ctx, 14, 33, 20, 3, '#3A3A4A');
      },
    });
    c.refresh();
  }

  // npc-bp-tourist — light skin, brown hair, green shirt, cargo shorts, camera strap
  {
    const c = scene.textures.createCanvas('npc-bp-tourist', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#4A7A4A', pants: '#8A7A60',
      shoes: '#6A5A4A',
      detail: (ctx) => {
        // Camera strap — diagonal line across chest
        for (let i = 0; i < 12; i++) {
          px(ctx, 16 + i, 20 + Math.floor(i * 0.8), '#1A1A1A');
        }
        // Camera body at hip
        rect(ctx, 26, 28, 5, 3, '#2A2A2A');
        px(ctx, 28, 28, '#4A4A6A'); // lens
        // Cargo shorts pockets
        rect(ctx, 16, 36, 3, 2, darken('#8A7A60', 0.1));
        rect(ctx, 29, 36, 3, 2, darken('#8A7A60', 0.1));
      },
    });
    c.refresh();
  }

  // npc-bp-tourist-2 — tan skin, hat, floral shirt
  {
    const c = scene.textures.createCanvas('npc-bp-tourist-2', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D8B888', hair: '#6A4A2A', top: '#6A9A6A', pants: '#5A5A6A',
      shoes: '#4A3A2A',
      detail: (ctx) => {
        // Wide-brim hat
        rect(ctx, 15, 2, 18, 3, '#C8A860');
        rect(ctx, 18, 0, 12, 3, '#C8A860');
        // Floral dots on shirt
        const dots = [[17, 22], [20, 26], [25, 21], [28, 25], [22, 30], [16, 29], [30, 28]];
        for (const [dx, dy] of dots) {
          px(ctx, dx, dy, '#DD7799');
        }
        // Yellow accents
        px(ctx, 19, 24, '#DDCC44');
        px(ctx, 27, 23, '#DDCC44');
      },
    });
    c.refresh();
  }

  // npc-bp-guide — vest over white shirt, clipboard
  {
    const c = scene.textures.createCanvas('npc-bp-guide', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A4030', top: '#EEEEEE', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Vest over white shirt
        rect(ctx, 14, 19, 6, 14, '#C8A020');
        rect(ctx, 28, 19, 6, 14, '#C8A020');
        // Vest buttons
        px(ctx, 19, 24, '#8A7020');
        px(ctx, 28, 24, '#8A7020');
        // Clipboard in right hand
        rect(ctx, 35, 30, 4, 6, '#8B7355');
        rect(ctx, 35, 30, 4, 1, '#666');
        // Paper on clipboard
        rect(ctx, 36, 31, 2, 4, '#FFFFFF');
      },
    });
    c.refresh();
  }

  // npc-bp-vendor — white shirt, apron, chef hat
  {
    const c = scene.textures.createCanvas('npc-bp-vendor', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#4A3020', top: '#EEEEEE', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Apron
        rect(ctx, 16, 23, 16, 12, '#EEEEEE');
        rect(ctx, 16, 23, 16, 1, darken('#EEEEEE', 0.1));
        // Apron strings
        px(ctx, 16, 24, darken('#EEEEEE', 0.15));
        px(ctx, 31, 24, darken('#EEEEEE', 0.15));
        // Chef hat
        rect(ctx, 19, 0, 10, 5, '#FFFFFF');
        rect(ctx, 18, 3, 12, 2, '#FFFFFF');
        rect(ctx, 20, -1, 8, 2, '#FFFFFF');
      },
    });
    c.refresh();
  }

  // npc-bp-vendor-2 — green apron, brown hair
  {
    const c = scene.textures.createCanvas('npc-bp-vendor-2', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#6A4A2A', top: '#DDDDDD', pants: '#4A4A5A',
      shoes: '#3A2A1A',
      detail: (ctx) => {
        // Green apron
        rect(ctx, 16, 23, 16, 12, '#4A8A4A');
        rect(ctx, 16, 23, 16, 1, darken('#4A8A4A', 0.1));
        // Apron pocket
        rect(ctx, 20, 28, 8, 4, darken('#4A8A4A', 0.08));
        rect(ctx, 20, 28, 8, 1, darken('#4A8A4A', 0.15));
      },
    });
    c.refresh();
  }

  // npc-bp-conductor — blue uniform, cap
  {
    const c = scene.textures.createCanvas('npc-bp-conductor', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#4A3020', top: '#2A4A8A', pants: '#2A3A6A',
      shoes: '#1A1A1A',
      detail: (ctx) => {
        // Uniform buttons — gold
        px(ctx, 24, 21, '#FFD700');
        px(ctx, 24, 24, '#FFD700');
        px(ctx, 24, 27, '#FFD700');
        // Epaulettes
        rect(ctx, 14, 19, 4, 2, '#3A5A9A');
        rect(ctx, 30, 19, 4, 2, '#3A5A9A');
        // Cap
        rect(ctx, 18, 3, 12, 3, '#2A4A8A');
        rect(ctx, 17, 5, 14, 1, '#1A3A6A');
        // Cap badge
        px(ctx, 24, 4, '#FFD700');
      },
    });
    c.refresh();
  }

  // npc-bp-police — dark uniform, belt, cap
  {
    const c = scene.textures.createCanvas('npc-bp-police', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#3A2A18', top: '#2A2A3A', pants: '#2A2A3A',
      shoes: '#1A1A1A',
      detail: (ctx) => {
        // Belt
        rect(ctx, 14, 33, 20, 2, '#5A5A3A');
        px(ctx, 24, 33, '#C8B020'); // buckle
        px(ctx, 24, 34, '#C8B020');
        // Badge
        rect(ctx, 16, 21, 3, 3, '#C8B020');
        // Cap
        rect(ctx, 18, 3, 12, 3, '#2A2A3A');
        rect(ctx, 17, 5, 14, 1, '#1A1A2A');
        // Cap badge
        px(ctx, 24, 4, '#C8B020');
        // Radio on shoulder
        rect(ctx, 14, 20, 2, 3, '#1A1A1A');
      },
    });
    c.refresh();
  }

  // npc-bp-performer — beret, brown hair, black shirt
  {
    const c = scene.textures.createCanvas('npc-bp-performer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#1A1A1A', pants: '#2A2A3A',
      shoes: '#1A1A1A',
      detail: (ctx) => {
        // Beret
        rect(ctx, 17, 2, 14, 4, '#8A2A2A');
        rect(ctx, 19, 1, 10, 2, '#8A2A2A');
        // Beret nub
        px(ctx, 24, 1, darken('#8A2A2A', 0.2));
        // Scarf
        rect(ctx, 20, 18, 8, 2, '#CC4444');
        rect(ctx, 22, 20, 3, 3, '#CC4444');
      },
    });
    c.refresh();
  }

  // npc-bp-bouncer — black shirt, broad shoulders
  {
    const c = scene.textures.createCanvas('npc-bp-bouncer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D8B888', hair: '#2A2A2A', top: '#1A1A1A', pants: '#2A2A2A',
      shoes: '#1A1A1A',
      detail: (ctx) => {
        // Broader shoulders — extend body
        rect(ctx, 11, 19, 3, 10, '#1A1A1A');
        rect(ctx, 34, 19, 3, 10, '#1A1A1A');
        // Arms wider
        rect(ctx, 8, 24, 4, 10, '#1A1A1A');
        rect(ctx, 36, 24, 4, 10, '#1A1A1A');
        // Hands wider
        rect(ctx, 8, 34, 4, 2, '#D8B888');
        rect(ctx, 36, 34, 4, 2, '#D8B888');
        // Sunglasses
        rect(ctx, 18, 11, 5, 3, '#111111');
        rect(ctx, 25, 11, 5, 3, '#111111');
        rect(ctx, 23, 12, 2, 1, '#111111');
        // Earpiece
        px(ctx, 17, 13, '#333');
        px(ctx, 17, 14, '#333');
      },
    });
    c.refresh();
  }

  // npc-bp-bartender — vest, rolled sleeves (skin on arms)
  {
    const c = scene.textures.createCanvas('npc-bp-bartender', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#DDDDDD', pants: '#2A2A3A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Vest over shirt
        rect(ctx, 16, 19, 6, 14, '#4A3A2A');
        rect(ctx, 26, 19, 6, 14, '#4A3A2A');
        // Rolled sleeves — show skin on lower arms
        rect(ctx, 10, 30, 4, 4, '#E8C8A0');
        rect(ctx, 34, 30, 4, 4, '#E8C8A0');
        // Bow tie
        rect(ctx, 22, 18, 4, 2, '#1A1A1A');
        px(ctx, 23, 17, '#1A1A1A');
        px(ctx, 24, 17, '#1A1A1A');
      },
    });
    c.refresh();
  }

  // npc-bp-artist — beret, paint-stained smock
  {
    const c = scene.textures.createCanvas('npc-bp-artist', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#AAAAAA', pants: '#4A4A5A',
      shoes: '#3A2A1A',
      detail: (ctx) => {
        // Beret (purple)
        rect(ctx, 17, 2, 14, 4, '#6A3A6A');
        rect(ctx, 19, 1, 10, 2, '#6A3A6A');
        px(ctx, 24, 1, darken('#6A3A6A', 0.2));
        // Paint stains on smock
        px(ctx, 17, 24, '#CC4444');
        px(ctx, 18, 25, '#CC4444');
        px(ctx, 26, 22, '#4488CC');
        px(ctx, 27, 23, '#4488CC');
        px(ctx, 20, 28, '#CCCC44');
        px(ctx, 22, 26, '#44AA44');
        px(ctx, 30, 27, '#DD66AA');
        // Paintbrush in hand
        rect(ctx, 35, 30, 1, 6, '#8B7355');
        px(ctx, 35, 36, '#CC4444');
      },
    });
    c.refresh();
  }

  // npc-bp-jogger — sportswear, headband
  {
    const c = scene.textures.createCanvas('npc-bp-jogger', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#2A8ACA', pants: '#2A2A3A',
      shoes: '#DDDDDD',
      detail: (ctx) => {
        // Headband
        rect(ctx, 17, 6, 14, 2, '#FF4444');
        // Shorts instead of full pants — show skin on lower legs
        rect(ctx, 15, 37, 8, 2, '#E8C8A0');
        rect(ctx, 25, 37, 8, 2, '#E8C8A0');
        // Sporty arm detail — stripe
        rect(ctx, 10, 26, 4, 1, '#FFFFFF');
        rect(ctx, 34, 26, 4, 1, '#FFFFFF');
        // Sweatband on wrists
        rect(ctx, 10, 32, 3, 2, '#FF4444');
        rect(ctx, 35, 32, 3, 2, '#FF4444');
      },
    });
    c.refresh();
  }

  // npc-bp-couple — 64×48 canvas, two people side by side
  {
    const c = scene.textures.createCanvas('npc-bp-couple', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Person 1 (left) — male
    ctx.save();
    ctx.translate(-8, 0);
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#3A5A8A', pants: '#4A4A5A',
      shoes: '#2A2A2A',
    });
    ctx.restore();

    // Person 2 (right) — female
    ctx.save();
    ctx.translate(16, 0);
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#C8A040', top: '#AA4040', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Longer hair
        rect(ctx, 16, 9, 2, 7, '#C8A040');
        rect(ctx, 30, 9, 2, 7, '#C8A040');
      },
    });
    ctx.restore();

    // Arms linked — connecting pixels between the two
    rect(ctx, 26, 28, 12, 2, '#E8C8A0');

    c.refresh();
  }

  // npc-bp-elderly — 64×48 canvas, two older people
  {
    const c = scene.textures.createCanvas('npc-bp-elderly', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Person 1 (left) — elderly man
    ctx.save();
    ctx.translate(-8, 0);
    drawNPCBase(ctx, {
      skin: '#E0C098', hair: '#AAAAAA', top: '#5A5A6A', pants: '#4A4A5A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Coat
        rect(ctx, 14, 19, 20, 16, '#5A5A6A');
        rect(ctx, 14, 33, 20, 3, '#5A5A6A');
        // Coat buttons
        px(ctx, 24, 23, '#888');
        px(ctx, 24, 27, '#888');
      },
    });
    ctx.restore();

    // Person 2 (right) — elderly woman
    ctx.save();
    ctx.translate(16, 0);
    drawNPCBase(ctx, {
      skin: '#E0C098', hair: '#CCCCCC', top: '#6A4A5A', pants: '#4A3A4A',
      shoes: '#3A2A2A',
      detail: (ctx) => {
        // Longer hair bun
        rect(ctx, 16, 9, 2, 6, '#CCCCCC');
        rect(ctx, 30, 9, 2, 6, '#CCCCCC');
        circle(ctx, 24, 3, 3, '#CCCCCC');
        // Shawl/coat
        rect(ctx, 14, 19, 20, 16, '#6A4A5A');
      },
    });
    ctx.restore();

    // Arms linked
    rect(ctx, 26, 28, 12, 2, '#E0C098');

    c.refresh();
  }

  // npc-bp-exchange-clerk — blue vest, nametag
  {
    const c = scene.textures.createCanvas('npc-bp-exchange-clerk', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#4A3020', top: '#DDDDDD', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Blue vest
        rect(ctx, 16, 19, 6, 14, '#3A5A8A');
        rect(ctx, 26, 19, 6, 14, '#3A5A8A');
        // Nametag
        rect(ctx, 16, 22, 5, 3, '#FFFFFF');
        rect(ctx, 17, 23, 3, 1, '#333333');
      },
    });
    c.refresh();
  }

  // npc-bp-ticket-clerk — blue vest lighter shade, nametag
  {
    const c = scene.textures.createCanvas('npc-bp-ticket-clerk', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#6A4A2A', top: '#DDDDDD', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Blue vest — lighter shade
        rect(ctx, 16, 19, 6, 14, '#4A6A9A');
        rect(ctx, 26, 19, 6, 14, '#4A6A9A');
        // Nametag
        rect(ctx, 16, 22, 5, 3, '#FFFFFF');
        rect(ctx, 17, 23, 3, 1, '#333333');
        // Tie
        rect(ctx, 23, 19, 2, 8, '#2A3A5A');
      },
    });
    c.refresh();
  }

  // npc-bp-info-desk — blazer, badge
  {
    const c = scene.textures.createCanvas('npc-bp-info-desk', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#4A3020', top: '#3A3A5A', pants: '#3A3A4A',
      shoes: '#2A2A2A',
      detail: (ctx) => {
        // Blazer lapels
        rect(ctx, 15, 19, 4, 6, lighten('#3A3A5A', 0.1));
        rect(ctx, 29, 19, 4, 6, lighten('#3A3A5A', 0.1));
        // Badge
        rect(ctx, 16, 22, 3, 3, '#FFD700');
        px(ctx, 17, 23, '#FFFFFF');
        // Blazer button
        px(ctx, 24, 25, '#888');
      },
    });
    c.refresh();
  }

  // npc-bp-traveler — casual clothes, suitcase
  {
    const c = scene.textures.createCanvas('npc-bp-traveler', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#5A3A20', top: '#6A8A6A', pants: '#5A5A6A',
      shoes: '#4A3A2A',
      detail: (ctx) => {
        // Suitcase beside (right side)
        rect(ctx, 38, 34, 6, 8, '#8A4A2A');
        rect(ctx, 38, 34, 6, 1, darken('#8A4A2A', 0.2));
        // Handle
        rect(ctx, 40, 32, 2, 2, '#666');
        // Suitcase stripe
        rect(ctx, 38, 37, 6, 1, '#AA6A3A');
      },
    });
    c.refresh();
  }

  // npc-bp-traveler-2 — backpack, different shirt color
  {
    const c = scene.textures.createCanvas('npc-bp-traveler-2', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D8B888', hair: '#3A2A18', top: '#CA6A3A', pants: '#4A4A5A',
      shoes: '#3A2A1A',
      detail: (ctx) => {
        // Backpack on back (visible as side bulge)
        rect(ctx, 8, 19, 6, 12, '#4A6A2A');
        rect(ctx, 8, 19, 6, 1, darken('#4A6A2A', 0.15));
        // Backpack straps visible on chest
        rect(ctx, 16, 19, 2, 10, darken('#4A6A2A', 0.1));
        rect(ctx, 30, 19, 2, 10, darken('#4A6A2A', 0.1));
        // Backpack buckle
        px(ctx, 17, 25, '#888');
        px(ctx, 31, 25, '#888');
      },
    });
    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── VEHICLE TEXTURES ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestVehicles(scene: Phaser.Scene): void {

  // budapest-tram — 64×24, yellow tram
  {
    const c = scene.textures.createCanvas('budapest-tram', 64, 24);
    if (!c) return;
    const ctx = c.context;
    // Main body
    rect(ctx, 2, 4, 60, 14, '#E8C820');
    // Roof
    rect(ctx, 4, 2, 56, 3, darken('#E8C820', 0.1));
    // Red trim at base
    rect(ctx, 2, 17, 60, 2, '#CC3333');
    // Windows along top half
    for (let i = 0; i < 8; i++) {
      rect(ctx, 5 + i * 7, 5, 5, 6, '#8ABAE0');
      // Window frame
      rect(ctx, 5 + i * 7, 5, 5, 1, darken('#E8C820', 0.15));
    }
    // Door outlines
    rect(ctx, 14, 7, 4, 11, darken('#E8C820', 0.12));
    rect(ctx, 44, 7, 4, 11, darken('#E8C820', 0.12));
    // Wheels
    circle(ctx, 12, 21, 2, '#333');
    circle(ctx, 24, 21, 2, '#333');
    circle(ctx, 40, 21, 2, '#333');
    circle(ctx, 52, 21, 2, '#333');
    // Wheel rims
    px(ctx, 12, 21, '#666');
    px(ctx, 24, 21, '#666');
    px(ctx, 40, 21, '#666');
    px(ctx, 52, 21, '#666');
    // Headlights
    rect(ctx, 0, 8, 2, 3, '#FFEE88');
    rect(ctx, 62, 8, 2, 3, '#FFEE88');
    // Connector bumps at ends
    rect(ctx, 0, 6, 3, 12, darken('#E8C820', 0.05));
    rect(ctx, 61, 6, 3, 12, darken('#E8C820', 0.05));
    c.refresh();
  }

  // budapest-bus — 48×24, blue bus
  {
    const c = scene.textures.createCanvas('budapest-bus', 48, 24);
    if (!c) return;
    const ctx = c.context;
    // Main body
    rect(ctx, 2, 4, 44, 14, '#3A6AAA');
    // Roof
    rect(ctx, 3, 2, 42, 3, darken('#3A6AAA', 0.1));
    // White stripe
    rect(ctx, 2, 13, 44, 2, '#DDDDDD');
    // Windows
    for (let i = 0; i < 6; i++) {
      rect(ctx, 4 + i * 7, 5, 5, 5, '#8ABAE0');
    }
    // Door
    rect(ctx, 10, 6, 4, 12, darken('#3A6AAA', 0.12));
    // Wheels
    circle(ctx, 10, 20, 2, '#333');
    circle(ctx, 38, 20, 2, '#333');
    px(ctx, 10, 20, '#666');
    px(ctx, 38, 20, '#666');
    // Headlights
    rect(ctx, 0, 8, 2, 3, '#FFEE88');
    rect(ctx, 46, 8, 2, 3, '#FF4444');
    // Route number area
    rect(ctx, 3, 3, 8, 3, '#FFFFFF');
    c.refresh();
  }

  // Helper for small European sedans
  function drawCar(key: string, bodyColor: string): void {
    const c = scene.textures.createCanvas(key, 32, 16);
    if (!c) return;
    const ctx = c.context;
    // Body
    rect(ctx, 3, 4, 26, 8, bodyColor);
    // Roof / cabin
    rect(ctx, 8, 1, 16, 4, bodyColor);
    // Windshields
    rect(ctx, 9, 2, 6, 3, '#8ABAE0');
    rect(ctx, 17, 2, 6, 3, '#8ABAE0');
    // Wheels
    circle(ctx, 8, 13, 2, '#333');
    circle(ctx, 24, 13, 2, '#333');
    px(ctx, 8, 13, '#777');
    px(ctx, 24, 13, '#777');
    // Headlights
    rect(ctx, 1, 6, 2, 2, '#FFEE88');
    rect(ctx, 29, 6, 2, 2, '#FF4444');
    // Bumpers
    rect(ctx, 1, 10, 3, 2, darken(bodyColor, 0.15));
    rect(ctx, 28, 10, 3, 2, darken(bodyColor, 0.15));
    // Door line
    px(ctx, 16, 5, darken(bodyColor, 0.12));
    px(ctx, 16, 6, darken(bodyColor, 0.12));
    px(ctx, 16, 7, darken(bodyColor, 0.12));
    px(ctx, 16, 8, darken(bodyColor, 0.12));
    px(ctx, 16, 9, darken(bodyColor, 0.12));
    px(ctx, 16, 10, darken(bodyColor, 0.12));
    c.refresh();
  }

  drawCar('budapest-car-blue', '#4A6A8A');
  drawCar('budapest-car-red', '#AA3A3A');
  drawCar('budapest-car-white', '#DDDDDD');
  drawCar('budapest-car-gray', '#7A7A7A');
}

// ══════════════════════════════════════════════════════════════════════════
// ── BUILDING TEXTURES ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestBuildings(scene: Phaser.Scene): void {

  // building-parliament — 256×96, neo-Gothic with central dome and spires
  {
    const c = scene.textures.createCanvas('building-parliament', 256, 96);
    if (!c) return;
    const ctx = c.context;
    const base = '#D4C8B0';
    const dark = darken(base, 0.15);
    const roof = darken(base, 0.25);

    // Main body
    rect(ctx, 10, 30, 236, 60, base);
    // Foundation
    rect(ctx, 8, 85, 240, 11, dark);

    // Central dome
    circle(ctx, 128, 20, 18, roof);
    rect(ctx, 118, 20, 20, 20, base);
    // Dome highlight
    circle(ctx, 128, 18, 14, lighten(roof, 0.1));
    // Dome tip/spire
    rect(ctx, 127, 0, 2, 8, dark);

    // Side towers/spires
    const spirePositions = [30, 60, 90, 166, 196, 226];
    for (const sx of spirePositions) {
      rect(ctx, sx - 2, 18, 4, 14, base);
      rect(ctx, sx - 1, 10, 2, 10, dark);
      px(ctx, sx, 8, dark);
    }

    // Windows — large grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 20; col++) {
        const wx = 16 + col * 12;
        const wy = 36 + row * 12;
        rect(ctx, wx, wy, 4, 7, '#6A7A8A');
        // Window arch top
        px(ctx, wx + 1, wy - 1, dark);
        px(ctx, wx + 2, wy - 1, dark);
      }
    }

    // Decorative horizontal bands
    rect(ctx, 10, 30, 236, 2, dark);
    rect(ctx, 10, 55, 236, 1, dark);
    rect(ctx, 10, 75, 236, 1, dark);

    // Central entrance arch
    rect(ctx, 120, 68, 16, 22, '#4A3A2A');
    circle(ctx, 128, 68, 8, dark);

    // Roofline detail — small battlements
    for (let x = 10; x < 246; x += 6) {
      rect(ctx, x, 28, 4, 3, roof);
    }

    c.refresh();
  }

  // building-fishermans-bastion — 256×96, white turrets, fairytale castle
  {
    const c = scene.textures.createCanvas('building-fishermans-bastion', 256, 96);
    if (!c) return;
    const ctx = c.context;
    const white = '#EEEEEE';
    const shade = darken(white, 0.1);
    const dark = darken(white, 0.2);

    // Base wall
    rect(ctx, 20, 40, 216, 50, white);
    rect(ctx, 20, 86, 216, 10, shade);

    // Seven turrets at intervals
    const turretX = [30, 68, 106, 128, 150, 188, 226];
    for (const tx of turretX) {
      // Turret body
      rect(ctx, tx - 6, 20, 12, 30, white);
      // Conical roof
      for (let i = 0; i < 10; i++) {
        const w = 12 - i;
        rect(ctx, tx - Math.floor(w / 2), 12 + i - 8, w, 1, shade);
      }
      // Turret tip
      rect(ctx, tx - 1, 2, 2, 4, dark);
      // Turret windows
      rect(ctx, tx - 2, 28, 2, 4, '#7A8A9A');
      rect(ctx, tx + 1, 28, 2, 4, '#7A8A9A');
      // Turret battlement
      for (let bx = tx - 5; bx < tx + 6; bx += 3) {
        rect(ctx, bx, 18, 2, 3, shade);
      }
    }

    // Arcade arches along the wall
    for (let i = 0; i < 12; i++) {
      const ax = 30 + i * 18;
      rect(ctx, ax, 50, 10, 16, '#8A9AAA');
      circle(ctx, ax + 5, 50, 5, '#8A9AAA');
      // Arch frame
      circle(ctx, ax + 5, 50, 6, 'rgba(0,0,0,0)');
    }

    // Balustrade at top of wall
    for (let x = 20; x < 236; x += 4) {
      rect(ctx, x, 38, 2, 3, shade);
    }
    rect(ctx, 20, 37, 216, 2, shade);

    // Staircase detail (left side)
    for (let i = 0; i < 6; i++) {
      rect(ctx, 20 - i * 2, 70 + i * 3, 10 + i * 2, 2, shade);
    }

    c.refresh();
  }

  // building-buda-castle — 256×96, brown/gray castle on hill
  {
    const c = scene.textures.createCanvas('building-buda-castle', 256, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#9A8A70';
    const dark = darken(wall, 0.15);
    const roof = '#5A6A5A';

    // Hill base
    for (let x = 0; x < 256; x++) {
      const hillH = Math.floor(20 + 10 * Math.sin(x * 0.025));
      rect(ctx, x, 96 - hillH, 1, hillH, '#5A7A4A');
    }

    // Main castle body
    rect(ctx, 30, 30, 196, 46, wall);
    // Roof
    rect(ctx, 28, 26, 200, 5, roof);

    // Central dome
    circle(ctx, 128, 22, 12, '#6A8A6A');
    rect(ctx, 120, 22, 16, 10, wall);
    rect(ctx, 127, 8, 2, 6, dark);

    // Wings
    rect(ctx, 30, 34, 50, 40, wall);
    rect(ctx, 176, 34, 50, 40, wall);

    // Windows grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 16; col++) {
        const wx = 38 + col * 12;
        const wy = 36 + row * 12;
        rect(ctx, wx, wy, 4, 6, '#5A5A6A');
      }
    }

    // Corner towers
    for (const tx of [30, 226]) {
      rect(ctx, tx - 4, 20, 8, 56, dark);
      rect(ctx, tx - 3, 14, 6, 8, roof);
      rect(ctx, tx - 1, 10, 2, 6, dark);
    }

    // Gate
    rect(ctx, 120, 58, 16, 18, '#3A3020');
    circle(ctx, 128, 58, 8, '#3A3020');

    // Foundation line
    rect(ctx, 28, 74, 200, 3, dark);

    c.refresh();
  }

  // building-dohany-synagogue — 160×96, ornate facade, two thin towers
  {
    const c = scene.textures.createCanvas('building-dohany-synagogue', 160, 96);
    if (!c) return;
    const ctx = c.context;
    const facade = '#8A6A3A';
    const dark = darken(facade, 0.15);
    const light = lighten(facade, 0.1);

    // Main body
    rect(ctx, 20, 30, 120, 60, facade);
    // Foundation
    rect(ctx, 18, 86, 124, 10, dark);

    // Two thin towers
    for (const tx of [24, 132]) {
      rect(ctx, tx, 10, 8, 76, dark);
      // Onion dome tops
      circle(ctx, tx + 4, 8, 5, '#C8A040');
      rect(ctx, tx + 3, 2, 2, 4, '#C8A040');
      px(ctx, tx + 4, 0, darken('#C8A040', 0.2));
      // Tower windows
      for (let wy = 20; wy < 70; wy += 12) {
        rect(ctx, tx + 2, wy, 4, 6, '#5A5A6A');
      }
    }

    // Large rose window (central circle)
    circle(ctx, 80, 42, 10, '#7A9ABA');
    circle(ctx, 80, 42, 8, '#8AAACC');
    // Rosette spokes
    for (let a = 0; a < 8; a++) {
      const angle = (a * Math.PI) / 4;
      for (let r = 3; r < 9; r++) {
        px(ctx, 80 + Math.round(Math.cos(angle) * r), 42 + Math.round(Math.sin(angle) * r), dark);
      }
    }

    // Entrance arch
    rect(ctx, 68, 60, 24, 30, '#3A2A1A');
    circle(ctx, 80, 60, 12, '#3A2A1A');

    // Decorative bands
    rect(ctx, 20, 30, 120, 2, light);
    rect(ctx, 20, 55, 120, 1, light);
    rect(ctx, 20, 75, 120, 1, light);

    // Side windows
    for (let col = 0; col < 3; col++) {
      rect(ctx, 36 + col * 12, 62, 4, 8, '#5A5A6A');
      rect(ctx, 100 + col * 12, 62, 4, 8, '#5A5A6A');
    }

    // Ornamental triangles above entrance
    for (let i = 0; i < 8; i++) {
      px(ctx, 76 + i, 48 - Math.abs(i - 4), light);
    }

    c.refresh();
  }

  // building-kazinczy-synagogue — 96×64, art nouveau, blue accents
  {
    const c = scene.textures.createCanvas('building-kazinczy-synagogue', 96, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D8C8A0';
    const blue = '#4A6AAA';
    const dark = darken(wall, 0.15);

    // Main facade
    rect(ctx, 8, 16, 80, 42, wall);
    // Foundation
    rect(ctx, 6, 56, 84, 8, dark);

    // Art nouveau curved top
    for (let x = 8; x < 88; x++) {
      const curve = Math.floor(4 * Math.sin((x - 8) * Math.PI / 80));
      rect(ctx, x, 12 + curve, 1, 4 - curve, blue);
    }

    // Blue decorative tiles
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        rect(ctx, 16 + col * 14, 22 + row * 12, 6, 4, blue);
      }
    }

    // Central entrance
    rect(ctx, 36, 40, 24, 24, '#3A2A1A');
    circle(ctx, 48, 40, 12, blue);
    circle(ctx, 48, 40, 9, '#8AAACC');

    // Decorative Star of David suggestion (6 lines)
    for (let i = -4; i <= 4; i++) {
      px(ctx, 48 + i, 38 - Math.abs(i), blue);
      px(ctx, 48 + i, 42 + Math.abs(i), blue);
    }

    // Side pilasters
    rect(ctx, 8, 16, 4, 40, dark);
    rect(ctx, 84, 16, 4, 40, dark);

    c.refresh();
  }

  // building-bp-airbnb — 128×96, apartment with balconies
  {
    const c = scene.textures.createCanvas('building-bp-airbnb', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D8C8A0';
    const dark = darken(wall, 0.12);
    const balcony = '#5A5A5A';

    // Main building
    rect(ctx, 4, 8, 120, 82, wall);
    // Roof
    rect(ctx, 2, 4, 124, 6, darken(wall, 0.2));

    // Windows grid with balconies (5 cols, 4 rows)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = 12 + col * 22;
        const wy = 14 + row * 18;
        // Window
        rect(ctx, wx, wy, 10, 10, '#7A8A9A');
        // Window frame
        rect(ctx, wx - 1, wy - 1, 12, 1, dark);
        rect(ctx, wx - 1, wy + 10, 12, 1, dark);
        // Balcony railing
        if (row > 0) {
          rect(ctx, wx - 2, wy + 10, 14, 1, balcony);
          rect(ctx, wx - 2, wy + 11, 1, 3, balcony);
          rect(ctx, wx + 11, wy + 11, 1, 3, balcony);
          // Railing bars
          for (let bx = wx; bx < wx + 10; bx += 3) {
            rect(ctx, bx, wy + 11, 1, 3, balcony);
          }
        }
      }
    }

    // Entrance
    rect(ctx, 54, 70, 20, 24, '#4A3A2A');
    circle(ctx, 64, 70, 10, '#4A3A2A');

    // Decorative cornice
    rect(ctx, 2, 8, 124, 2, dark);
    for (let x = 4; x < 124; x += 8) {
      rect(ctx, x, 6, 4, 2, lighten(wall, 0.1));
    }

    c.refresh();
  }

  // building-bp-restaurant-1 — 128×96, goulash restaurant
  {
    const c = scene.textures.createCanvas('building-bp-restaurant-1', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#C8A878';
    const dark = darken(wall, 0.15);
    const awning = '#AA3333';

    // Building
    rect(ctx, 4, 12, 120, 78, wall);
    // Roof
    rect(ctx, 2, 8, 124, 6, dark);

    // Ground floor — restaurant front
    rect(ctx, 10, 54, 108, 36, darken(wall, 0.06));

    // Large front windows
    rect(ctx, 14, 58, 30, 20, '#8ABACC');
    rect(ctx, 84, 58, 30, 20, '#8ABACC');

    // Door
    rect(ctx, 54, 58, 20, 32, '#4A3A2A');
    rect(ctx, 54, 58, 20, 1, '#888');
    px(ctx, 72, 74, '#C8A020'); // door handle

    // Awning over entrance
    for (let x = 10; x < 118; x++) {
      const stripe = Math.floor((x - 10) / 6) % 2 === 0;
      rect(ctx, x, 52, 1, 4, stripe ? awning : '#FFFFFF');
    }

    // "GOULASH" sign — pixel letters suggestion (rectangular blocks)
    // G
    rect(ctx, 30, 42, 6, 8, '#FFD700');
    rect(ctx, 30, 42, 2, 8, '#FFD700');
    rect(ctx, 30, 42, 6, 2, '#FFD700');
    rect(ctx, 30, 48, 6, 2, '#FFD700');
    rect(ctx, 34, 46, 2, 4, '#FFD700');
    // O
    rect(ctx, 38, 42, 6, 8, '#FFD700');
    rect(ctx, 40, 44, 2, 4, wall);
    // U
    rect(ctx, 46, 42, 2, 8, '#FFD700');
    rect(ctx, 50, 42, 2, 8, '#FFD700');
    rect(ctx, 46, 48, 6, 2, '#FFD700');
    // L
    rect(ctx, 54, 42, 2, 8, '#FFD700');
    rect(ctx, 54, 48, 6, 2, '#FFD700');
    // A
    rect(ctx, 62, 42, 6, 8, '#FFD700');
    rect(ctx, 62, 42, 6, 2, '#FFD700');
    rect(ctx, 62, 46, 6, 2, '#FFD700');
    rect(ctx, 62, 42, 2, 8, '#FFD700');
    rect(ctx, 66, 42, 2, 8, '#FFD700');
    // S
    rect(ctx, 70, 42, 6, 2, '#FFD700');
    rect(ctx, 70, 42, 2, 4, '#FFD700');
    rect(ctx, 70, 46, 6, 2, '#FFD700');
    rect(ctx, 74, 46, 2, 4, '#FFD700');
    rect(ctx, 70, 48, 6, 2, '#FFD700');
    // H
    rect(ctx, 78, 42, 2, 8, '#FFD700');
    rect(ctx, 82, 42, 2, 8, '#FFD700');
    rect(ctx, 78, 46, 6, 2, '#FFD700');

    // Upper floor windows
    for (let col = 0; col < 4; col++) {
      rect(ctx, 16 + col * 28, 18, 12, 14, '#7A8A9A');
    }

    c.refresh();
  }

  // building-bp-restaurant-2 — 128×96, building with awning
  {
    const c = scene.textures.createCanvas('building-bp-restaurant-2', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D0B888';
    const dark = darken(wall, 0.12);

    // Building
    rect(ctx, 4, 12, 120, 78, wall);
    rect(ctx, 2, 8, 124, 6, dark);

    // Upper windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        rect(ctx, 12 + col * 22, 16 + row * 16, 10, 10, '#7A8A9A');
      }
    }

    // Large striped awning
    for (let x = 8; x < 120; x++) {
      const stripe = Math.floor((x - 8) / 8) % 2 === 0;
      rect(ctx, x, 52, 1, 6, stripe ? '#2A6A2A' : '#EEEEEE');
    }

    // Restaurant front
    rect(ctx, 12, 58, 40, 30, '#8ABACC');
    rect(ctx, 76, 58, 40, 30, '#8ABACC');
    // Door
    rect(ctx, 54, 60, 20, 30, '#4A3A2A');
    px(ctx, 72, 76, '#C8A020');

    // Outdoor tables (small details)
    rect(ctx, 16, 88, 8, 4, '#8A6A4A');
    rect(ctx, 104, 88, 8, 4, '#8A6A4A');

    c.refresh();
  }

  // building-budapest-eye — 96×96, Ferris wheel structure
  {
    const c = scene.textures.createCanvas('building-budapest-eye', 96, 96);
    if (!c) return;
    const ctx = c.context;
    const metal = '#7A7A8A';

    // Circle outline for wheel
    for (let angle = 0; angle < 360; angle += 2) {
      const rad = (angle * Math.PI) / 180;
      const wx = 48 + Math.round(Math.cos(rad) * 36);
      const wy = 42 + Math.round(Math.sin(rad) * 36);
      px(ctx, wx, wy, metal);
      // Double thickness
      px(ctx, wx + 1, wy, metal);
    }

    // Spokes
    for (let spoke = 0; spoke < 12; spoke++) {
      const rad = (spoke * Math.PI) / 6;
      for (let r = 4; r < 36; r++) {
        const sx = 48 + Math.round(Math.cos(rad) * r);
        const sy = 42 + Math.round(Math.sin(rad) * r);
        px(ctx, sx, sy, darken(metal, 0.1));
      }
    }

    // Hub
    circle(ctx, 48, 42, 4, darken(metal, 0.2));

    // Tiny cabins around rim
    for (let cab = 0; cab < 12; cab++) {
      const rad = (cab * Math.PI) / 6;
      const cx = 48 + Math.round(Math.cos(rad) * 36);
      const cy = 42 + Math.round(Math.sin(rad) * 36);
      rect(ctx, cx - 2, cy, 4, 4, '#4A8ACA');
      rect(ctx, cx - 2, cy, 4, 1, metal);
    }

    // Support structure — A-frame legs
    // Left leg
    for (let i = 0; i < 20; i++) {
      rect(ctx, 32 + i, 78 + i, 2, 1, '#5A5A6A');
    }
    // Right leg
    for (let i = 0; i < 20; i++) {
      rect(ctx, 62 - i, 78 + i, 2, 1, '#5A5A6A');
    }
    // Cross brace
    rect(ctx, 38, 88, 20, 2, '#5A5A6A');

    // Ground platform
    rect(ctx, 20, 92, 56, 4, '#6A6A6A');

    c.refresh();
  }

  // building-bp-hotel — 128×96, hotel facade
  {
    const c = scene.textures.createCanvas('building-bp-hotel', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#C8B898';
    const dark = darken(wall, 0.12);
    const trim = '#8A7A5A';

    // Main building
    rect(ctx, 4, 8, 120, 82, wall);
    // Roof
    rect(ctx, 2, 4, 124, 6, trim);
    // Roof detail
    for (let x = 4; x < 124; x += 6) {
      rect(ctx, x, 2, 4, 3, darken(trim, 0.1));
    }

    // Windows (5 cols × 4 rows)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = 12 + col * 22;
        const wy = 14 + row * 18;
        rect(ctx, wx, wy, 10, 10, '#7A8A9A');
        // Shutters
        rect(ctx, wx - 2, wy, 2, 10, trim);
        rect(ctx, wx + 10, wy, 2, 10, trim);
      }
    }

    // Grand entrance
    rect(ctx, 46, 68, 36, 24, '#4A3A2A');
    circle(ctx, 64, 68, 18, '#4A3A2A');
    // Entrance columns
    rect(ctx, 44, 60, 4, 32, '#AAA');
    rect(ctx, 80, 60, 4, 32, '#AAA');
    // Door
    rect(ctx, 52, 72, 24, 20, '#5A4A3A');
    px(ctx, 74, 82, '#C8A020');

    // Hotel name bar
    rect(ctx, 30, 58, 68, 8, trim);

    // Decorative cornice
    rect(ctx, 4, 10, 120, 2, dark);

    c.refresh();
  }

  // building-ruin-bar-exterior — 128×96, weathered brick, neon accent
  {
    const c = scene.textures.createCanvas('building-ruin-bar-exterior', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const brick = '#8A6A50';
    const rng = seededRandom(7000);

    // Weathered brick wall
    rect(ctx, 4, 8, 120, 82, brick);

    // Brick pattern with weathering
    for (let row = 0; row < 12; row++) {
      const offset = (row % 2) * 8;
      for (let col = -1; col < 9; col++) {
        const bx = 4 + col * 16 + offset;
        const by = 8 + row * 7;
        if (bx >= 4 && bx < 124) {
          const shade = rng();
          const brickColor = shade > 0.7 ? darken(brick, 0.1) : shade > 0.3 ? brick : lighten(brick, 0.08);
          const w = Math.min(14, 124 - bx);
          rect(ctx, bx, by, w, 6, brickColor);
        }
      }
    }

    // Mortar lines
    for (let y = 8; y < 90; y += 7) {
      rect(ctx, 4, y, 120, 1, darken(brick, 0.25));
    }

    // Crumbling patches
    for (let i = 0; i < 8; i++) {
      const px_ = Math.floor(rng() * 100) + 10;
      const py = Math.floor(rng() * 60) + 14;
      rect(ctx, px_, py, 3 + Math.floor(rng() * 4), 2, darken(brick, 0.2));
    }

    // Neon sign accent
    rect(ctx, 30, 20, 68, 16, 'rgba(0,0,0,0.3)');
    // Neon glow
    rect(ctx, 34, 22, 60, 12, '#FF44AA');
    rect(ctx, 36, 24, 56, 8, darken('#FF44AA', 0.3));
    // Neon letters shape (abstract bar shapes)
    rect(ctx, 38, 24, 4, 8, '#FF66CC');
    rect(ctx, 44, 24, 4, 8, '#FF66CC');
    rect(ctx, 44, 28, 8, 2, '#FF66CC');
    rect(ctx, 54, 24, 4, 8, '#FF66CC');
    rect(ctx, 60, 24, 8, 2, '#FF66CC');
    rect(ctx, 60, 28, 8, 2, '#FF66CC');
    rect(ctx, 60, 30, 4, 2, '#FF66CC');
    rect(ctx, 72, 24, 4, 8, '#FF66CC');
    rect(ctx, 78, 24, 4, 8, '#FF66CC');
    rect(ctx, 72, 24, 10, 2, '#FF66CC');
    rect(ctx, 72, 30, 10, 2, '#FF66CC');

    // Entrance — old wooden door
    rect(ctx, 48, 56, 32, 34, '#5A4A3A');
    rect(ctx, 48, 56, 32, 2, '#4A3A2A');
    px(ctx, 78, 72, '#C8A020');

    // Graffiti patches
    rect(ctx, 10, 60, 12, 8, '#44AA88');
    rect(ctx, 100, 40, 16, 10, '#CC6644');

    // Exposed pipe
    rect(ctx, 122, 10, 2, 80, '#666');

    c.refresh();
  }

  // building-bp-shop-1 — 64×64, shopfront with awning
  {
    const c = scene.textures.createCanvas('building-bp-shop-1', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D4C0A0';

    rect(ctx, 2, 4, 60, 56, wall);
    rect(ctx, 0, 0, 64, 6, darken(wall, 0.15));

    // Upper window
    rect(ctx, 12, 10, 16, 12, '#7A8A9A');
    rect(ctx, 36, 10, 16, 12, '#7A8A9A');

    // Awning
    for (let x = 4; x < 60; x++) {
      const stripe = Math.floor((x - 4) / 6) % 2 === 0;
      rect(ctx, x, 28, 1, 4, stripe ? '#CC4444' : '#FFFFFF');
    }

    // Shop window
    rect(ctx, 6, 34, 22, 20, '#8ABACC');
    rect(ctx, 36, 34, 22, 20, '#8ABACC');

    // Door
    rect(ctx, 28, 38, 8, 22, '#4A3A2A');
    px(ctx, 35, 50, '#C8A020');

    // Sign board
    rect(ctx, 14, 26, 36, 4, '#5A4A3A');

    c.refresh();
  }

  // building-bp-shop-2 — 64×64, variant shopfront
  {
    const c = scene.textures.createCanvas('building-bp-shop-2', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#C8B898';

    rect(ctx, 2, 4, 60, 56, wall);
    rect(ctx, 0, 0, 64, 6, darken(wall, 0.18));

    // Upper windows — arched
    for (let col = 0; col < 3; col++) {
      const wx = 8 + col * 18;
      rect(ctx, wx, 12, 10, 10, '#7A8A9A');
      circle(ctx, wx + 5, 12, 5, '#7A8A9A');
    }

    // Green awning
    rect(ctx, 4, 28, 56, 4, '#2A6A2A');
    rect(ctx, 4, 30, 56, 2, '#1A5A1A');

    // Large shop window
    rect(ctx, 6, 34, 52, 18, '#8ABACC');
    // Window divider
    rect(ctx, 31, 34, 2, 18, wall);

    // Door
    rect(ctx, 24, 52, 16, 10, '#4A3A2A');
    px(ctx, 38, 58, '#C8A020');

    c.refresh();
  }

  // building-bp-shop-3 — 64×64, variant
  {
    const c = scene.textures.createCanvas('building-bp-shop-3', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#B8A888';

    rect(ctx, 2, 4, 60, 56, wall);
    rect(ctx, 0, 0, 64, 6, '#6A5A4A');

    // Narrow upper windows
    for (let col = 0; col < 4; col++) {
      rect(ctx, 8 + col * 14, 10, 6, 14, '#7A8A9A');
    }

    // Blue awning
    for (let x = 4; x < 60; x++) {
      rect(ctx, x, 28, 1, 5, '#3A5AAA');
    }
    rect(ctx, 4, 31, 56, 2, darken('#3A5AAA', 0.15));

    // Display window
    rect(ctx, 6, 36, 24, 16, '#8ABACC');
    rect(ctx, 34, 36, 24, 16, '#8ABACC');

    // Door
    rect(ctx, 26, 38, 12, 22, '#5A4A3A');
    px(ctx, 36, 50, '#C8A020');

    // Decorative trim
    rect(ctx, 2, 26, 60, 2, lighten(wall, 0.15));

    c.refresh();
  }

  // building-bp-shop-4 — 64×64, variant
  {
    const c = scene.textures.createCanvas('building-bp-shop-4', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D0C0A8';

    rect(ctx, 2, 4, 60, 56, wall);
    rect(ctx, 0, 0, 64, 6, darken(wall, 0.2));

    // Upper floor — shuttered windows
    for (let col = 0; col < 2; col++) {
      const wx = 12 + col * 26;
      rect(ctx, wx, 10, 14, 12, '#7A8A9A');
      // Shutters
      rect(ctx, wx - 2, 10, 2, 12, '#4A6A4A');
      rect(ctx, wx + 14, 10, 2, 12, '#4A6A4A');
    }

    // Yellow awning
    for (let x = 4; x < 60; x++) {
      const stripe = Math.floor((x - 4) / 5) % 2 === 0;
      rect(ctx, x, 28, 1, 4, stripe ? '#E8C820' : '#FFFFFF');
    }

    // Shop front
    rect(ctx, 6, 34, 52, 20, '#8ABACC');
    // Door center
    rect(ctx, 26, 40, 12, 20, '#5A4A3A');
    px(ctx, 36, 52, '#C8A020');

    // Flower box under windows
    rect(ctx, 14, 22, 10, 3, '#6A4A3A');
    rect(ctx, 15, 20, 3, 2, '#CC4444');
    rect(ctx, 19, 20, 3, 2, '#DD77AA');
    rect(ctx, 40, 22, 10, 3, '#6A4A3A');
    rect(ctx, 41, 20, 3, 2, '#DDCC44');
    rect(ctx, 45, 20, 3, 2, '#CC4444');

    c.refresh();
  }

  // building-bp-airport-terminal — 192×96, modern glass terminal
  {
    const c = scene.textures.createCanvas('building-bp-airport-terminal', 192, 96);
    if (!c) return;
    const ctx = c.context;
    const glass = '#6A8AAA';
    const frame = '#4A5A6A';
    const concrete = '#AAAAAA';

    // Main structure
    rect(ctx, 4, 20, 184, 70, glass);

    // Concrete base
    rect(ctx, 2, 86, 188, 10, concrete);

    // Modern curved roof
    for (let x = 4; x < 188; x++) {
      const roofY = Math.floor(16 + 4 * Math.sin((x - 4) * Math.PI / 184));
      rect(ctx, x, roofY, 1, 20 - roofY + 4, frame);
    }
    rect(ctx, 4, 16, 184, 2, darken(frame, 0.2));

    // Glass panels grid
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 4; row++) {
        const wx = 10 + col * 15;
        const wy = 24 + row * 14;
        rect(ctx, wx, wy, 12, 11, lighten(glass, 0.1));
        // Frame lines
        rect(ctx, wx, wy, 12, 1, frame);
        rect(ctx, wx, wy, 1, 11, frame);
      }
    }

    // Entrance doors (central)
    rect(ctx, 72, 56, 48, 34, '#3A5A7A');
    // Revolving door suggestion
    rect(ctx, 82, 60, 28, 26, lighten(glass, 0.15));
    rect(ctx, 95, 60, 2, 26, frame);
    rect(ctx, 82, 72, 28, 2, frame);

    // Side entrances
    rect(ctx, 20, 64, 16, 26, '#3A5A7A');
    rect(ctx, 156, 64, 16, 26, '#3A5A7A');

    // "BUDAPEST" sign area (pixel blocks for letters)
    rect(ctx, 60, 10, 72, 6, '#FFFFFF');
    // Simple letter blocks
    for (let i = 0; i < 8; i++) {
      rect(ctx, 64 + i * 8, 11, 5, 4, frame);
    }

    // Control tower (right side)
    rect(ctx, 172, 2, 12, 18, frame);
    rect(ctx, 170, 2, 16, 4, lighten(glass, 0.2));
    rect(ctx, 174, 6, 8, 8, lighten(glass, 0.15));

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── DECORATION TEXTURES ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestDecorations(scene: Phaser.Scene): void {

  // deco-bp-bench — 32×32, European park bench
  {
    const c = scene.textures.createCanvas('deco-bp-bench', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const wood = '#8B6942';
    const metal = '#4A4A4A';

    // Metal legs
    rect(ctx, 6, 20, 2, 10, metal);
    rect(ctx, 24, 20, 2, 10, metal);
    // Seat slats
    for (let i = 0; i < 4; i++) {
      rect(ctx, 4, 18 + i * 2, 24, 1, wood);
    }
    // Back slats
    for (let i = 0; i < 4; i++) {
      rect(ctx, 4, 10 + i * 2, 24, 1, wood);
    }
    // Armrests
    rect(ctx, 4, 16, 2, 4, metal);
    rect(ctx, 26, 16, 2, 4, metal);
    // Back support
    rect(ctx, 6, 8, 2, 12, metal);
    rect(ctx, 24, 8, 2, 12, metal);

    c.refresh();
  }

  // deco-bp-lamp — 32×32, ornate street lamp
  {
    const c = scene.textures.createCanvas('deco-bp-lamp', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const pole = '#3A3A3A';

    // Pole
    rect(ctx, 15, 10, 2, 20, pole);
    // Base (wider)
    rect(ctx, 12, 28, 8, 3, pole);
    rect(ctx, 13, 26, 6, 2, pole);
    // Ornate bracket
    rect(ctx, 13, 10, 6, 2, pole);
    rect(ctx, 12, 8, 8, 3, darken(pole, 0.1));
    // Light fixture
    circle(ctx, 16, 6, 4, '#FFE866');
    circle(ctx, 16, 6, 3, '#FFEE88');
    // Glow
    circle(ctx, 16, 6, 5, 'rgba(255,238,136,0.2)');
    // Cap
    rect(ctx, 14, 2, 4, 2, pole);

    c.refresh();
  }

  // deco-bp-tree — 32×32, deciduous tree (round green crown)
  {
    const c = scene.textures.createCanvas('deco-bp-tree', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const trunk = '#6A4A2A';
    const crown = '#3A7A3A';

    // Trunk
    rect(ctx, 14, 18, 4, 12, trunk);
    rect(ctx, 13, 28, 6, 2, darken(trunk, 0.1));
    // Crown — large round shape
    circle(ctx, 16, 12, 10, crown);
    circle(ctx, 12, 14, 7, darken(crown, 0.05));
    circle(ctx, 20, 14, 7, lighten(crown, 0.05));
    circle(ctx, 16, 10, 8, lighten(crown, 0.08));
    // Leaf highlights
    px(ctx, 10, 8, lighten(crown, 0.2));
    px(ctx, 14, 6, lighten(crown, 0.2));
    px(ctx, 20, 7, lighten(crown, 0.15));
    // Shadow at base
    rect(ctx, 10, 30, 12, 2, 'rgba(0,0,0,0.1)');

    c.refresh();
  }

  // deco-bp-tree-autumn — 32×32, same shape, orange/red crown
  {
    const c = scene.textures.createCanvas('deco-bp-tree-autumn', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const trunk = '#6A4A2A';
    const crown = '#CC6622';

    // Trunk
    rect(ctx, 14, 18, 4, 12, trunk);
    rect(ctx, 13, 28, 6, 2, darken(trunk, 0.1));
    // Crown — large round shape in autumn colors
    circle(ctx, 16, 12, 10, crown);
    circle(ctx, 12, 14, 7, '#BB4422');
    circle(ctx, 20, 14, 7, '#DD8833');
    circle(ctx, 16, 10, 8, '#EE9944');
    // Autumn leaf highlights
    px(ctx, 10, 8, '#FFAA44');
    px(ctx, 14, 6, '#FF6633');
    px(ctx, 20, 7, '#DDAA33');
    px(ctx, 18, 12, '#CC3322');
    // Shadow
    rect(ctx, 10, 30, 12, 2, 'rgba(0,0,0,0.1)');

    c.refresh();
  }

  // deco-bp-bush — 32×32, trimmed hedge
  {
    const c = scene.textures.createCanvas('deco-bp-bush', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const green = '#2A5A2A';

    // Rectangular hedge shape
    rect(ctx, 4, 12, 24, 16, green);
    // Rounded top
    rect(ctx, 6, 10, 20, 4, green);
    rect(ctx, 8, 8, 16, 4, green);
    // Leaf texture variation
    const rng = seededRandom(6000);
    for (let i = 0; i < 20; i++) {
      const x = 4 + Math.floor(rng() * 24);
      const y = 10 + Math.floor(rng() * 16);
      px(ctx, x, y, rng() > 0.5 ? lighten(green, 0.15) : darken(green, 0.1));
    }
    // Shadow
    rect(ctx, 6, 28, 20, 2, 'rgba(0,0,0,0.1)');

    c.refresh();
  }

  // deco-bp-flower-bed — 32×32, colorful flower patch
  {
    const c = scene.textures.createCanvas('deco-bp-flower-bed', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(6100);

    // Earth base
    rect(ctx, 4, 20, 24, 8, '#6A5A3A');
    // Green foliage base
    rect(ctx, 3, 14, 26, 8, '#3A6A2A');

    // Flowers — random colorful dots
    const colors = ['#FF4444', '#FF88AA', '#FFDD44', '#FF66CC', '#FFAAAA', '#DD44DD'];
    for (let i = 0; i < 16; i++) {
      const x = 4 + Math.floor(rng() * 24);
      const y = 12 + Math.floor(rng() * 8);
      const color = colors[Math.floor(rng() * colors.length)];
      px(ctx, x, y, color);
      px(ctx, x + 1, y, color);
      // Stem
      px(ctx, x, y + 1, '#2A5A1A');
    }

    // Border stones
    for (let x = 2; x < 30; x += 3) {
      rect(ctx, x, 26, 2, 2, '#8A8A8A');
    }

    c.refresh();
  }

  // deco-bp-fountain — 48×48, circular basin with water
  {
    const c = scene.textures.createCanvas('deco-bp-fountain', 48, 48);
    if (!c) return;
    const ctx = c.context;
    const stone = '#8A8A8A';

    // Basin (ellipse approximation)
    circle(ctx, 24, 30, 16, stone);
    circle(ctx, 24, 30, 14, '#3A6A9A');
    circle(ctx, 24, 30, 12, '#4A7AAA');

    // Water highlights
    for (let i = 0; i < 8; i++) {
      px(ctx, 18 + i * 2, 28 + (i % 3), lighten('#4A7AAA', 0.2));
    }

    // Central pedestal
    rect(ctx, 22, 20, 4, 14, stone);
    rect(ctx, 20, 18, 8, 4, stone);

    // Water spout top
    circle(ctx, 24, 16, 3, lighten(stone, 0.1));
    // Water spray (tiny dots going up)
    px(ctx, 24, 12, '#8ABAEE');
    px(ctx, 23, 10, '#8ABAEE');
    px(ctx, 25, 10, '#8ABAEE');
    px(ctx, 24, 8, '#AACCFF');
    px(ctx, 22, 14, '#8ABAEE');
    px(ctx, 26, 13, '#8ABAEE');

    // Shadow
    circle(ctx, 24, 42, 16, 'rgba(0,0,0,0.08)');

    c.refresh();
  }

  // deco-bp-statue — 32×64, gray figure on pedestal
  {
    const c = scene.textures.createCanvas('deco-bp-statue', 32, 64);
    if (!c) return;
    const ctx = c.context;
    const stone = '#7A7A7A';
    const dark = darken(stone, 0.15);

    // Pedestal
    rect(ctx, 6, 48, 20, 14, dark);
    rect(ctx, 4, 46, 24, 4, stone);
    rect(ctx, 8, 60, 16, 4, darken(dark, 0.1));

    // Figure body
    rect(ctx, 12, 24, 8, 22, stone);
    // Arms outstretched slightly
    rect(ctx, 8, 28, 4, 8, stone);
    rect(ctx, 20, 28, 4, 8, stone);
    // Head
    circle(ctx, 16, 20, 4, stone);
    // Legs
    rect(ctx, 12, 42, 3, 6, stone);
    rect(ctx, 17, 42, 3, 6, stone);

    // Highlights/details
    px(ctx, 14, 18, lighten(stone, 0.2));
    px(ctx, 18, 18, lighten(stone, 0.2));
    // Cape/drape flowing
    rect(ctx, 10, 26, 2, 16, darken(stone, 0.08));
    rect(ctx, 20, 26, 2, 16, darken(stone, 0.08));

    c.refresh();
  }

  // deco-bp-cafe-table — 32×32, round table with 2 chairs
  {
    const c = scene.textures.createCanvas('deco-bp-cafe-table', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const table = '#8A7A6A';
    const chair = '#5A4A3A';

    // Table (round top)
    circle(ctx, 16, 16, 6, table);
    // Table leg
    rect(ctx, 15, 20, 2, 6, darken(table, 0.15));
    rect(ctx, 13, 25, 6, 2, darken(table, 0.1));

    // Chair left
    rect(ctx, 4, 14, 4, 4, chair);
    rect(ctx, 4, 18, 4, 6, chair);
    rect(ctx, 4, 12, 4, 2, darken(chair, 0.1)); // back
    rect(ctx, 4, 24, 1, 3, chair); // legs
    rect(ctx, 7, 24, 1, 3, chair);

    // Chair right
    rect(ctx, 24, 14, 4, 4, chair);
    rect(ctx, 24, 18, 4, 6, chair);
    rect(ctx, 24, 12, 4, 2, darken(chair, 0.1));
    rect(ctx, 24, 24, 1, 3, chair);
    rect(ctx, 27, 24, 1, 3, chair);

    // Cup on table
    rect(ctx, 15, 14, 3, 2, '#FFFFFF');
    px(ctx, 14, 15, '#FFFFFF'); // handle

    c.refresh();
  }

  // deco-bp-string-lights — 64×8, horizontal line with yellow dots
  {
    const c = scene.textures.createCanvas('deco-bp-string-lights', 64, 8);
    if (!c) return;
    const ctx = c.context;

    // Wire
    for (let x = 0; x < 64; x++) {
      const y = 3 + Math.floor(Math.sin(x * 0.15) * 1.5);
      px(ctx, x, y, '#333333');
    }

    // Light bulbs
    for (let x = 4; x < 64; x += 6) {
      const y = 3 + Math.floor(Math.sin(x * 0.15) * 1.5);
      px(ctx, x, y + 1, '#FFEE66');
      px(ctx, x + 1, y + 1, '#FFEE66');
      px(ctx, x, y + 2, '#FFE844');
      px(ctx, x + 1, y + 2, '#FFE844');
    }

    c.refresh();
  }

  // deco-bp-mural — 64×64, colorful abstract rectangles on brick
  {
    const c = scene.textures.createCanvas('deco-bp-mural', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(6200);

    // Brick background
    rect(ctx, 0, 0, 64, 64, '#8A6A50');
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * 8;
      for (let col = -1; col < 5; col++) {
        const bx = col * 16 + offset;
        if (bx >= 0 && bx < 64) {
          const shade = rng() > 0.5 ? darken('#8A6A50', 0.05) : lighten('#8A6A50', 0.05);
          rect(ctx, bx, row * 8, Math.min(14, 64 - bx), 7, shade);
        }
      }
    }

    // Abstract art — colorful rectangles
    const muralColors = ['#3A8ACA', '#CA4A3A', '#4ACA6A', '#CACA3A', '#AA4ACA', '#CA8A3A'];
    for (let i = 0; i < 12; i++) {
      const x = 4 + Math.floor(rng() * 48);
      const y = 4 + Math.floor(rng() * 48);
      const w = 4 + Math.floor(rng() * 12);
      const h = 4 + Math.floor(rng() * 12);
      const color = muralColors[Math.floor(rng() * muralColors.length)];
      rect(ctx, x, y, w, h, color);
    }

    // Bold outlines on some shapes
    for (let i = 0; i < 4; i++) {
      const x = 8 + Math.floor(rng() * 40);
      const y = 8 + Math.floor(rng() * 40);
      rect(ctx, x, y, 10, 1, '#1A1A1A');
      rect(ctx, x, y, 1, 10, '#1A1A1A');
      rect(ctx, x + 10, y, 1, 10, '#1A1A1A');
      rect(ctx, x, y + 10, 11, 1, '#1A1A1A');
    }

    c.refresh();
  }

  // deco-bp-mural-2 — 64×64, different abstract pattern
  {
    const c = scene.textures.createCanvas('deco-bp-mural-2', 64, 64);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(6300);

    // Plaster background
    rect(ctx, 0, 0, 64, 64, '#C8B898');

    // Large geometric shapes
    circle(ctx, 20, 20, 12, '#4A6AAA');
    circle(ctx, 44, 16, 8, '#AA4A4A');
    rect(ctx, 8, 36, 20, 20, '#4AAA6A');
    rect(ctx, 34, 32, 24, 24, '#CACA3A');

    // Overlapping triangles
    for (let i = 0; i < 14; i++) {
      px(ctx, 32 + i, 10 + i, '#AA4ACA');
      px(ctx, 32 - i, 10 + i, '#AA4ACA');
    }

    // Drip effect
    for (let i = 0; i < 5; i++) {
      const x = 10 + Math.floor(rng() * 44);
      const len = 8 + Math.floor(rng() * 12);
      const color = rng() > 0.5 ? '#3A6AAA' : '#AA3A3A';
      rect(ctx, x, 30, 1, len, color);
    }

    // White spatter
    for (let i = 0; i < 15; i++) {
      px(ctx, Math.floor(rng() * 64), Math.floor(rng() * 64), '#FFFFFF');
    }

    c.refresh();
  }

  // deco-bp-flag-hungarian — 32×32, red-white-green horizontal stripes on pole
  {
    const c = scene.textures.createCanvas('deco-bp-flag-hungarian', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Pole
    rect(ctx, 4, 0, 2, 32, '#5A5A5A');
    // Flag (horizontal stripes)
    rect(ctx, 8, 4, 20, 6, '#CE2939');  // Red
    rect(ctx, 8, 10, 20, 6, '#FFFFFF'); // White
    rect(ctx, 8, 16, 20, 6, '#477050'); // Green
    // Flag wave
    px(ctx, 27, 5, darken('#CE2939', 0.1));
    px(ctx, 27, 11, darken('#FFFFFF', 0.1));
    px(ctx, 27, 17, darken('#477050', 0.1));
    // Pole top ornament
    circle(ctx, 5, 2, 2, '#C8A020');

    c.refresh();
  }

  // deco-bp-flag-eu — 32×32, blue with yellow circle dots on pole
  {
    const c = scene.textures.createCanvas('deco-bp-flag-eu', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Pole
    rect(ctx, 4, 0, 2, 32, '#5A5A5A');
    // Flag — blue field
    rect(ctx, 8, 4, 20, 16, '#003399');
    // Yellow star circle (12 stars around edge)
    for (let star = 0; star < 12; star++) {
      const angle = (star * Math.PI * 2) / 12 - Math.PI / 2;
      const sx = 18 + Math.round(Math.cos(angle) * 6);
      const sy = 12 + Math.round(Math.sin(angle) * 5);
      px(ctx, sx, sy, '#FFCC00');
      px(ctx, sx + 1, sy, '#FFCC00');
    }
    // Pole top ornament
    circle(ctx, 5, 2, 2, '#C8A020');

    c.refresh();
  }

  // deco-bp-pigeon — 16×16, small gray bird
  {
    const c = scene.textures.createCanvas('deco-bp-pigeon', 16, 16);
    if (!c) return;
    const ctx = c.context;
    const gray = '#8A8A8A';

    // Body
    rect(ctx, 4, 8, 8, 4, gray);
    rect(ctx, 5, 7, 6, 2, gray);
    // Head
    rect(ctx, 10, 5, 4, 4, lighten(gray, 0.1));
    // Eye
    px(ctx, 12, 6, '#1A1A1A');
    // Beak
    px(ctx, 14, 7, '#CC8844');
    // Tail
    rect(ctx, 2, 8, 3, 2, darken(gray, 0.1));
    px(ctx, 1, 9, darken(gray, 0.15));
    // Feet
    px(ctx, 6, 12, '#CC6644');
    px(ctx, 7, 12, '#CC6644');
    px(ctx, 9, 12, '#CC6644');
    px(ctx, 10, 12, '#CC6644');
    // Wing detail
    rect(ctx, 5, 8, 5, 3, darken(gray, 0.08));
    // Iridescent neck
    px(ctx, 10, 8, '#5A7A5A');
    px(ctx, 11, 8, '#6A5A8A');

    c.refresh();
  }

  // deco-bp-luggage-carousel — 64×32, conveyor belt with bags
  {
    const c = scene.textures.createCanvas('deco-bp-luggage-carousel', 64, 32);
    if (!c) return;
    const ctx = c.context;
    const belt = '#4A4A4A';

    // Conveyor belt outline (oval track)
    rect(ctx, 8, 10, 48, 12, belt);
    rect(ctx, 10, 8, 44, 2, belt);
    rect(ctx, 10, 22, 44, 2, belt);
    // Inner area
    rect(ctx, 12, 12, 40, 8, '#5A5A5A');
    // Belt segments
    for (let x = 10; x < 54; x += 4) {
      px(ctx, x, 10, darken(belt, 0.15));
      px(ctx, x, 21, darken(belt, 0.15));
    }

    // Luggage on belt
    rect(ctx, 14, 8, 8, 6, '#AA3A3A'); // red suitcase
    rect(ctx, 26, 9, 6, 5, '#3A6AAA'); // blue bag
    rect(ctx, 38, 8, 7, 6, '#4A4A2A'); // olive bag
    rect(ctx, 48, 9, 5, 5, '#2A2A2A'); // black bag

    // Handles on bags
    rect(ctx, 17, 7, 2, 1, '#666');
    rect(ctx, 28, 8, 2, 1, '#666');
    rect(ctx, 41, 7, 2, 1, '#666');

    // Metal frame
    rect(ctx, 4, 24, 56, 2, '#777');
    // Legs
    rect(ctx, 8, 26, 2, 4, '#666');
    rect(ctx, 54, 26, 2, 4, '#666');
    rect(ctx, 30, 26, 2, 4, '#666');

    c.refresh();
  }

  // deco-bp-exchange-booth — 32×32, orange counter with sign
  {
    const c = scene.textures.createCanvas('deco-bp-exchange-booth', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Counter body
    rect(ctx, 2, 14, 28, 16, '#E88A20');
    rect(ctx, 2, 14, 28, 2, darken('#E88A20', 0.15));
    // Counter top
    rect(ctx, 0, 12, 32, 3, darken('#E88A20', 0.1));
    // Window/opening
    rect(ctx, 8, 16, 16, 8, '#FFEECC');
    // Sign above
    rect(ctx, 4, 4, 24, 8, '#2A4A8A');
    // "$" symbol suggestion
    rect(ctx, 14, 5, 4, 6, '#FFD700');
    px(ctx, 13, 6, '#FFD700');
    px(ctx, 19, 9, '#FFD700');
    // Glass divider
    rect(ctx, 8, 16, 16, 1, '#AACCEE');

    c.refresh();
  }

  // deco-bp-bus-stop-sign — 32×32, tall pole with blue sign
  {
    const c = scene.textures.createCanvas('deco-bp-bus-stop-sign', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Pole
    rect(ctx, 15, 8, 2, 22, '#5A5A5A');
    // Base
    rect(ctx, 12, 28, 8, 3, '#6A6A6A');
    // Sign panel
    rect(ctx, 6, 2, 20, 10, '#2A5AAA');
    // "BUS" text blocks
    rect(ctx, 9, 4, 4, 6, '#FFFFFF');
    rect(ctx, 14, 4, 4, 6, '#FFFFFF');
    rect(ctx, 19, 4, 4, 6, '#FFFFFF');
    // Border
    rect(ctx, 6, 2, 20, 1, '#1A4A8A');
    rect(ctx, 6, 11, 20, 1, '#1A4A8A');

    c.refresh();
  }

  // deco-bp-tram-stop — 32×32, shelter shape
  {
    const c = scene.textures.createCanvas('deco-bp-tram-stop', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const metal = '#5A5A5A';

    // Shelter roof
    rect(ctx, 2, 4, 28, 3, metal);
    rect(ctx, 0, 3, 32, 2, darken(metal, 0.1));
    // Support poles
    rect(ctx, 4, 6, 2, 22, metal);
    rect(ctx, 26, 6, 2, 22, metal);
    // Back panel (partial glass)
    rect(ctx, 4, 6, 24, 14, 'rgba(100,160,200,0.4)');
    // Bench inside
    rect(ctx, 8, 22, 16, 2, '#8A6A4A');
    // Sign
    rect(ctx, 10, 0, 12, 4, '#E8C820');
    // "T" for tram
    rect(ctx, 14, 1, 4, 1, '#1A1A1A');
    rect(ctx, 15, 1, 2, 3, '#1A1A1A');
    // Ground line
    rect(ctx, 0, 28, 32, 2, '#8A8A8A');

    c.refresh();
  }

  // deco-bp-chain-bridge-pillar — 32×64, tall stone pillar/tower
  {
    const c = scene.textures.createCanvas('deco-bp-chain-bridge-pillar', 32, 64);
    if (!c) return;
    const ctx = c.context;
    const stone = '#8A8070';
    const dark = darken(stone, 0.15);

    // Main pillar body
    rect(ctx, 8, 8, 16, 52, stone);
    // Top — wider cap
    rect(ctx, 4, 4, 24, 6, dark);
    rect(ctx, 6, 0, 20, 6, stone);
    // Pyramidal top
    rect(ctx, 10, 0, 12, 2, dark);
    rect(ctx, 12, -1, 8, 2, darken(dark, 0.1));
    // Base — wider
    rect(ctx, 4, 56, 24, 8, dark);
    // Stone block lines
    for (let y = 10; y < 56; y += 6) {
      rect(ctx, 8, y, 16, 1, darken(stone, 0.1));
    }
    // Chain attachment points
    rect(ctx, 6, 12, 3, 4, '#5A5A3A');
    rect(ctx, 23, 12, 3, 4, '#5A5A3A');
    // Decorative arch cutout
    rect(ctx, 12, 20, 8, 12, darken(stone, 0.08));
    circle(ctx, 16, 20, 4, darken(stone, 0.08));

    c.refresh();
  }

  // deco-bp-bathtub-couch — 32×32, quirky bathtub shape with cushion
  {
    const c = scene.textures.createCanvas('deco-bp-bathtub-couch', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Bathtub body (clawfoot shape)
    rect(ctx, 4, 12, 24, 14, '#EEEEEE');
    // Curved lip at top
    rect(ctx, 2, 10, 28, 3, '#FFFFFF');
    // Interior
    rect(ctx, 6, 14, 20, 10, '#DDDDDD');
    // Cushion inside
    rect(ctx, 7, 14, 18, 8, '#AA3A5A');
    rect(ctx, 8, 15, 16, 6, lighten('#AA3A5A', 0.1));
    // Pillow
    rect(ctx, 8, 14, 6, 4, '#CC5A7A');
    // Claw feet
    rect(ctx, 5, 26, 3, 3, '#C8A020');
    rect(ctx, 24, 26, 3, 3, '#C8A020');
    // Faucet
    rect(ctx, 24, 8, 2, 4, '#AAA');
    rect(ctx, 24, 8, 4, 2, '#AAA');

    c.refresh();
  }

  // deco-bp-graffiti — 64×32, colorful spray-paint pattern
  {
    const c = scene.textures.createCanvas('deco-bp-graffiti', 64, 32);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(6400);

    // Wall background
    rect(ctx, 0, 0, 64, 32, '#9A8A70');

    // Spray-paint shapes
    // Big bubble letters (abstract)
    circle(ctx, 12, 16, 8, '#FF4466');
    circle(ctx, 26, 14, 9, '#44AAFF');
    circle(ctx, 40, 16, 7, '#44FF66');
    circle(ctx, 52, 14, 8, '#FFAA44');

    // Letter-like shapes within bubbles
    rect(ctx, 9, 12, 2, 8, '#CC2244');
    rect(ctx, 9, 12, 6, 2, '#CC2244');
    rect(ctx, 23, 10, 2, 8, darken('#44AAFF', 0.15));
    rect(ctx, 23, 10, 6, 2, darken('#44AAFF', 0.15));
    rect(ctx, 23, 14, 6, 2, darken('#44AAFF', 0.15));
    rect(ctx, 37, 12, 6, 2, darken('#44FF66', 0.15));
    rect(ctx, 37, 12, 2, 8, darken('#44FF66', 0.15));
    rect(ctx, 37, 18, 6, 2, darken('#44FF66', 0.15));

    // Drips
    for (let i = 0; i < 6; i++) {
      const x = 6 + Math.floor(rng() * 52);
      const len = 3 + Math.floor(rng() * 5);
      rect(ctx, x, 22, 1, len, rng() > 0.5 ? '#FF4466' : '#44AAFF');
    }

    // Outline
    for (let x = 0; x < 64; x++) {
      px(ctx, x, 0, darken('#9A8A70', 0.1));
      px(ctx, x, 31, darken('#9A8A70', 0.1));
    }

    c.refresh();
  }

  // deco-bp-neon-sign — 32×32, bright pink/blue glowing rectangle
  {
    const c = scene.textures.createCanvas('deco-bp-neon-sign', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Dark backing board
    rect(ctx, 2, 4, 28, 20, '#1A1A2A');

    // Outer glow (faint)
    rect(ctx, 0, 2, 32, 24, 'rgba(255,68,170,0.1)');

    // Neon border — pink
    for (let x = 4; x < 28; x++) {
      px(ctx, x, 6, '#FF44AA');
      px(ctx, x, 22, '#FF44AA');
    }
    for (let y = 6; y < 23; y++) {
      px(ctx, 4, y, '#FF44AA');
      px(ctx, 27, y, '#FF44AA');
    }

    // Inner neon text — blue "BAR" shapes
    // B
    rect(ctx, 8, 10, 2, 8, '#44AAFF');
    rect(ctx, 8, 10, 4, 2, '#44AAFF');
    rect(ctx, 8, 14, 4, 2, '#44AAFF');
    rect(ctx, 8, 17, 4, 2, '#44AAFF');
    // A
    rect(ctx, 14, 10, 2, 8, '#44AAFF');
    rect(ctx, 18, 10, 2, 8, '#44AAFF');
    rect(ctx, 14, 10, 6, 2, '#44AAFF');
    rect(ctx, 14, 14, 6, 2, '#44AAFF');
    // R
    rect(ctx, 22, 10, 2, 8, '#44AAFF');
    rect(ctx, 22, 10, 4, 2, '#44AAFF');
    rect(ctx, 22, 14, 4, 2, '#44AAFF');
    rect(ctx, 24, 14, 2, 4, '#44AAFF');

    // Mounting screws
    px(ctx, 3, 5, '#666');
    px(ctx, 28, 5, '#666');
    px(ctx, 3, 23, '#666');
    px(ctx, 28, 23, '#666');

    c.refresh();
  }

  // deco-bp-barrels — 32×32, wine barrels stacked
  {
    const c = scene.textures.createCanvas('deco-bp-barrels', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const wood = '#7A5A3A';
    const band = '#5A5A5A';

    // Bottom barrel (left)
    rect(ctx, 2, 16, 12, 14, wood);
    circle(ctx, 8, 22, 5, lighten(wood, 0.05));
    rect(ctx, 2, 18, 12, 1, band);
    rect(ctx, 2, 26, 12, 1, band);
    // Spigot
    px(ctx, 8, 23, '#C8A020');

    // Bottom barrel (right)
    rect(ctx, 18, 16, 12, 14, wood);
    circle(ctx, 24, 22, 5, lighten(wood, 0.05));
    rect(ctx, 18, 18, 12, 1, band);
    rect(ctx, 18, 26, 12, 1, band);

    // Top barrel (center, stacked)
    rect(ctx, 10, 4, 12, 12, darken(wood, 0.05));
    circle(ctx, 16, 10, 5, wood);
    rect(ctx, 10, 6, 12, 1, band);
    rect(ctx, 10, 12, 12, 1, band);

    c.refresh();
  }

  // deco-bp-mismatched-chair — 32×32, quirky colored chair
  {
    const c = scene.textures.createCanvas('deco-bp-mismatched-chair', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Chair back (teal)
    rect(ctx, 8, 4, 16, 12, '#2A8A8A');
    rect(ctx, 10, 6, 12, 8, lighten('#2A8A8A', 0.1));
    // Decorative dots on back
    px(ctx, 13, 8, '#FFDD44');
    px(ctx, 19, 8, '#FF6644');
    px(ctx, 16, 10, '#FF44AA');

    // Seat (orange)
    rect(ctx, 6, 16, 20, 4, '#DD8833');
    rect(ctx, 7, 17, 18, 2, lighten('#DD8833', 0.1));

    // Legs (mismatched)
    rect(ctx, 8, 20, 2, 10, '#8A4A2A');  // wood
    rect(ctx, 22, 20, 2, 10, '#5A5A5A'); // metal
    rect(ctx, 8, 28, 2, 2, '#8A4A2A');
    rect(ctx, 22, 28, 2, 2, '#5A5A5A');

    c.refresh();
  }

  // deco-bp-plants-hanging — 32×32, green hanging plant tendrils
  {
    const c = scene.textures.createCanvas('deco-bp-plants-hanging', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const pot = '#AA6A3A';
    const green = '#3A8A3A';

    // Hanging hook/chain
    px(ctx, 16, 0, '#666');
    px(ctx, 16, 1, '#666');
    px(ctx, 16, 2, '#666');

    // Pot
    rect(ctx, 10, 3, 12, 6, pot);
    rect(ctx, 11, 2, 10, 2, darken(pot, 0.1));
    rect(ctx, 12, 8, 8, 2, pot);

    // Foliage at top
    circle(ctx, 16, 6, 6, green);
    circle(ctx, 12, 5, 4, lighten(green, 0.1));
    circle(ctx, 20, 5, 4, darken(green, 0.05));

    // Hanging tendrils
    const rng = seededRandom(6500);
    for (let tendril = 0; tendril < 5; tendril++) {
      let tx = 8 + Math.floor(rng() * 16);
      let ty = 10;
      for (let seg = 0; seg < 12 + Math.floor(rng() * 8); seg++) {
        px(ctx, tx, ty, green);
        ty++;
        tx += Math.floor(rng() * 3) - 1;
        tx = Math.max(2, Math.min(29, tx));
        if (ty > 31) break;
        // Occasional leaf
        if (rng() < 0.3) {
          px(ctx, tx + 1, ty, lighten(green, 0.15));
          px(ctx, tx - 1, ty, lighten(green, 0.1));
        }
      }
    }

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── CUTSCENE SPRITES ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestCutsceneSprites(scene: Phaser.Scene): void {

  // budapest-eye-wheel — 128×128, large Ferris wheel
  {
    const c = scene.textures.createCanvas('budapest-eye-wheel', 128, 128);
    if (!c) return;
    const ctx = c.context;
    const metal = '#7A7A8A';
    const darkMetal = darken(metal, 0.15);

    // Outer rim circle
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      const wx = 64 + Math.round(Math.cos(rad) * 54);
      const wy = 64 + Math.round(Math.sin(rad) * 54);
      px(ctx, wx, wy, metal);
      px(ctx, wx + 1, wy, metal);
      px(ctx, wx, wy + 1, metal);
    }

    // Inner rim
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      const wx = 64 + Math.round(Math.cos(rad) * 50);
      const wy = 64 + Math.round(Math.sin(rad) * 50);
      px(ctx, wx, wy, darkMetal);
    }

    // Spokes — 16 of them
    for (let spoke = 0; spoke < 16; spoke++) {
      const rad = (spoke * Math.PI) / 8;
      for (let r = 6; r < 52; r++) {
        const sx = 64 + Math.round(Math.cos(rad) * r);
        const sy = 64 + Math.round(Math.sin(rad) * r);
        px(ctx, sx, sy, darkMetal);
      }
    }

    // Hub
    circle(ctx, 64, 64, 6, darkMetal);
    circle(ctx, 64, 64, 4, metal);

    // Cabins around rim
    for (let cab = 0; cab < 16; cab++) {
      const rad = (cab * Math.PI) / 8;
      const cx = 64 + Math.round(Math.cos(rad) * 54);
      const cy = 64 + Math.round(Math.sin(rad) * 54);
      // Cabin body
      rect(ctx, cx - 3, cy + 1, 6, 6, '#4A8ACA');
      // Cabin roof/hanger
      rect(ctx, cx - 2, cy - 1, 4, 2, metal);
      // Cabin window
      rect(ctx, cx - 2, cy + 2, 4, 2, lighten('#4A8ACA', 0.2));
    }

    c.refresh();
  }

  // budapest-eye-cabin — 16×16, single cabin
  {
    const c = scene.textures.createCanvas('budapest-eye-cabin', 16, 16);
    if (!c) return;
    const ctx = c.context;

    // Hanger arm
    rect(ctx, 7, 0, 2, 4, '#7A7A8A');
    // Cabin body
    rect(ctx, 2, 4, 12, 10, '#4A8ACA');
    // Roof
    rect(ctx, 1, 3, 14, 2, '#5A5A6A');
    // Window
    rect(ctx, 4, 6, 8, 4, lighten('#4A8ACA', 0.25));
    // Window frame
    rect(ctx, 4, 6, 8, 1, '#5A5A6A');
    rect(ctx, 8, 6, 1, 4, '#5A5A6A');
    // Floor
    rect(ctx, 2, 13, 12, 1, darken('#4A8ACA', 0.15));
    // Bottom trim
    rect(ctx, 3, 14, 10, 1, '#5A5A6A');

    c.refresh();
  }

  // budapest-skyline — 800×200, city silhouette in dark gray
  {
    const c = scene.textures.createCanvas('budapest-skyline', 800, 200);
    if (!c) return;
    const ctx = c.context;
    const dark = '#2A2A3A';
    const mid = '#3A3A4A';

    // Background buildings — varying heights
    const rng = seededRandom(8000);
    for (let x = 0; x < 800; x += 12 + Math.floor(rng() * 8)) {
      const w = 10 + Math.floor(rng() * 20);
      const h = 40 + Math.floor(rng() * 80);
      const shade = rng() > 0.5 ? dark : mid;
      rect(ctx, x, 200 - h, w, h, shade);
      // Windows
      for (let wy = 200 - h + 4; wy < 196; wy += 8) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          if (rng() > 0.3) {
            px(ctx, wx, wy, '#6A7A4A');
            px(ctx, wx + 1, wy, '#6A7A4A');
            px(ctx, wx, wy + 1, '#6A7A4A');
            px(ctx, wx + 1, wy + 1, '#6A7A4A');
          }
        }
      }
    }

    // Parliament dome silhouette (center-left)
    circle(ctx, 200, 100, 24, dark);
    rect(ctx, 180, 100, 40, 60, dark);
    rect(ctx, 199, 70, 2, 10, dark);
    // Spires
    for (const sx of [170, 185, 215, 230]) {
      rect(ctx, sx, 90, 3, 70, dark);
      rect(ctx, sx, 80, 3, 12, mid);
    }

    // Church spires (right side)
    rect(ctx, 550, 80, 4, 120, dark);
    rect(ctx, 548, 70, 8, 12, dark);
    rect(ctx, 551, 65, 2, 8, mid);

    rect(ctx, 600, 90, 4, 110, dark);
    rect(ctx, 598, 82, 8, 10, dark);
    rect(ctx, 601, 76, 2, 8, mid);

    // Buda castle silhouette (far right)
    rect(ctx, 680, 100, 80, 100, dark);
    circle(ctx, 720, 90, 16, dark);
    rect(ctx, 710, 90, 20, 30, dark);
    rect(ctx, 719, 72, 2, 10, mid);

    // Bridge silhouette spans
    for (let x = 300; x < 500; x++) {
      const catenary = Math.floor(8 * Math.pow((x - 400) / 100, 2));
      px(ctx, x, 170 + catenary, dark);
      px(ctx, x, 171 + catenary, dark);
    }
    // Bridge towers
    rect(ctx, 320, 150, 6, 40, dark);
    rect(ctx, 474, 150, 6, 40, dark);

    c.refresh();
  }

  // bp-bus-interior-frame — 800×600, dark border frame with window cutout
  {
    const c = scene.textures.createCanvas('bp-bus-interior-frame', 800, 600);
    if (!c) return;
    const ctx = c.context;
    const border = '#2A2A2A';

    // Top border
    rect(ctx, 0, 0, 800, 50, border);
    // Bottom border
    rect(ctx, 0, 550, 800, 50, border);
    // Left border
    rect(ctx, 0, 0, 50, 600, border);
    // Right border
    rect(ctx, 750, 0, 50, 600, border);

    // Gradient darkening near edges (inner ring)
    rect(ctx, 50, 50, 800 - 100, 15, 'rgba(42,42,42,0.6)');
    rect(ctx, 50, 535, 800 - 100, 15, 'rgba(42,42,42,0.6)');
    rect(ctx, 50, 50, 15, 600 - 100, 'rgba(42,42,42,0.6)');
    rect(ctx, 735, 50, 15, 600 - 100, 'rgba(42,42,42,0.6)');

    // Bus interior details on borders
    // Seat headrests (bottom border)
    for (let x = 80; x < 720; x += 60) {
      rect(ctx, x, 555, 30, 15, '#4A4A5A');
      rect(ctx, x + 2, 557, 26, 11, '#5A5A6A');
    }

    // Ceiling grab rails (top border)
    rect(ctx, 60, 42, 680, 2, '#8A8A8A');
    for (let x = 80; x < 740; x += 40) {
      rect(ctx, x, 36, 2, 8, '#8A8A8A');
    }

    // Window frame edges
    rect(ctx, 48, 48, 704, 2, '#5A5A5A');
    rect(ctx, 48, 548, 704, 2, '#5A5A5A');
    rect(ctx, 48, 48, 2, 502, '#5A5A5A');
    rect(ctx, 750, 48, 2, 502, '#5A5A5A');

    c.refresh();
  }

  // bp-bus-building-1 — 64×96, suburban building silhouette
  {
    const c = scene.textures.createCanvas('bp-bus-building-1', 64, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#C8B898';
    const rng = seededRandom(8100);

    rect(ctx, 4, 16, 56, 76, wall);
    // Pitched roof
    for (let x = 4; x < 60; x++) {
      const roofH = Math.max(0, 14 - Math.abs(x - 32) * 0.5);
      rect(ctx, x, 16 - Math.floor(roofH), 1, Math.floor(roofH), '#8A5A3A');
    }

    // Windows (3×2 grid)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = 10 + col * 18;
        const wy = 28 + row * 24;
        rect(ctx, wx, wy, 8, 10, '#7A8A9A');
        // Some lit, some dark
        if (rng() > 0.4) {
          rect(ctx, wx + 1, wy + 1, 6, 8, '#FFEE88');
        }
      }
    }

    // Door
    rect(ctx, 24, 72, 16, 20, '#5A4A3A');
    px(ctx, 38, 82, '#C8A020');

    // Chimney
    rect(ctx, 44, 4, 6, 14, '#8A6A5A');

    c.refresh();
  }

  // bp-bus-building-2 — 64×128, taller city building
  {
    const c = scene.textures.createCanvas('bp-bus-building-2', 64, 128);
    if (!c) return;
    const ctx = c.context;
    const wall = '#AAAAAA';
    const rng = seededRandom(8200);

    rect(ctx, 2, 8, 60, 116, wall);
    // Flat roof
    rect(ctx, 0, 4, 64, 6, darken(wall, 0.15));

    // Windows (3 cols × 6 rows)
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = 8 + col * 18;
        const wy = 14 + row * 18;
        rect(ctx, wx, wy, 10, 12, '#6A7A8A');
        if (rng() > 0.35) {
          rect(ctx, wx + 1, wy + 1, 8, 10, '#FFEE88');
        }
      }
    }

    // Entrance
    rect(ctx, 20, 108, 24, 20, '#4A3A2A');

    // Balconies on some floors
    for (let row = 1; row < 6; row += 2) {
      for (let col = 0; col < 3; col++) {
        const bx = 8 + col * 18;
        const by = 14 + row * 18 + 12;
        rect(ctx, bx - 1, by, 12, 1, '#6A6A6A');
      }
    }

    c.refresh();
  }

  // bp-bus-building-3 — 48×96, apartment block variant
  {
    const c = scene.textures.createCanvas('bp-bus-building-3', 48, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D4C0A0';
    const rng = seededRandom(8300);

    rect(ctx, 2, 12, 44, 80, wall);
    // Decorative cornice
    rect(ctx, 0, 8, 48, 6, darken(wall, 0.12));
    for (let x = 2; x < 46; x += 6) {
      rect(ctx, x, 6, 4, 3, darken(wall, 0.18));
    }

    // Windows (2 cols × 4 rows)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const wx = 8 + col * 20;
        const wy = 18 + row * 16;
        rect(ctx, wx, wy, 10, 10, '#7A8A9A');
        if (rng() > 0.3) {
          rect(ctx, wx + 1, wy + 1, 8, 8, '#FFEE88');
        }
        // Window ledge
        rect(ctx, wx - 1, wy + 10, 12, 1, darken(wall, 0.1));
      }
    }

    // Entrance
    rect(ctx, 16, 76, 16, 16, '#4A3A2A');
    px(ctx, 30, 84, '#C8A020');

    // Drainpipe
    rect(ctx, 44, 14, 2, 78, '#6A6A6A');

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN EXPORT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

export function generateBudapestTextures(scene: Phaser.Scene): void {
  generateBudapestTerrain(scene);
  generateBudapestNPCs(scene);
  generateBudapestVehicles(scene);
  generateBudapestBuildings(scene);
  generateBudapestDecorations(scene);
  generateBudapestCutsceneSprites(scene);
}
