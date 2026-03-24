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
  const c = scene.textures.createCanvas('budapest-terrain', 352, 32);
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

  // Frame 10: WaterShallow — lighter blue with foam, visible riverbed stones, gentle ripples
  {
    const ox = 320;
    const rng = seededRandom(6000);
    rect(ctx, ox, 0, 32, 32, '#2A5A8A');
    // Lighter ripple pattern
    for (let y = 0; y < 32; y += 3) {
      for (let x = 0; x < 32; x++) {
        if (rng() < 0.15) px(ctx, ox + x, y, lighten('#2A5A8A', 0.12));
      }
    }
    // Subtle wave lines
    for (let x = 0; x < 32; x++) {
      const wy = 8 + Math.floor(Math.sin(x * 0.4) * 1.5);
      px(ctx, ox + x, wy, lighten('#2A5A8A', 0.08));
      const wy2 = 20 + Math.floor(Math.sin(x * 0.3 + 1) * 1.5);
      px(ctx, ox + x, wy2, lighten('#2A5A8A', 0.08));
    }
    // Foam/edge pattern along top edge (y=0-2)
    for (let x = 0; x < 32; x++) {
      if (rng() < 0.4) px(ctx, ox + x, 0, '#FFFFFF');
      if (rng() < 0.3) px(ctx, ox + x, 1, '#EEEEFF');
      if (rng() < 0.2) px(ctx, ox + x, 2, '#DDDDEE');
    }
    // Visible riverbed stones — semi-visible gray-brown dots
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = 8 + Math.floor(rng() * 22);
      px(ctx, ox + x, y, '#7A6A5A');
      if (rng() > 0.5) px(ctx, ox + x + 1, y, '#7A6A5A');
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

  // npc-bp-hiker — olive green top, khaki pants, walking stick, hat
  {
    const c = scene.textures.createCanvas('npc-bp-hiker', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D4A574', hair: '#5A3A1A', top: '#556B2F', pants: '#8B7355',
      shoes: '#4A3A2A',
      detail: (ctx) => {
        // Wide-brim hiking hat
        rect(ctx, 14, 2, 20, 3, '#6A5A3A');
        rect(ctx, 17, 0, 14, 3, '#6A5A3A');
        // Walking stick — thin brown rect from right hand down
        rect(ctx, 37, 34, 2, 12, '#6A4A2A');
        rect(ctx, 37, 33, 2, 1, '#8A6A4A');
      },
    });
    c.refresh();
  }

  // npc-bp-fisherman — blue-gray top, gray hair, fishing rod
  {
    const c = scene.textures.createCanvas('npc-bp-fisherman', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#C8A882', hair: '#888888', top: '#4A6A7A', pants: '#5A5A5A',
      shoes: '#3A3A3A',
      detail: (ctx) => {
        // Fishing rod — thin line extending from right hand diagonally up-right
        for (let i = 0; i < 15; i++) {
          px(ctx, 37 + Math.floor(i * 0.4), 34 - i, '#5A3A1A');
        }
        // Rod tip
        px(ctx, 43, 20, '#8A6A4A');
        // Fishing line from tip down
        for (let y = 20; y < 34; y++) {
          px(ctx, 44, y, '#CCCCCC');
        }
        // Bucket at feet
        rect(ctx, 10, 40, 5, 4, '#4A6A8A');
        rect(ctx, 10, 40, 5, 1, darken('#4A6A8A', 0.15));
      },
    });
    c.refresh();
  }

  // npc-bp-bath-goer — white top, blue shorts, towel over shoulder
  {
    const c = scene.textures.createCanvas('npc-bp-bath-goer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#E8C8A0', hair: '#AA6622', top: '#FFFFFF', pants: '#4488AA',
      shoes: '#5A5A5A',
      detail: (ctx) => {
        // Towel draped over left arm/shoulder
        rect(ctx, 8, 22, 6, 2, '#FFFFFF');
        rect(ctx, 7, 24, 4, 10, '#FFFFFF');
        // Towel stripe
        rect(ctx, 7, 28, 4, 1, '#4488AA');
        rect(ctx, 7, 31, 4, 1, '#4488AA');
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

  // budapest-river-boat — 48×16, white river boat with windows and Hungarian flag
  {
    const c = scene.textures.createCanvas('budapest-river-boat', 48, 16);
    if (!c) return;
    const ctx = c.context;
    // White hull with curved bottom
    rect(ctx, 4, 6, 40, 8, '#F0F0F0');
    rect(ctx, 6, 4, 36, 4, '#F0F0F0');
    // Bow curve
    rect(ctx, 2, 8, 3, 4, '#F0F0F0');
    // Stern
    rect(ctx, 44, 8, 2, 4, '#E0E0E0');
    // Blue windows — 3 small rectangles
    rect(ctx, 12, 7, 5, 3, '#6AAACE');
    rect(ctx, 20, 7, 5, 3, '#6AAACE');
    rect(ctx, 28, 7, 5, 3, '#6AAACE');
    // Red chimney near back
    rect(ctx, 38, 2, 3, 4, '#CC3333');
    rect(ctx, 37, 2, 5, 1, darken('#CC3333', 0.1));
    // Hungarian flag at top (red-white-green, 4×3)
    rect(ctx, 40, 0, 4, 1, '#CE2939');
    rect(ctx, 40, 1, 4, 1, '#FFFFFF');
    rect(ctx, 40, 2, 4, 1, '#477050');
    // Flagpole
    rect(ctx, 39, 0, 1, 4, '#5A5A5A');
    // Waterline
    rect(ctx, 4, 13, 40, 1, '#4A7AAA');
    c.refresh();
  }

  // budapest-barge — 64×12, dark cargo barge
  {
    const c = scene.textures.createCanvas('budapest-barge', 64, 12);
    if (!c) return;
    const ctx = c.context;
    // Dark hull
    rect(ctx, 2, 6, 60, 5, '#3A3A4A');
    rect(ctx, 4, 4, 56, 3, '#3A3A4A');
    // Bow taper
    rect(ctx, 0, 7, 3, 3, '#3A3A4A');
    // Flat deck
    rect(ctx, 4, 3, 56, 2, '#5A5A5A');
    // Cargo containers (blue, red, green, each ~12×6)
    rect(ctx, 8, 0, 12, 4, '#3A6AAA');
    rect(ctx, 8, 0, 12, 1, darken('#3A6AAA', 0.15));
    rect(ctx, 24, 0, 12, 4, '#AA3A3A');
    rect(ctx, 24, 0, 12, 1, darken('#AA3A3A', 0.15));
    rect(ctx, 40, 0, 12, 4, '#3A8A3A');
    rect(ctx, 40, 0, 12, 1, darken('#3A8A3A', 0.15));
    // Waterline
    rect(ctx, 2, 10, 60, 1, '#4A7AAA');
    c.refresh();
  }
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

    // Hungarian flag at dome peak (red-white-green, 6×2)
    rect(ctx, 126, -4, 6, 1, '#CE2939');
    rect(ctx, 126, -3, 6, 1, '#FFFFFF');
    rect(ctx, 126, -2, 6, 1, '#477050');
    // Flagpole
    rect(ctx, 125, -5, 1, 5, '#5A5A5A');

    // Row of tiny arches below dome (3px tall semicircles)
    for (let ax = 112; ax < 144; ax += 5) {
      rect(ctx, ax, 36, 4, 1, dark);
      rect(ctx, ax, 34, 1, 3, dark);
      rect(ctx, ax + 3, 34, 1, 3, dark);
      px(ctx, ax + 1, 33, dark);
      px(ctx, ax + 2, 33, dark);
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

    // Tiny cross at each turret tip (2px '+' shape)
    for (const tx of turretX) {
      px(ctx, tx, 0, dark);
      px(ctx, tx, 1, dark);
      px(ctx, tx - 1, 1, dark);
      px(ctx, tx + 1, 1, dark);
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

    // Ground glow — semi-transparent yellow circle at base
    circle(ctx, 48, 92, 20, 'rgba(255,238,136,0.12)');
    circle(ctx, 48, 92, 14, 'rgba(255,238,136,0.08)');

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

  // building-citadella — 128×64, star-shaped fortress on Gellért Hill
  {
    const c = scene.textures.createCanvas('building-citadella', 128, 64);
    if (!c) return;
    const ctx = c.context;
    const wall = '#7A7A6A';
    const dark = darken(wall, 0.15);

    // Main fortress body (star approximation with angular bastions)
    rect(ctx, 20, 16, 88, 40, wall);
    // Angular bastions (protruding rectangles at corners)
    rect(ctx, 10, 24, 16, 24, wall);
    rect(ctx, 102, 24, 16, 24, wall);
    rect(ctx, 40, 8, 20, 14, wall);
    rect(ctx, 68, 8, 20, 14, wall);
    rect(ctx, 40, 50, 20, 12, wall);
    rect(ctx, 68, 50, 20, 12, wall);

    // Wall outlines / darker edges
    rect(ctx, 20, 16, 88, 2, dark);
    rect(ctx, 20, 54, 88, 2, dark);
    rect(ctx, 20, 16, 2, 40, dark);
    rect(ctx, 106, 16, 2, 40, dark);

    // Bastion edges
    rect(ctx, 10, 24, 16, 2, dark);
    rect(ctx, 102, 24, 16, 2, dark);
    rect(ctx, 40, 8, 20, 2, dark);
    rect(ctx, 68, 8, 20, 2, dark);

    // Lookout platform — horizontal line near top with balustrade bumps
    rect(ctx, 30, 20, 68, 1, dark);
    for (let x = 32; x < 96; x += 4) {
      rect(ctx, x, 18, 2, 3, dark);
    }

    // Hungarian flag at center top (red-white-green, 6×4)
    rect(ctx, 61, 4, 6, 1, '#CE2939');
    rect(ctx, 61, 5, 6, 2, '#FFFFFF');
    rect(ctx, 61, 7, 6, 1, '#477050');
    // Flagpole
    rect(ctx, 60, 2, 1, 6, '#5A5A5A');

    // Interior courtyard suggestion
    rect(ctx, 40, 28, 48, 20, darken(wall, 0.06));

    // Foundation
    rect(ctx, 8, 58, 112, 6, dark);

    c.refresh();
  }

  // building-opera-house — 128×64, classical facade with columns and pediment
  {
    const c = scene.textures.createCanvas('building-opera-house', 128, 64);
    if (!c) return;
    const ctx = c.context;
    const stone = '#C8B890';
    const dark = darken(stone, 0.15);

    // Main building body
    rect(ctx, 4, 18, 120, 42, stone);
    // Dark foundation
    rect(ctx, 2, 58, 124, 6, darken(stone, 0.25));

    // Pediment — triangle at top (multiple horizontal rects getting narrower)
    rect(ctx, 20, 14, 88, 2, dark);
    rect(ctx, 26, 12, 76, 2, dark);
    rect(ctx, 32, 10, 64, 2, dark);
    rect(ctx, 38, 8, 52, 2, dark);
    rect(ctx, 44, 6, 40, 2, dark);
    rect(ctx, 50, 4, 28, 2, dark);
    rect(ctx, 56, 2, 16, 2, dark);
    rect(ctx, 62, 0, 4, 2, darken(dark, 0.1));

    // 4 columns (vertical rectangles)
    const colX = [28, 48, 76, 96];
    for (const cx of colX) {
      rect(ctx, cx, 16, 5, 42, stone);
      rect(ctx, cx, 16, 5, 2, lighten(stone, 0.1));
      rect(ctx, cx, 56, 5, 2, lighten(stone, 0.1));
      // Column fluting (subtle darker lines)
      rect(ctx, cx + 1, 18, 1, 38, darken(stone, 0.06));
      rect(ctx, cx + 3, 18, 1, 38, darken(stone, 0.06));
    }

    // Arched entrance at center — dark rectangle with circle above
    rect(ctx, 54, 38, 20, 22, '#3A2A1A');
    circle(ctx, 64, 38, 10, '#3A2A1A');

    // Red awning above entrance
    rect(ctx, 52, 34, 24, 3, '#AA3333');

    // Balcony — horizontal line at mid-height with vertical bars
    rect(ctx, 10, 30, 108, 1, dark);
    for (let x = 12; x < 116; x += 3) {
      rect(ctx, x, 30, 1, 3, dark);
    }

    // Upper windows
    for (let col = 0; col < 6; col++) {
      rect(ctx, 12 + col * 18, 20, 8, 8, '#6A7A8A');
    }

    // Lower windows
    for (let col = 0; col < 4; col++) {
      rect(ctx, 8 + col * 12, 42, 6, 8, '#6A7A8A');
      rect(ctx, 84 + col * 12, 42, 6, 8, '#6A7A8A');
    }

    // Decorative horizontal band
    rect(ctx, 4, 18, 120, 1, dark);

    c.refresh();
  }

  // building-gellert-baths — 192×96, art nouveau thermal baths
  {
    const c = scene.textures.createCanvas('building-gellert-baths', 192, 96);
    if (!c) return;
    const ctx = c.context;
    const stone = '#D4C8A0';
    const dark = darken(stone, 0.12);
    const accent = '#4A8AAA';

    // Main facade
    rect(ctx, 8, 24, 176, 66, stone);
    // Foundation
    rect(ctx, 6, 88, 180, 8, darken(stone, 0.2));

    // Central dome
    circle(ctx, 96, 16, 16, darken(stone, 0.15));
    rect(ctx, 84, 16, 24, 10, stone);
    // Dome highlight
    circle(ctx, 96, 14, 12, darken(stone, 0.1));
    // Dome tip
    rect(ctx, 95, 0, 2, 6, dark);

    // Two side wings — wider rectangles
    rect(ctx, 8, 30, 60, 58, stone);
    rect(ctx, 124, 30, 60, 58, stone);

    // Large windows in each wing (3 per wing)
    for (let i = 0; i < 3; i++) {
      // Left wing windows
      rect(ctx, 14 + i * 18, 40, 12, 16, '#6A7A8A');
      rect(ctx, 14 + i * 18, 40, 12, 1, dark);
      // Right wing windows
      rect(ctx, 130 + i * 18, 40, 12, 16, '#6A7A8A');
      rect(ctx, 130 + i * 18, 40, 12, 1, dark);
    }

    // Central section windows
    for (let i = 0; i < 3; i++) {
      rect(ctx, 76 + i * 14, 34, 8, 12, '#6A7A8A');
    }

    // Arched entrance — pool-blue accent
    rect(ctx, 80, 62, 32, 28, accent);
    circle(ctx, 96, 62, 16, accent);
    // Inner entrance
    rect(ctx, 84, 66, 24, 24, darken(accent, 0.15));

    // Decorative horizontal bands
    rect(ctx, 8, 24, 176, 2, dark);
    rect(ctx, 8, 58, 176, 1, dark);
    rect(ctx, 8, 78, 176, 1, dark);

    // Art nouveau decorative curves on facade
    for (let x = 12; x < 72; x += 2) {
      const y = 26 + Math.floor(Math.sin(x * 0.2) * 1.5);
      px(ctx, x, y, dark);
    }
    for (let x = 124; x < 180; x += 2) {
      const y = 26 + Math.floor(Math.sin(x * 0.2) * 1.5);
      px(ctx, x, y, dark);
    }

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

  // deco-bp-liberty-bridge-pillar — 32×48, green iron art nouveau pillar
  {
    const c = scene.textures.createCanvas('deco-bp-liberty-bridge-pillar', 32, 48);
    if (!c) return;
    const ctx = c.context;
    const iron = '#2A6A3A';
    const dark = darken(iron, 0.15);

    // Main pillar body
    rect(ctx, 10, 8, 12, 36, iron);
    // Wider base
    rect(ctx, 6, 40, 20, 8, dark);
    rect(ctx, 8, 38, 16, 4, iron);
    // Art nouveau arch shape at top
    rect(ctx, 6, 4, 20, 6, iron);
    rect(ctx, 8, 2, 16, 4, iron);
    circle(ctx, 16, 6, 6, lighten(iron, 0.08));
    rect(ctx, 12, 0, 8, 4, iron);
    // Cross-bracing pattern (X of thin lines)
    for (let i = 0; i < 20; i++) {
      px(ctx, 11 + Math.floor(i * 0.5), 12 + i, dark);
      px(ctx, 21 - Math.floor(i * 0.5), 12 + i, dark);
    }
    // Decorative rivets
    for (let y = 14; y < 38; y += 6) {
      px(ctx, 10, y, lighten(iron, 0.2));
      px(ctx, 21, y, lighten(iron, 0.2));
    }

    c.refresh();
  }

  // deco-bp-margaret-bridge-pillar — 32×48, light gray stone pillar
  {
    const c = scene.textures.createCanvas('deco-bp-margaret-bridge-pillar', 32, 48);
    if (!c) return;
    const ctx = c.context;
    const stone = '#AAAAAA';
    const dark = darken(stone, 0.12);

    // Main body — wider at base, narrowing upward
    rect(ctx, 8, 8, 16, 32, stone);
    rect(ctx, 6, 28, 20, 16, stone);
    rect(ctx, 4, 40, 24, 8, dark);
    // Cap at top — wider section
    rect(ctx, 6, 4, 20, 6, dark);
    rect(ctx, 8, 2, 16, 4, stone);
    rect(ctx, 10, 0, 12, 4, darken(dark, 0.1));
    // Stone block lines
    for (let y = 10; y < 40; y += 5) {
      rect(ctx, 8, y, 16, 1, darken(stone, 0.08));
    }
    // Subtle highlights
    rect(ctx, 14, 6, 4, 2, lighten(stone, 0.1));

    c.refresh();
  }

  // deco-bp-music-note — 8×8, black eighth note
  {
    const c = scene.textures.createCanvas('deco-bp-music-note', 8, 8);
    if (!c) return;
    const ctx = c.context;

    // Note head circle at (3,5) radius 2
    circle(ctx, 3, 5, 2, '#1A1A1A');
    // Stem going up (1px line from (5,2) to (5,5))
    rect(ctx, 5, 1, 1, 5, '#1A1A1A');
    // Flag at top — small line
    px(ctx, 6, 1, '#1A1A1A');
    px(ctx, 7, 2, '#1A1A1A');
    px(ctx, 6, 2, '#1A1A1A');

    c.refresh();
  }

  // deco-bp-couple-bench — 32×32, two figures sitting on a bench
  {
    const c = scene.textures.createCanvas('deco-bp-couple-bench', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Bench — brown rectangle
    rect(ctx, 4, 20, 24, 3, '#7A5A3A');
    // Bench legs
    rect(ctx, 6, 23, 2, 6, '#5A4A3A');
    rect(ctx, 24, 23, 2, 6, '#5A4A3A');
    // Bench back
    rect(ctx, 4, 14, 24, 2, '#7A5A3A');
    rect(ctx, 6, 16, 2, 4, '#5A4A3A');
    rect(ctx, 24, 16, 2, 4, '#5A4A3A');

    // Left figure — blue shirt
    rect(ctx, 8, 10, 5, 4, '#E8C8A0'); // head
    rect(ctx, 8, 14, 5, 6, '#4488FF'); // body
    rect(ctx, 7, 8, 3, 3, '#5A3A20'); // hair
    px(ctx, 10, 11, '#334'); // eye

    // Right figure — pink shirt
    rect(ctx, 19, 10, 5, 4, '#E8C8A0'); // head
    rect(ctx, 19, 14, 5, 6, '#FF6688'); // body
    rect(ctx, 18, 8, 3, 3, '#8A5A2A'); // hair
    px(ctx, 21, 11, '#334'); // eye

    // Shadow
    rect(ctx, 6, 28, 20, 2, 'rgba(0,0,0,0.1)');

    c.refresh();
  }

  // deco-bp-heart — 8×8, tiny pixel heart
  {
    const c = scene.textures.createCanvas('deco-bp-heart', 8, 8);
    if (!c) return;
    const ctx = c.context;
    const red = '#FF4466';

    // Classic heart shape: two bumps at top, point at bottom
    // Row 1 (y=1): two circles
    px(ctx, 1, 1, red); px(ctx, 2, 1, red);
    px(ctx, 5, 1, red); px(ctx, 6, 1, red);
    // Row 2 (y=2): wider
    px(ctx, 0, 2, red); px(ctx, 1, 2, red); px(ctx, 2, 2, red); px(ctx, 3, 2, red);
    px(ctx, 4, 2, red); px(ctx, 5, 2, red); px(ctx, 6, 2, red); px(ctx, 7, 2, red);
    // Row 3 (y=3): full width
    for (let x = 0; x < 8; x++) px(ctx, x, 3, red);
    // Row 4 (y=4): narrowing
    for (let x = 1; x < 7; x++) px(ctx, x, 4, red);
    // Row 5 (y=5):
    for (let x = 2; x < 6; x++) px(ctx, x, 5, red);
    // Row 6 (y=6):
    px(ctx, 3, 6, red); px(ctx, 4, 6, red);
    // Row 7 (y=7): point
    px(ctx, 3, 7, red);

    c.refresh();
  }

  // ── DEPTH-LAYERED CITY TEXTURES (urban canyon effect) ─────────────────

  // Foreground building strip — apartment building top, viewed from above
  {
    const c = scene.textures.createCanvas('bp-fg-building-top-1', 96, 64);
    if (!c) return;
    const ctx = c.context;
    const roofBeige = '#C8B8A0';
    const corniceColor = '#A09080';
    const chimneyGray = '#5A5A5A';
    const antennaGray = '#4A4A4A';
    const wallShadow = '#7A7A7A';
    const wallMid = '#9A9A9A';
    const wallLight = '#BABABA';
    const windowBlue = '#AABBCC';

    // Rooftop surface
    rect(ctx, 0, 0, 96, 40, roofBeige);
    // Rooftop texture — scattered patches for tar/tiles
    const rng = seededRandom(5001);
    for (let i = 0; i < 30; i++) {
      const tx = Math.floor(rng() * 90);
      const ty = Math.floor(rng() * 36);
      const shade = rng() > 0.5 ? darken(roofBeige, 0.08) : lighten(roofBeige, 0.08);
      rect(ctx, tx, ty, 3, 3, shade);
    }
    // Chimney stacks
    rect(ctx, 14, 8, 6, 6, chimneyGray);
    rect(ctx, 52, 12, 6, 6, chimneyGray);
    rect(ctx, 78, 6, 6, 6, chimneyGray);
    // TV antennas extending from chimneys
    rect(ctx, 16, 0, 2, 10, antennaGray);
    rect(ctx, 54, 4, 2, 10, antennaGray);
    rect(ctx, 80, 0, 2, 8, antennaGray);
    // Antenna crossbars
    rect(ctx, 14, 2, 6, 1, antennaGray);
    rect(ctx, 52, 6, 6, 1, antennaGray);
    // Rooftop edge / cornice band
    rect(ctx, 0, 40, 96, 4, corniceColor);
    // Bracket details on cornice
    for (let bx = 4; bx < 92; bx += 8) {
      rect(ctx, bx, 40, 2, 4, darken(corniceColor, 0.15));
    }
    // Overhanging facade — progressively thinner strips
    rect(ctx, 0, 44, 96, 8, wallShadow);
    rect(ctx, 8, 52, 80, 8, wallMid);
    rect(ctx, 16, 60, 64, 4, wallLight);
    // Balcony railing at y=44
    rect(ctx, 4, 44, 88, 1, antennaGray);
    for (let bx = 8; bx < 90; bx += 6) {
      rect(ctx, bx, 44, 1, 4, antennaGray);
    }
    // Window tops visible from above
    rect(ctx, 16, 46, 6, 4, windowBlue);
    rect(ctx, 44, 46, 6, 4, windowBlue);
    rect(ctx, 72, 46, 6, 4, windowBlue);

    c.refresh();
  }

  // Foreground building strip — ornate Pest-side building
  {
    const c = scene.textures.createCanvas('bp-fg-building-top-2', 96, 64);
    if (!c) return;
    const ctx = c.context;
    const creamFacade = '#D8D0C0';
    const corniceColor = '#B0A090';
    const wallShadow = '#7A7A7A';
    const wallMid = '#9A9A9A';
    const wallLight = '#BABABA';

    // Roof surface
    rect(ctx, 0, 0, 96, 40, creamFacade);
    // Roof texture patches
    const rng = seededRandom(5002);
    for (let i = 0; i < 25; i++) {
      const tx = Math.floor(rng() * 90);
      const ty = Math.floor(rng() * 36);
      rect(ctx, tx, ty, 3, 2, darken(creamFacade, 0.06));
    }
    // Dormer windows — small triangular shapes
    for (let dx = 16; dx < 80; dx += 28) {
      // Triangle roof of dormer
      for (let row = 0; row < 5; row++) {
        rect(ctx, dx + row, 14 - row, 8 - row * 2, 1, '#6A5A4A');
      }
      // Dormer window pane
      rect(ctx, dx + 2, 15, 4, 5, '#88AACC');
    }
    // Decorative balustrade at rooftop edge
    rect(ctx, 0, 38, 96, 2, corniceColor);
    // Dentil pattern on cornice
    for (let bx = 2; bx < 94; bx += 4) {
      rect(ctx, bx, 36, 2, 2, darken(corniceColor, 0.2));
    }
    rect(ctx, 0, 40, 96, 4, corniceColor);
    // Small balustrade posts
    for (let bx = 4; bx < 92; bx += 6) {
      rect(ctx, bx, 34, 2, 4, darken(corniceColor, 0.12));
    }
    // Overhanging facade
    rect(ctx, 0, 44, 96, 8, wallShadow);
    rect(ctx, 8, 52, 80, 8, wallMid);
    rect(ctx, 16, 60, 64, 4, wallLight);
    // Flower boxes on balcony
    rect(ctx, 20, 45, 12, 3, '#5A4A3A');
    rect(ctx, 60, 45, 12, 3, '#5A4A3A');
    // Flower dots
    px(ctx, 22, 45, '#CC4444'); px(ctx, 24, 45, '#FF88AA'); px(ctx, 26, 45, '#CC4444');
    px(ctx, 28, 45, '#FF88AA'); px(ctx, 30, 45, '#CC4444');
    px(ctx, 62, 45, '#FF88AA'); px(ctx, 64, 45, '#CC4444'); px(ctx, 66, 45, '#FF88AA');
    px(ctx, 68, 45, '#CC4444'); px(ctx, 70, 45, '#FF88AA');

    c.refresh();
  }

  // Foreground building strip — Art nouveau style
  {
    const c = scene.textures.createCanvas('bp-fg-building-top-3', 96, 64);
    if (!c) return;
    const ctx = c.context;
    const roofPink = '#D8A8A0';
    const patina = '#6AAA6A';
    const ironGray = '#4A4A4A';
    const wallShadow = '#7A7A7A';
    const wallMid = '#9A9A9A';
    const wallLight = '#BABABA';
    const windowBlue = '#AABBCC';

    // Pastel pink/coral roof
    rect(ctx, 0, 0, 96, 40, roofPink);
    // Roof texture
    const rng = seededRandom(5003);
    for (let i = 0; i < 20; i++) {
      const tx = Math.floor(rng() * 88);
      const ty = Math.floor(rng() * 34);
      rect(ctx, tx, ty, 4, 3, darken(roofPink, 0.05));
    }
    // Green patina copper fixtures on roof
    circle(ctx, 20, 10, 4, patina);
    circle(ctx, 75, 14, 3, patina);
    rect(ctx, 45, 6, 8, 4, patina);
    // Curved/organic cornice — circles for rounded elements
    for (let cx = 6; cx < 92; cx += 10) {
      circle(ctx, cx, 40, 3, darken(roofPink, 0.2));
    }
    rect(ctx, 0, 38, 96, 2, darken(roofPink, 0.15));
    // Iron railing patterns (cross-hatch)
    for (let bx = 4; bx < 92; bx += 5) {
      rect(ctx, bx, 42, 1, 4, ironGray);
    }
    rect(ctx, 2, 42, 92, 1, ironGray);
    rect(ctx, 2, 45, 92, 1, ironGray);
    // Overhanging facade
    rect(ctx, 0, 44, 96, 8, wallShadow);
    rect(ctx, 8, 52, 80, 8, wallMid);
    rect(ctx, 16, 60, 64, 4, wallLight);
    // Arched window tops — more windows visible
    for (let wx = 10; wx < 86; wx += 16) {
      rect(ctx, wx, 46, 6, 4, windowBlue);
      // Arch top
      circle(ctx, wx + 3, 46, 3, windowBlue);
    }

    c.refresh();
  }

  // Foreground building strip — modern/commercial building
  {
    const c = scene.textures.createCanvas('bp-fg-building-top-4', 96, 64);
    if (!c) return;
    const ctx = c.context;
    const roofGray = '#888888';
    const acGray = '#777777';
    const wallShadow = '#6A6A6A';
    const wallMid = '#8A8A8A';
    const wallLight = '#AAAAAA';
    const glassBlue = '#88AACC';

    // Flat gray roof
    rect(ctx, 0, 0, 96, 44, roofGray);
    // Roof surface variation
    const rng = seededRandom(5004);
    for (let i = 0; i < 15; i++) {
      const tx = Math.floor(rng() * 88);
      const ty = Math.floor(rng() * 38);
      rect(ctx, tx, ty, 4, 4, darken(roofGray, 0.06));
    }
    // AC units on rooftop
    rect(ctx, 10, 8, 14, 10, acGray);
    rect(ctx, 11, 9, 12, 8, darken(acGray, 0.1));
    circle(ctx, 17, 13, 3, '#666666');  // fan
    rect(ctx, 60, 14, 14, 10, acGray);
    rect(ctx, 61, 15, 12, 8, darken(acGray, 0.1));
    circle(ctx, 67, 19, 3, '#666666');  // fan
    rect(ctx, 36, 4, 10, 8, acGray);
    circle(ctx, 41, 8, 3, '#666666');   // fan
    // Clean modern roof edge — no ornate details
    rect(ctx, 0, 42, 96, 2, darken(roofGray, 0.2));
    // Overhanging facade — slightly taller
    rect(ctx, 0, 44, 96, 8, wallShadow);
    rect(ctx, 6, 52, 84, 8, wallMid);
    rect(ctx, 14, 60, 68, 4, wallLight);
    // Glass-like window reflections — larger than residential
    rect(ctx, 12, 46, 10, 6, glassBlue);
    rect(ctx, 32, 46, 10, 6, glassBlue);
    rect(ctx, 52, 46, 10, 6, glassBlue);
    rect(ctx, 72, 46, 10, 6, glassBlue);

    c.refresh();
  }

  // Foreground vertical strip — rotated for vertical streets (left/right sides)
  {
    const c = scene.textures.createCanvas('bp-fg-building-side-1', 64, 96);
    if (!c) return;
    const ctx = c.context;
    const roofBeige = '#C8B8A0';
    const corniceColor = '#A09080';
    const chimneyGray = '#5A5A5A';
    const antennaGray = '#4A4A4A';
    const wallShadow = '#7A7A7A';
    const wallMid = '#9A9A9A';
    const wallLight = '#BABABA';
    const windowBlue = '#AABBCC';

    // Rooftop surface (left portion)
    rect(ctx, 0, 0, 40, 96, roofBeige);
    // Roof texture patches
    const rng = seededRandom(5005);
    for (let i = 0; i < 25; i++) {
      const tx = Math.floor(rng() * 36);
      const ty = Math.floor(rng() * 90);
      const shade = rng() > 0.5 ? darken(roofBeige, 0.08) : lighten(roofBeige, 0.08);
      rect(ctx, tx, ty, 3, 3, shade);
    }
    // Chimney stacks
    rect(ctx, 8, 14, 6, 6, chimneyGray);
    rect(ctx, 22, 50, 6, 6, chimneyGray);
    rect(ctx, 10, 78, 6, 6, chimneyGray);
    // Antennas
    rect(ctx, 10, 8, 2, 8, antennaGray);
    rect(ctx, 24, 44, 2, 8, antennaGray);
    // Cornice (vertical band at x=40)
    rect(ctx, 38, 0, 4, 96, corniceColor);
    for (let by = 4; by < 92; by += 8) {
      rect(ctx, 38, by, 4, 2, darken(corniceColor, 0.15));
    }
    // Overhanging facade — bands going right
    rect(ctx, 42, 0, 8, 96, wallShadow);
    rect(ctx, 50, 8, 8, 80, wallMid);
    rect(ctx, 58, 16, 6, 64, wallLight);
    // Balcony railing vertical
    rect(ctx, 42, 4, 1, 88, antennaGray);
    for (let by = 8; by < 90; by += 6) {
      rect(ctx, 42, by, 4, 1, antennaGray);
    }
    // Window tops
    rect(ctx, 44, 20, 4, 6, windowBlue);
    rect(ctx, 44, 46, 4, 6, windowBlue);
    rect(ctx, 44, 72, 4, 6, windowBlue);

    c.refresh();
  }

  // Foreground vertical strip — ornate variant for vertical streets
  {
    const c = scene.textures.createCanvas('bp-fg-building-side-2', 64, 96);
    if (!c) return;
    const ctx = c.context;
    const creamFacade = '#D8D0C0';
    const corniceColor = '#B0A090';
    const wallShadow = '#7A7A7A';
    const wallMid = '#9A9A9A';
    const wallLight = '#BABABA';

    // Roof surface (left portion)
    rect(ctx, 0, 0, 40, 96, creamFacade);
    // Roof texture
    const rng = seededRandom(5006);
    for (let i = 0; i < 20; i++) {
      const tx = Math.floor(rng() * 36);
      const ty = Math.floor(rng() * 90);
      rect(ctx, tx, ty, 3, 2, darken(creamFacade, 0.06));
    }
    // Dormer windows (rotated — vertical orientation)
    for (let dy = 16; dy < 80; dy += 28) {
      for (let col = 0; col < 5; col++) {
        rect(ctx, 18 - col, dy + col, 1, 8 - col * 2, '#6A5A4A');
      }
      rect(ctx, 19, dy + 2, 5, 4, '#88AACC');
    }
    // Balustrade / dentil cornice (vertical)
    rect(ctx, 36, 0, 2, 96, corniceColor);
    for (let by = 2; by < 94; by += 4) {
      rect(ctx, 34, by, 2, 2, darken(corniceColor, 0.2));
    }
    rect(ctx, 38, 0, 4, 96, corniceColor);
    for (let by = 4; by < 92; by += 6) {
      rect(ctx, 32, by, 2, 4, darken(corniceColor, 0.12));
    }
    // Overhanging facade
    rect(ctx, 42, 0, 8, 96, wallShadow);
    rect(ctx, 50, 8, 8, 80, wallMid);
    rect(ctx, 58, 16, 6, 64, wallLight);
    // Flower boxes
    rect(ctx, 43, 24, 3, 12, '#5A4A3A');
    rect(ctx, 43, 62, 3, 12, '#5A4A3A');
    px(ctx, 43, 26, '#CC4444'); px(ctx, 43, 28, '#FF88AA'); px(ctx, 43, 30, '#CC4444');
    px(ctx, 43, 64, '#FF88AA'); px(ctx, 43, 66, '#CC4444'); px(ctx, 43, 68, '#FF88AA');

    c.refresh();
  }

  // Background cityscape — wide distant city silhouette
  {
    const c = scene.textures.createCanvas('bp-bg-city-distant', 640, 128);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(7777);
    const skyDark = '#5A6A7A';
    const skyMid = '#6A7A8A';
    const hazeLight = '#8A9AAA';

    // Haze gradient background — lighter at bottom
    rect(ctx, 0, 0, 640, 40, skyDark);
    rect(ctx, 0, 40, 640, 40, skyMid);
    rect(ctx, 0, 80, 640, 48, hazeLight);

    // 18 building outlines at varying heights
    const buildings: { x: number; w: number; h: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const bx = Math.floor(rng() * 600);
      const bw = 16 + Math.floor(rng() * 24);
      const bh = 40 + Math.floor(rng() * 60);
      buildings.push({ x: bx, w: bw, h: bh });
      const shade = rng() > 0.5 ? skyDark : darken(skyMid, 0.1);
      rect(ctx, bx, 128 - bh, bw, bh, shade);
      // Subtle edge highlight
      rect(ctx, bx, 128 - bh, 1, bh, lighten(shade, 0.08));
    }
    // Church domes
    circle(ctx, 120, 52, 12, darken(skyMid, 0.15));
    circle(ctx, 120, 50, 10, skyMid);
    circle(ctx, 420, 58, 10, darken(skyMid, 0.15));
    circle(ctx, 420, 56, 8, skyMid);
    // Spires
    for (let sy = 0; sy < 18; sy++) {
      rect(ctx, 200 + sy, 30 + sy, 3 - Math.floor(sy / 8), 1, darken(skyDark, 0.1));
    }
    for (let sy = 0; sy < 14; sy++) {
      rect(ctx, 500 + sy, 40 + sy, 2 - Math.floor(sy / 8), 1, darken(skyDark, 0.1));
    }
    // Scattered lit windows — tiny yellow dots
    for (let i = 0; i < 20; i++) {
      const wx = Math.floor(rng() * 620);
      const wy = 60 + Math.floor(rng() * 60);
      px(ctx, wx, wy, '#CCAA44');
    }

    c.refresh();
  }

  // Background cityscape — mid-distance buildings, slightly more detailed
  {
    const c = scene.textures.createCanvas('bp-bg-city-mid', 480, 160);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(7778);
    const bgWarm = '#7A8A8A';
    const bgLight = '#8A9A9A';

    // Background fill
    rect(ctx, 0, 0, 480, 160, lighten(bgWarm, 0.1));

    // 12 buildings
    for (let i = 0; i < 12; i++) {
      const bx = Math.floor(rng() * 440);
      const bw = 24 + Math.floor(rng() * 30);
      const bh = 50 + Math.floor(rng() * 70);
      const shade = rng() > 0.5 ? bgWarm : bgLight;
      rect(ctx, bx, 160 - bh, bw, bh, shade);
      // Window grid (3x4 per building)
      for (let wy = 0; wy < 4; wy++) {
        for (let wx = 0; wx < 3; wx++) {
          const winX = bx + 4 + wx * Math.floor((bw - 8) / 3);
          const winY = (160 - bh) + 6 + wy * Math.floor((bh - 12) / 4);
          const lit = rng() > 0.5;
          rect(ctx, winX, winY, 4, 3, lit ? '#CCAA44' : darken(shade, 0.1));
        }
      }
      // Rooftop details: chimneys
      if (rng() > 0.4) {
        rect(ctx, bx + Math.floor(bw / 3), 160 - bh - 6, 4, 6, darken(shade, 0.2));
      }
      // Water tanks on some roofs
      if (rng() > 0.7) {
        rect(ctx, bx + Math.floor(bw * 0.6), 160 - bh - 5, 6, 5, darken(shade, 0.15));
        circle(ctx, bx + Math.floor(bw * 0.6) + 3, 160 - bh - 5, 3, darken(shade, 0.2));
      }
    }
    // Trees between buildings
    for (let i = 0; i < 6; i++) {
      const tx = 20 + Math.floor(rng() * 430);
      circle(ctx, tx, 148, 6, '#3A5A3A');
      circle(ctx, tx, 146, 5, '#4A6A4A');
    }

    c.refresh();
  }

  // Street-level — red/white striped cafe awning
  {
    const c = scene.textures.createCanvas('bp-street-awning-1', 48, 24);
    if (!c) return;
    const ctx = c.context;
    const red = '#CC3333';
    const white = '#EEEEEE';

    // Support pole on left edge
    rect(ctx, 0, 0, 2, 24, '#4A4A4A');
    // Triangular awning: wide at left, narrowing to right
    for (let x = 2; x < 48; x++) {
      const height = Math.floor(20 * (1 - (x - 2) / 46));
      if (height <= 0) break;
      const stripeColor = (Math.floor(x / 6) % 2 === 0) ? red : white;
      rect(ctx, x, 0, 1, height, stripeColor);
    }
    // Shadow underneath at bottom
    for (let x = 2; x < 46; x++) {
      const height = Math.floor(20 * (1 - (x - 2) / 46));
      if (height <= 1) break;
      rect(ctx, x, height - 1, 1, 1, darken(red, 0.3));
    }

    c.refresh();
  }

  // Street-level — green solid awning with scalloped edge
  {
    const c = scene.textures.createCanvas('bp-street-awning-2', 48, 24);
    if (!c) return;
    const ctx = c.context;
    const green = '#336644';

    // Support pole
    rect(ctx, 0, 0, 2, 24, '#4A4A4A');
    // Triangular solid green awning
    for (let x = 2; x < 48; x++) {
      const height = Math.floor(20 * (1 - (x - 2) / 46));
      if (height <= 0) break;
      rect(ctx, x, 0, 1, height, green);
    }
    // Scalloped bottom edge — semicircle cutouts
    for (let sx = 4; sx < 40; sx += 8) {
      const h = Math.floor(20 * (1 - (sx - 2) / 46));
      if (h > 2) {
        circle(ctx, sx + 4, h, 3, lighten(green, 0.15));
      }
    }
    // Gold text-like marks suggesting shop name
    rect(ctx, 8, 4, 16, 2, '#CCAA44');
    rect(ctx, 10, 7, 12, 1, '#CCAA44');

    c.refresh();
  }

  // Street-level — wrought iron shop sign (coffee)
  {
    const c = scene.textures.createCanvas('bp-hanging-sign-1', 24, 32);
    if (!c) return;
    const ctx = c.context;
    const iron = '#4A4A4A';
    const wood = '#6A4A2A';
    const cream = '#E8D8C0';

    // Iron bracket at top (L-shaped)
    rect(ctx, 0, 0, 4, 10, iron);
    rect(ctx, 0, 0, 12, 4, iron);
    // Chain links connecting bracket to sign
    rect(ctx, 10, 4, 2, 2, iron);
    rect(ctx, 10, 8, 2, 2, iron);
    // Hanging sign board
    rect(ctx, 2, 12, 20, 16, wood);
    rect(ctx, 3, 13, 18, 14, darken(wood, 0.05));
    // Coffee cup icon on sign
    circle(ctx, 12, 20, 4, cream);
    // Cup handle
    rect(ctx, 16, 18, 2, 1, cream);
    rect(ctx, 17, 18, 1, 3, cream);
    rect(ctx, 16, 20, 2, 1, cream);

    c.refresh();
  }

  // Street-level — bakery sign
  {
    const c = scene.textures.createCanvas('bp-hanging-sign-2', 24, 32);
    if (!c) return;
    const ctx = c.context;
    const iron = '#4A4A4A';
    const signCream = '#E8D8B0';
    const brown = '#8A6A3A';

    // Iron bracket at top (L-shaped)
    rect(ctx, 0, 0, 4, 10, iron);
    rect(ctx, 0, 0, 12, 4, iron);
    // Chain links
    rect(ctx, 10, 4, 2, 2, iron);
    rect(ctx, 10, 8, 2, 2, iron);
    // Sign board
    rect(ctx, 2, 12, 20, 16, signCream);
    rect(ctx, 3, 13, 18, 14, darken(signCream, 0.03));
    // Pretzel/bread icon — circular shape in brown
    circle(ctx, 12, 20, 4, brown);
    circle(ctx, 12, 20, 2, signCream);  // hole in pretzel
    // Small dots for texture
    px(ctx, 9, 18, darken(brown, 0.1));
    px(ctx, 15, 18, darken(brown, 0.1));

    c.refresh();
  }

  // Street-level — ornate iron balcony extending over street
  {
    const c = scene.textures.createCanvas('bp-balcony-overhang-1', 64, 20);
    if (!c) return;
    const ctx = c.context;
    const iron = '#4A4A4A';
    const stone = '#9A9A9A';

    // Floor of balcony (stone rectangle behind railing)
    rect(ctx, 4, 4, 56, 10, stone);
    // Iron railing — horizontal bars
    rect(ctx, 2, 2, 60, 1, iron);
    rect(ctx, 2, 14, 60, 1, iron);
    // Vertical balusters
    for (let bx = 4; bx < 62; bx += 4) {
      rect(ctx, bx, 2, 1, 12, iron);
    }
    // Decorative scrollwork at corners
    px(ctx, 3, 3, iron); px(ctx, 4, 4, iron);
    px(ctx, 59, 3, iron); px(ctx, 58, 4, iron);
    px(ctx, 3, 13, iron); px(ctx, 4, 12, iron);
    px(ctx, 59, 13, iron); px(ctx, 58, 12, iron);
    // Flower box at center
    rect(ctx, 24, 6, 16, 4, '#5A4A3A');
    // Flower dots
    px(ctx, 26, 6, '#CC4444'); px(ctx, 29, 6, '#FF88AA'); px(ctx, 32, 6, '#CC4444');
    px(ctx, 35, 6, '#FF88AA'); px(ctx, 38, 6, '#CC4444');
    // Cast shadow below
    rect(ctx, 2, 16, 60, 2, darken(iron, 0.3));

    c.refresh();
  }

  // Street-level — simpler modern balcony
  {
    const c = scene.textures.createCanvas('bp-balcony-overhang-2', 64, 20);
    if (!c) return;
    const ctx = c.context;
    const glass = '#88AACC';
    const metal = '#4A4A4A';

    // Metal frame
    rect(ctx, 2, 2, 60, 14, metal);
    // Glass panels — 4 panels separated by thin metal bars
    rect(ctx, 4, 4, 12, 10, glass);
    rect(ctx, 18, 4, 12, 10, glass);
    rect(ctx, 32, 4, 12, 10, glass);
    rect(ctx, 46, 4, 12, 10, glass);
    // Metal dividers between panels
    rect(ctx, 16, 2, 2, 14, metal);
    rect(ctx, 30, 2, 2, 14, metal);
    rect(ctx, 44, 2, 2, 14, metal);
    // Smaller shadow
    rect(ctx, 4, 17, 56, 1, darken(metal, 0.2));

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

  // bp-cutscene-bus-couple — 64×48, two figures sitting side by side
  {
    const c = scene.textures.createCanvas('bp-cutscene-bus-couple', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#E8C8A0';

    // Seat/bench below them
    rect(ctx, 12, 34, 40, 10, '#3A3A4A');
    rect(ctx, 12, 34, 40, 2, '#4A4A5A');

    // Left figure — blue top
    rect(ctx, 18, 14, 10, 12, skin); // head
    rect(ctx, 17, 10, 8, 5, '#5A3A20'); // hair
    rect(ctx, 16, 24, 12, 12, '#4488FF'); // body
    rect(ctx, 14, 28, 4, 8, '#4488FF'); // left arm
    px(ctx, 21, 17, '#334'); // eye
    px(ctx, 24, 17, '#334');
    rect(ctx, 20, 21, 4, 1, '#C88'); // mouth

    // Right figure — pink top, leaning slightly left
    rect(ctx, 34, 13, 10, 12, skin); // head
    rect(ctx, 33, 9, 8, 5, '#8A5A2A'); // hair
    rect(ctx, 33, 23, 12, 12, '#FF6688'); // body
    rect(ctx, 45, 27, 4, 8, '#FF6688'); // right arm
    px(ctx, 37, 16, '#334'); // eye
    px(ctx, 40, 16, '#334');
    rect(ctx, 36, 20, 4, 1, '#C88'); // mouth

    // Hands together in middle
    rect(ctx, 28, 30, 5, 3, skin);

    c.refresh();
  }

  // bp-bus-building-pastel-1 through bp-bus-building-pastel-4
  {
    const pastelColors = [
      { key: 'bp-bus-building-pastel-1', color: '#E8B0B0' },
      { key: 'bp-bus-building-pastel-2', color: '#E8D888' },
      { key: 'bp-bus-building-pastel-3', color: '#D4B888' },
      { key: 'bp-bus-building-pastel-4', color: '#A8D8A8' },
    ];
    for (const { key, color } of pastelColors) {
      const c = scene.textures.createCanvas(key, 64, 96);
      if (!c) continue;
      const ctx = c.context;
      const dark = darken(color, 0.12);
      const rng = seededRandom(key.charCodeAt(key.length - 1) * 100);

      // Main facade
      rect(ctx, 2, 4, 60, 88, color);
      // Roof
      rect(ctx, 0, 0, 64, 6, dark);

      // Windows in grid (3 cols × 5 rows) with ornate frames
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          const wx = 8 + col * 18;
          const wy = 10 + row * 16;
          // 1px border (darker shade) frame
          rect(ctx, wx - 1, wy - 1, 12, 12, dark);
          rect(ctx, wx, wy, 10, 10, '#7A8A9A');
          // Some lit
          if (rng() > 0.5) {
            rect(ctx, wx + 1, wy + 1, 8, 8, '#FFEE88');
          }
        }
      }

      // Small balcony lines below some windows
      for (let row = 1; row < 5; row += 2) {
        for (let col = 0; col < 3; col++) {
          const bx = 8 + col * 18;
          const by = 10 + row * 16 + 10;
          rect(ctx, bx - 1, by, 12, 1, '#5A5A5A');
        }
      }

      // Flower boxes: tiny colored dots below bottom windows
      for (let col = 0; col < 3; col++) {
        const fx = 8 + col * 18;
        const fy = 10 + 4 * 16 + 10;
        rect(ctx, fx, fy + 1, 8, 2, '#5A4A3A');
        px(ctx, fx + 1, fy, '#FF4444');
        px(ctx, fx + 3, fy, '#DD77AA');
        px(ctx, fx + 5, fy, '#FFDD44');
        px(ctx, fx + 7, fy, '#FF4444');
      }

      // Entrance
      rect(ctx, 24, 80, 16, 16, '#4A3A2A');

      c.refresh();
    }
  }

  // bp-bus-countryside — 128×96, rolling green hills with houses
  {
    const c = scene.textures.createCanvas('bp-bus-countryside', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(8400);

    // Sky
    rect(ctx, 0, 0, 128, 40, '#88BBDD');

    // Background green hills
    rect(ctx, 0, 36, 128, 60, '#6A9A4E');
    // Rolling hill shapes using different greens
    for (let x = 0; x < 128; x++) {
      const h1 = Math.floor(10 * Math.sin(x * 0.04) + 8);
      rect(ctx, x, 30 + h1, 1, 8, '#5A8A3E');
    }
    for (let x = 0; x < 128; x++) {
      const h2 = Math.floor(6 * Math.sin(x * 0.06 + 2) + 4);
      rect(ctx, x, 44 + h2, 1, 6, '#7AAA5E');
    }

    // Scattered houses (small colored rectangles with triangle roofs)
    // House 1
    rect(ctx, 20, 50, 12, 10, '#D4B888');
    rect(ctx, 22, 46, 8, 5, '#8A5A3A'); // roof
    rect(ctx, 24, 54, 4, 6, '#5A4A3A'); // door
    // House 2
    rect(ctx, 60, 44, 10, 8, '#E8B0B0');
    rect(ctx, 62, 40, 6, 5, '#8A5A3A');
    // House 3
    rect(ctx, 100, 52, 10, 8, '#A8D8A8');
    rect(ctx, 102, 48, 6, 5, '#8A5A3A');

    // Small church steeple (tall thin rect with cross at top)
    rect(ctx, 82, 30, 6, 24, '#C8B898');
    rect(ctx, 84, 20, 2, 12, '#8A7A6A');
    // Cross
    px(ctx, 85, 18, '#5A5A5A');
    px(ctx, 84, 19, '#5A5A5A');
    px(ctx, 85, 19, '#5A5A5A');
    px(ctx, 86, 19, '#5A5A5A');
    px(ctx, 85, 20, '#5A5A5A');

    // Ground detail
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 128);
      const y = 60 + Math.floor(rng() * 30);
      px(ctx, x, y, rng() > 0.5 ? darken('#6A9A4E', 0.08) : lighten('#6A9A4E', 0.08));
    }

    c.refresh();
  }

  // bp-bus-danube-flash — 128×64, blue water with dark building edges
  {
    const c = scene.textures.createCanvas('bp-bus-danube-flash', 128, 64);
    if (!c) return;
    const ctx = c.context;

    // Dark sky
    rect(ctx, 0, 0, 128, 20, '#1A1A2A');
    // Blue water strip in center
    rect(ctx, 0, 20, 128, 24, '#2255AA');
    // Darker water below
    rect(ctx, 0, 44, 128, 20, '#1A3A6A');

    // Dark building edges on left and right
    rect(ctx, 0, 0, 20, 44, '#2A2A3A');
    rect(ctx, 108, 0, 20, 44, '#2A2A3A');
    // Building windows
    for (let y = 4; y < 40; y += 6) {
      px(ctx, 6, y, '#FFEE88');
      px(ctx, 7, y, '#FFEE88');
      px(ctx, 14, y, '#FFEE88');
      px(ctx, 15, y, '#FFEE88');
      px(ctx, 112, y, '#FFEE88');
      px(ctx, 113, y, '#FFEE88');
      px(ctx, 120, y, '#FFEE88');
      px(ctx, 121, y, '#FFEE88');
    }

    // Light reflections on water (white dots)
    const rng = seededRandom(8500);
    for (let i = 0; i < 20; i++) {
      const x = 20 + Math.floor(rng() * 88);
      const y = 22 + Math.floor(rng() * 18);
      px(ctx, x, y, '#FFFFFF');
      if (rng() > 0.5) px(ctx, x + 1, y, '#CCDDFF');
    }

    c.refresh();
  }

  // bp-cutscene-couple-walking — 48×48, two figures side by side hand-in-hand
  {
    const c = scene.textures.createCanvas('bp-cutscene-couple-walking', 48, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#E8C8A0';

    // Shadow
    rect(ctx, 8, 42, 32, 4, 'rgba(0,0,0,0.12)');

    // Left figure — blue outfit
    // Head
    rect(ctx, 11, 8, 8, 8, skin);
    rect(ctx, 10, 6, 6, 4, '#5A3A20'); // hair
    px(ctx, 14, 11, '#334'); // eye
    px(ctx, 16, 11, '#334');
    // Body
    rect(ctx, 10, 16, 10, 12, '#4488FF');
    // Arms
    rect(ctx, 7, 18, 3, 8, '#4488FF');
    // Legs
    rect(ctx, 10, 28, 4, 10, '#3A3A5A');
    rect(ctx, 16, 28, 4, 10, '#3A3A5A');
    // Shoes
    rect(ctx, 10, 38, 4, 2, '#3A2A1A');
    rect(ctx, 16, 38, 4, 2, '#3A2A1A');
    // Hand
    rect(ctx, 7, 26, 3, 2, skin);

    // Right figure — pink outfit
    // Head
    rect(ctx, 29, 8, 8, 8, skin);
    rect(ctx, 28, 6, 6, 4, '#8A5A2A'); // hair
    px(ctx, 32, 11, '#334'); // eye
    px(ctx, 34, 11, '#334');
    // Body
    rect(ctx, 28, 16, 10, 12, '#FF6688');
    // Arms
    rect(ctx, 38, 18, 3, 8, '#FF6688');
    // Legs
    rect(ctx, 28, 28, 4, 10, '#4A4A5A');
    rect(ctx, 34, 28, 4, 10, '#4A4A5A');
    // Shoes
    rect(ctx, 28, 38, 4, 2, '#3A2A1A');
    rect(ctx, 34, 38, 4, 2, '#3A2A1A');
    // Hand
    rect(ctx, 38, 26, 3, 2, skin);

    // Connecting "hand" pixel in skin color between them
    rect(ctx, 20, 26, 8, 2, skin);

    c.refresh();
  }

  // bp-eye-cabin-couple — 16×16, cabin with two tiny colored dots in window
  {
    const c = scene.textures.createCanvas('bp-eye-cabin-couple', 16, 16);
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
    // Two tiny colored dots (couple) in window
    px(ctx, 6, 8, '#4488FF'); // blue (left figure)
    px(ctx, 10, 8, '#FF6688'); // pink (right figure)
    // Floor
    rect(ctx, 2, 13, 12, 1, darken('#4A8ACA', 0.15));
    // Bottom trim
    rect(ctx, 3, 14, 10, 1, '#5A5A6A');

    c.refresh();
  }

  // bp-eye-sun-disc — 32×32, warm orange-gold circle with glow
  {
    const c = scene.textures.createCanvas('bp-eye-sun-disc', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Outer glow (lowest density)
    circle(ctx, 16, 16, 16, 'rgba(255,102,68,0.1)');
    // Mid glow
    circle(ctx, 16, 16, 14, 'rgba(255,136,68,0.15)');
    // Inner glow
    circle(ctx, 16, 16, 12, 'rgba(255,170,68,0.2)');
    // Center solid circle
    circle(ctx, 16, 16, 10, '#FFAA44');
    // Bright core
    circle(ctx, 16, 16, 6, '#FFCC66');

    c.refresh();
  }

  // bp-cutscene-couple-close — 64×48, upper body view of couple
  {
    const c = scene.textures.createCanvas('bp-cutscene-couple-close', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#E8C8A0';

    // Left figure — blue top, dark hair
    // Body/shoulders
    rect(ctx, 8, 24, 20, 20, '#4488FF');
    // Neck
    rect(ctx, 15, 20, 6, 6, skin);
    // Head
    rect(ctx, 12, 6, 12, 14, skin);
    // Hair (dark)
    rect(ctx, 11, 3, 14, 6, '#3A2A18');
    rect(ctx, 11, 6, 2, 6, '#3A2A18');
    rect(ctx, 23, 6, 2, 6, '#3A2A18');
    // Eyes
    rect(ctx, 15, 12, 2, 2, '#fff');
    rect(ctx, 20, 12, 2, 2, '#fff');
    px(ctx, 15, 12, '#334');
    px(ctx, 20, 12, '#334');
    // Mouth
    rect(ctx, 16, 17, 4, 1, '#C88');
    // Left arm
    rect(ctx, 4, 28, 6, 14, '#4488FF');

    // Right figure — pink top, lighter brown hair
    // Body/shoulders (touching left figure)
    rect(ctx, 32, 24, 20, 20, '#FF6688');
    // Neck
    rect(ctx, 39, 20, 6, 6, skin);
    // Head
    rect(ctx, 36, 6, 12, 14, skin);
    // Hair (lighter brown)
    rect(ctx, 35, 3, 14, 6, '#8A5A2A');
    rect(ctx, 35, 6, 2, 6, '#8A5A2A');
    rect(ctx, 47, 6, 2, 6, '#8A5A2A');
    // Longer hair strands
    rect(ctx, 34, 8, 2, 10, '#8A5A2A');
    rect(ctx, 48, 8, 2, 10, '#8A5A2A');
    // Eyes
    rect(ctx, 39, 12, 2, 2, '#fff');
    rect(ctx, 44, 12, 2, 2, '#fff');
    px(ctx, 39, 12, '#334');
    px(ctx, 44, 12, '#334');
    // Mouth
    rect(ctx, 40, 17, 4, 1, '#C88');
    // Right arm
    rect(ctx, 52, 28, 6, 14, '#FF6688');

    c.refresh();
  }

  // bp-cruise-boat — 200×60, elongated white cruise boat
  {
    const c = scene.textures.createCanvas('bp-cruise-boat', 200, 60);
    if (!c) return;
    const ctx = c.context;

    // White hull
    rect(ctx, 8, 24, 184, 24, '#F0F0F0');
    // Bow taper
    rect(ctx, 2, 28, 8, 16, '#F0F0F0');
    rect(ctx, 0, 30, 4, 12, '#E8E8E8');
    // Stern
    rect(ctx, 190, 28, 8, 16, '#E8E8E8');

    // Upper deck
    rect(ctx, 20, 14, 160, 12, '#F0F0F0');
    rect(ctx, 18, 12, 164, 3, '#E0E0E0');

    // Railing on upper deck (thin line with vertical bumps)
    rect(ctx, 20, 12, 160, 1, '#8A8A8A');
    for (let x = 22; x < 178; x += 4) {
      rect(ctx, x, 10, 1, 3, '#8A8A8A');
    }

    // Row of blue windows along middle
    for (let i = 0; i < 16; i++) {
      rect(ctx, 16 + i * 11, 28, 7, 5, '#6AAACE');
    }

    // Red chimney near back
    rect(ctx, 168, 6, 6, 8, '#CC3333');
    rect(ctx, 166, 6, 10, 2, darken('#CC3333', 0.1));

    // Hungarian flag at stern
    rect(ctx, 192, 18, 6, 2, '#CE2939');
    rect(ctx, 192, 20, 6, 2, '#FFFFFF');
    rect(ctx, 192, 22, 6, 2, '#477050');
    rect(ctx, 191, 16, 1, 8, '#5A5A5A'); // flagpole

    // Wake/foam line at water level (white dots at bottom edge)
    const rng = seededRandom(8600);
    for (let x = 4; x < 194; x++) {
      if (rng() < 0.4) px(ctx, x, 48, '#FFFFFF');
      if (rng() < 0.3) px(ctx, x, 49, '#EEEEFF');
    }

    // Waterline
    rect(ctx, 4, 47, 190, 1, '#4A7AAA');

    c.refresh();
  }

  // bp-cruise-parliament-lit — 256×120, night parliament with lit windows
  {
    const c = scene.textures.createCanvas('bp-cruise-parliament-lit', 256, 120);
    if (!c) return;
    const ctx = c.context;
    const base = '#D4C8B0';
    const dark = darken(base, 0.15);
    const roof = darken(base, 0.25);

    // Main body
    rect(ctx, 10, 40, 236, 70, base);
    // Foundation
    rect(ctx, 8, 105, 240, 15, dark);

    // Central dome
    circle(ctx, 128, 28, 20, roof);
    rect(ctx, 114, 28, 28, 22, base);
    circle(ctx, 128, 26, 16, lighten(roof, 0.1));
    rect(ctx, 127, 4, 2, 10, dark);

    // Side spires
    const spirePositions = [30, 60, 90, 166, 196, 226];
    for (const sx of spirePositions) {
      rect(ctx, sx - 2, 26, 4, 16, base);
      rect(ctx, sx - 1, 16, 2, 12, dark);
      px(ctx, sx, 14, dark);
    }

    // Windows — ALL LIT (yellow)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 20; col++) {
        const wx = 16 + col * 12;
        const wy = 48 + row * 14;
        rect(ctx, wx, wy, 4, 7, '#FFEE88');
        // Window frame
        rect(ctx, wx - 1, wy - 1, 6, 1, dark);
        rect(ctx, wx - 1, wy + 7, 6, 1, dark);
      }
    }

    // Decorative bands
    rect(ctx, 10, 40, 236, 2, dark);
    rect(ctx, 10, 65, 236, 1, dark);
    rect(ctx, 10, 85, 236, 1, dark);

    // Central entrance arch
    rect(ctx, 120, 82, 16, 28, '#4A3A2A');
    circle(ctx, 128, 82, 8, dark);

    // Roofline battlements
    for (let x = 10; x < 246; x += 6) {
      rect(ctx, x, 38, 4, 3, roof);
    }

    // Warm glow at bottom
    rect(ctx, 8, 108, 240, 12, 'rgba(255,170,68,0.15)');

    c.refresh();
  }

  // bp-cruise-castle-lit — 200×80, castle on hill with lit windows
  {
    const c = scene.textures.createCanvas('bp-cruise-castle-lit', 200, 80);
    if (!c) return;
    const ctx = c.context;
    const wall = '#9A8A70';
    const dark = darken(wall, 0.15);

    // Green hill beneath
    for (let x = 0; x < 200; x++) {
      const hillH = Math.floor(16 + 8 * Math.sin(x * 0.02));
      rect(ctx, x, 80 - hillH, 1, hillH, '#4A6A3A');
    }

    // Castle body
    rect(ctx, 30, 20, 140, 40, wall);
    // Roof
    rect(ctx, 28, 16, 144, 5, '#5A6A5A');

    // Central dome
    circle(ctx, 100, 14, 10, '#6A8A6A');
    rect(ctx, 94, 14, 12, 8, wall);
    rect(ctx, 99, 4, 2, 6, dark);

    // Lit windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 12; col++) {
        const wx = 36 + col * 11;
        const wy = 26 + row * 14;
        rect(ctx, wx, wy, 4, 6, '#FFEE88');
      }
    }

    // Corner towers
    for (const tx of [30, 170]) {
      rect(ctx, tx - 3, 12, 6, 48, dark);
      rect(ctx, tx - 2, 8, 4, 6, '#5A6A5A');
    }

    // Floodlight glow at building base
    rect(ctx, 28, 54, 144, 10, 'rgba(255,238,200,0.12)');

    c.refresh();
  }

  // bp-cruise-bridge-overhead — 400×40, Chain Bridge from below
  {
    const c = scene.textures.createCanvas('bp-cruise-bridge-overhead', 400, 40);
    if (!c) return;
    const ctx = c.context;
    const metal = '#5A5A6A';
    const dark = darken(metal, 0.15);

    // Support columns on left and right
    rect(ctx, 10, 0, 16, 40, metal);
    rect(ctx, 374, 0, 16, 40, metal);
    // Column detail
    rect(ctx, 10, 0, 16, 2, dark);
    rect(ctx, 374, 0, 16, 2, dark);

    // Wide catenary curves (arching lines from left to right)
    for (let x = 26; x < 374; x++) {
      const mid = 200;
      const catenary = Math.floor(16 * Math.pow((x - mid) / 174, 2));
      px(ctx, x, 4 + catenary, metal);
      px(ctx, x, 5 + catenary, metal);
      // Second cable
      px(ctx, x, 8 + catenary, metal);
    }

    // Chain detail — small zigzag/diamond pattern along curves
    for (let x = 40; x < 360; x += 6) {
      const mid = 200;
      const catenary = Math.floor(16 * Math.pow((x - mid) / 174, 2));
      const y = 6 + catenary;
      px(ctx, x, y - 1, dark);
      px(ctx, x + 1, y, dark);
      px(ctx, x + 2, y - 1, dark);
      px(ctx, x + 3, y, dark);
    }

    // Roadway deck at bottom
    rect(ctx, 20, 32, 360, 4, darken(metal, 0.1));
    // Vertical hangers from cable to deck
    for (let x = 40; x < 370; x += 12) {
      const mid = 200;
      const catenary = Math.floor(16 * Math.pow((x - mid) / 174, 2));
      rect(ctx, x, 5 + catenary, 1, 27 - catenary, dark);
    }

    // Railing
    rect(ctx, 20, 30, 360, 1, metal);
    rect(ctx, 20, 36, 360, 1, metal);

    c.refresh();
  }

  // bp-bath-columns — 32×96, ornate column with capital and base
  {
    const c = scene.textures.createCanvas('bp-bath-columns', 32, 96);
    if (!c) return;
    const ctx = c.context;
    const stone = '#D4C8A0';
    const dark = darken(stone, 0.12);

    // Capital at top — wider section with decorative detail
    rect(ctx, 4, 2, 24, 8, dark);
    rect(ctx, 6, 0, 20, 4, stone);
    // Capital decorative detail (small rectangles)
    rect(ctx, 8, 4, 4, 2, lighten(stone, 0.1));
    rect(ctx, 14, 4, 4, 2, lighten(stone, 0.1));
    rect(ctx, 20, 4, 4, 2, lighten(stone, 0.1));

    // Column shaft
    rect(ctx, 8, 10, 16, 74, stone);

    // Fluting — vertical darker lines along shaft
    rect(ctx, 10, 12, 1, 70, darken(stone, 0.06));
    rect(ctx, 13, 12, 1, 70, darken(stone, 0.06));
    rect(ctx, 16, 12, 1, 70, darken(stone, 0.06));
    rect(ctx, 19, 12, 1, 70, darken(stone, 0.06));
    rect(ctx, 22, 12, 1, 70, darken(stone, 0.06));

    // Base at bottom — wider section
    rect(ctx, 4, 84, 24, 8, dark);
    rect(ctx, 6, 82, 20, 4, stone);
    rect(ctx, 2, 90, 28, 6, darken(dark, 0.08));

    c.refresh();
  }

  // bp-cutscene-couple-pool — 64×32, couple at pool edge
  {
    const c = scene.textures.createCanvas('bp-cutscene-couple-pool', 64, 32);
    if (!c) return;
    const ctx = c.context;
    const skin = '#E8C8A0';

    // Water at bottom
    rect(ctx, 0, 20, 64, 12, '#2A8A9A');
    // Water highlights
    const rng = seededRandom(8700);
    for (let i = 0; i < 15; i++) {
      px(ctx, Math.floor(rng() * 64), 22 + Math.floor(rng() * 8), lighten('#2A8A9A', 0.2));
    }

    // Pool edge
    rect(ctx, 0, 18, 64, 3, '#AAAAAA');

    // Left figure — sitting, shoulders visible
    rect(ctx, 18, 6, 8, 8, skin); // head
    rect(ctx, 17, 4, 6, 4, '#5A3A20'); // hair
    rect(ctx, 16, 12, 10, 8, '#4488FF'); // body
    px(ctx, 21, 9, '#334'); // eye

    // Right figure — sitting, head leaning toward left
    rect(ctx, 36, 5, 8, 8, skin); // head
    rect(ctx, 35, 3, 6, 4, '#8A5A2A'); // hair
    rect(ctx, 34, 11, 10, 8, '#FF6688'); // body
    px(ctx, 39, 8, '#334'); // eye

    // Heads close together
    rect(ctx, 26, 8, 10, 2, skin); // shoulders touching suggestion

    c.refresh();
  }

  // bp-bath-mosaic — 32×32, geometric tile pattern
  {
    const c = scene.textures.createCanvas('bp-bath-mosaic', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const colors = ['#C8A060', '#E8D8B0', '#C87848'];
    const grout = '#5A4A3A';

    // Grid of 4×4 tiles (8×8 each) in alternating pattern
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const colorIdx = (row + col) % 3;
        const tx = col * 8;
        const ty = row * 8;
        // Grout lines (draw background first)
        rect(ctx, tx, ty, 8, 8, grout);
        // Tile
        rect(ctx, tx + 1, ty + 1, 6, 6, colors[colorIdx]);
      }
    }

    // Subtle tile variation
    const rng = seededRandom(8800);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 30) + 1;
      px(ctx, x, y, rng() > 0.5 ? lighten('#C8A060', 0.1) : darken('#E8D8B0', 0.08));
    }

    c.refresh();
  }

  // ── Budapest Eye POV: cabin window frame ──
  {
    const c = scene.textures.createCanvas('bp-eye-pov-frame', 800, 600);
    if (!c) return;
    const ctx = c.context;

    // Draw the dark metallic frame border
    const frameColor = '#3A3A4A';
    // Top border
    rect(ctx, 0, 0, 800, 50, frameColor);
    // Bottom border
    rect(ctx, 0, 500, 800, 100, frameColor);
    // Left border
    rect(ctx, 0, 0, 60, 600, frameColor);
    // Right border
    rect(ctx, 740, 0, 60, 600, frameColor);

    // Inner corner bevels (diagonal cuts at each inner corner)
    const bevelSize = 5;
    for (let i = 0; i < bevelSize; i++) {
      // Top-left inner corner
      rect(ctx, 60 + i, 50 + i, 1, 1, frameColor);
      for (let j = 0; j <= i; j++) {
        px(ctx, 60 + j, 50 + (bevelSize - 1 - i) + j, frameColor);
      }
      // Top-right inner corner
      for (let j = 0; j <= i; j++) {
        px(ctx, 740 - 1 - j, 50 + (bevelSize - 1 - i) + j, frameColor);
      }
      // Bottom-left inner corner
      for (let j = 0; j <= i; j++) {
        px(ctx, 60 + j, 500 - 1 - (bevelSize - 1 - i) - j + bevelSize, frameColor);
      }
      // Bottom-right inner corner
      for (let j = 0; j <= i; j++) {
        px(ctx, 740 - 1 - j, 500 - 1 - (bevelSize - 1 - i) - j + bevelSize, frameColor);
      }
    }
    // Simpler bevel: fill small triangular areas at inner corners
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5 - i; j++) {
        px(ctx, 60 + i, 50 + j, frameColor);       // top-left
        px(ctx, 739 - i, 50 + j, frameColor);       // top-right
        px(ctx, 60 + i, 499 - j, frameColor);       // bottom-left
        px(ctx, 739 - i, 499 - j, frameColor);       // bottom-right
      }
    }

    // Metal rivets along frame edges
    const rivetColor = '#5A5A6A';
    // Top edge rivets
    for (let x = 40; x < 800; x += 40) {
      circle(ctx, x, 25, 4, rivetColor);
    }
    // Bottom edge rivets
    for (let x = 40; x < 800; x += 40) {
      circle(ctx, x, 575, 4, rivetColor);
    }
    // Left edge rivets
    for (let y = 60; y < 500; y += 40) {
      circle(ctx, 30, y, 4, rivetColor);
    }
    // Right edge rivets
    for (let y = 60; y < 500; y += 40) {
      circle(ctx, 770, y, 4, rivetColor);
    }

    // Window mullion — thin vertical bar splitting view into two panes
    rect(ctx, 399, 50, 3, 450, '#4A4A5A');

    // Glass reflection lines (very subtle white diagonal streaks)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    // Reflection line 1
    ctx.beginPath();
    ctx.moveTo(100, 60);
    ctx.lineTo(250, 500);
    ctx.stroke();
    // Reflection line 2
    ctx.beginPath();
    ctx.moveTo(550, 70);
    ctx.lineTo(700, 480);
    ctx.stroke();
    // Additional subtle reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(150, 60);
    ctx.lineTo(300, 500);
    ctx.stroke();

    // Bottom railing detail
    // Horizontal railing bar at y=510
    rect(ctx, 0, 510, 800, 4, '#5A5A6A');
    // Dashboard below railing
    rect(ctx, 0, 514, 800, 86, '#4A4A52');
    // Screws on railing bar
    const screwPositions = [100, 300, 500, 700];
    for (const sx of screwPositions) {
      circle(ctx, sx, 512, 2, '#6A6A7A');
    }
    // Dashboard surface texture — subtle horizontal lines
    for (let y = 520; y < 600; y += 6) {
      rect(ctx, 5, y, 790, 1, darken('#4A4A52', 0.05));
    }

    c.refresh();
  }

  // ── Budapest Eye POV: couple seen from behind ──
  {
    const c = scene.textures.createCanvas('bp-eye-pov-couple', 240, 140);
    if (!c) return;
    const ctx = c.context;

    // Railing bar at bottom
    rect(ctx, 0, 120, 240, 6, '#5A5A6A');
    // Railing surface
    rect(ctx, 0, 126, 240, 14, darken('#5A5A6A', 0.1));

    // Shadow beneath figures on railing
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(60, 118, 120, 4);

    // ── LEFT FIGURE (player — slightly taller) ──
    const lx = 95; // center x
    const ly = 35; // head center y

    // Back/torso — blue shirt
    rect(ctx, lx - 14, ly + 22, 28, 30, '#4488CC');
    // Shirt shading
    rect(ctx, lx - 14, ly + 22, 5, 30, darken('#4488CC', 0.1));
    rect(ctx, lx + 9, ly + 22, 5, 30, darken('#4488CC', 0.08));
    // Shirt collar detail
    rect(ctx, lx - 4, ly + 16, 8, 3, darken('#4488CC', 0.15));

    // Shoulders — sloping
    for (let i = 0; i < 8; i++) {
      rect(ctx, lx - 15 - i, ly + 16 + i, 3, 2, '#4488CC');
      rect(ctx, lx + 12 + i, ly + 16 + i, 3, 2, '#4488CC');
    }

    // Left arm (player's left, our right) — resting on railing
    rect(ctx, lx + 14, ly + 30, 8, 40, '#4488CC');
    rect(ctx, lx + 14, ly + 68, 8, 6, '#4488CC');
    // Hand (skin)
    rect(ctx, lx + 14, ly + 74, 8, 6, '#D4A574');

    // Right arm extending toward partner
    rect(ctx, lx - 14, ly + 30, 8, 35, '#4488CC');
    // Forearm angling toward center
    for (let i = 0; i < 15; i++) {
      rect(ctx, lx - 14 + i, ly + 65 + Math.floor(i / 3), 3, 4, '#4488CC');
    }
    // Hand reaching toward partner
    rect(ctx, lx + 2, ly + 72, 8, 5, '#D4A574');

    // Neck
    rect(ctx, lx - 3, ly + 10, 6, 6, '#D4A574');

    // Head — dark brown hair, oval shape
    for (let dy = -8; dy <= 8; dy++) {
      const halfW = Math.floor(7 * Math.sqrt(1 - (dy * dy) / 64));
      rect(ctx, lx - halfW, ly + dy, halfW * 2, 1, '#3A2A1A');
    }
    // Hair highlight
    for (let dy = -6; dy <= -2; dy++) {
      const halfW = Math.floor(5 * Math.sqrt(1 - (dy * dy) / 36));
      if (halfW > 0) {
        px(ctx, lx - halfW + 2, ly + dy, lighten('#3A2A1A', 0.15));
        px(ctx, lx - halfW + 3, ly + dy, lighten('#3A2A1A', 0.1));
      }
    }

    // ── RIGHT FIGURE (partner — slightly shorter) ──
    const rx = 145;
    const ry = 40; // slightly lower (shorter)

    // Back/torso — pink/coral top
    rect(ctx, rx - 12, ry + 20, 24, 28, '#E87080');
    // Top shading
    rect(ctx, rx - 12, ry + 20, 4, 28, darken('#E87080', 0.1));
    rect(ctx, rx + 8, ry + 20, 4, 28, darken('#E87080', 0.08));

    // Shoulders — sloping
    for (let i = 0; i < 7; i++) {
      rect(ctx, rx - 13 - i, ry + 14 + i, 3, 2, '#E87080');
      rect(ctx, rx + 10 + i, ry + 14 + i, 3, 2, '#E87080');
    }

    // Right arm (partner's right, our left) — extending toward player
    rect(ctx, rx - 12, ry + 28, 8, 30, '#E87080');
    // Forearm angling toward center
    for (let i = 0; i < 15; i++) {
      rect(ctx, rx - 12 - i, ry + 58 + Math.floor(i / 3), 3, 4, '#E87080');
    }
    // Hand reaching
    rect(ctx, rx - 28, ry + 66, 8, 5, '#E8C8A0');

    // Left arm (partner's left, our right) — on railing
    rect(ctx, rx + 10, ry + 28, 8, 38, '#E87080');
    rect(ctx, rx + 10, ry + 64, 8, 6, '#E8C8A0');

    // Neck
    rect(ctx, rx - 2, ry + 8, 5, 5, '#E8C8A0');

    // Head — lighter brown hair, slightly tilted toward player (offset top by 2px)
    for (let dy = -7; dy <= 7; dy++) {
      const halfW = Math.floor(6.5 * Math.sqrt(1 - (dy * dy) / 49));
      // Tilt: shift x by -2 at top, 0 at bottom
      const tiltOffset = Math.round(-2 * (1 - (dy + 7) / 14));
      rect(ctx, rx - halfW + tiltOffset, ry + dy, halfW * 2, 1, '#8A5A2A');
    }
    // Longer hair on sides (4px below head)
    rect(ctx, rx - 7, ry + 7, 3, 4, '#8A5A2A');
    rect(ctx, rx + 4, ry + 7, 3, 4, '#8A5A2A');
    // Hair highlight
    for (let dy = -5; dy <= -1; dy++) {
      px(ctx, rx - 3, ry + dy, lighten('#8A5A2A', 0.15));
      px(ctx, rx - 2, ry + dy, lighten('#8A5A2A', 0.1));
    }

    // ── HANDS MEETING in the middle ──
    // Their hands touch on the railing
    rect(ctx, lx + 4, ly + 73, 8, 4, '#D4A574');
    rect(ctx, rx - 26, ry + 67, 8, 4, '#E8C8A0');
    // Connection — blended skin color between hands
    const midX = Math.floor((lx + 6 + rx - 24) / 2);
    const midY = Math.floor((ly + 74 + ry + 68) / 2);
    rect(ctx, midX - 2, midY - 1, 8, 4, '#DEB890');

    c.refresh();
  }

  // ── Budapest Eye POV: panoramic cityscape ──
  {
    const c = scene.textures.createCanvas('bp-eye-pov-cityscape', 1200, 400);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(9000);

    // ── Sky gradient (twilight) ──
    for (let y = 0; y < 200; y++) {
      const t = y / 200;
      const r = Math.round(60 + t * 80);
      const g = Math.round(80 + t * 60);
      const b = Math.round(140 - t * 30);
      rect(ctx, 0, y, 1200, 1, `rgb(${r},${g},${b})`);
    }

    // ── LEFT SECTION (x=0-300): Buda Hills ──
    // Rolling green hills
    for (let x = 0; x < 320; x++) {
      const hillHeight = 220 + Math.sin(x * 0.015) * 30 + Math.sin(x * 0.04) * 15;
      const hColor = x < 200 ? '#4A7A3A' : '#4D7D3D';
      rect(ctx, x, Math.floor(hillHeight), 1, 400 - Math.floor(hillHeight), hColor);
      // Lighter hill tops
      rect(ctx, x, Math.floor(hillHeight), 1, 3, '#5A8A4A');
    }

    // Gellert Hill with Citadella silhouette
    for (let x = 80; x < 200; x++) {
      const dist = Math.abs(x - 140);
      const peakH = 160 - (dist * dist) / 80;
      if (peakH > 0) {
        rect(ctx, x, Math.floor(400 - peakH - 140), 1, Math.floor(peakH), '#3A5A2A');
      }
    }
    // Citadella fortress on top
    rect(ctx, 125, 110, 30, 10, '#2A4A1A');
    rect(ctx, 130, 104, 20, 6, '#2A4A1A');
    rect(ctx, 137, 98, 6, 6, '#2A4A1A');
    // Citadella flag
    rect(ctx, 140, 90, 1, 8, '#4A4A4A');
    rect(ctx, 141, 91, 4, 3, '#CC3333');

    // Trees on hills
    for (let i = 0; i < 40; i++) {
      const tx = Math.floor(rng() * 300);
      const baseY = 220 + Math.sin(tx * 0.015) * 30 + Math.sin(tx * 0.04) * 15;
      const ty = Math.floor(baseY) - Math.floor(rng() * 15) - 5;
      const tr = 3 + Math.floor(rng() * 4);
      circle(ctx, tx, ty, tr, rng() > 0.5 ? '#3A6A2A' : '#4A7838');
    }

    // Gellert Baths at base of hill
    rect(ctx, 50, 280, 60, 25, '#C8B890');
    rect(ctx, 55, 275, 50, 5, '#B8A880');
    // Art nouveau facade details
    for (let wx = 58; wx < 105; wx += 10) {
      rect(ctx, wx, 285, 5, 8, '#8A7A6A');
    }
    circle(ctx, 80, 275, 8, '#B8A880');

    // ── LEFT-CENTER (x=200-500): Buda Castle ──
    // Castle hill
    for (let x = 200; x < 480; x++) {
      const dist = Math.abs(x - 340);
      const hillH = Math.max(0, 100 - (dist * dist) / 400);
      rect(ctx, x, Math.floor(200 - hillH), 1, Math.floor(hillH) + 200, '#5A7A4A');
    }

    // Buda Castle main building
    rect(ctx, 270, 130, 140, 60, '#C8B890');
    // Castle wings
    rect(ctx, 260, 140, 10, 50, '#B8A880');
    rect(ctx, 410, 140, 10, 50, '#B8A880');
    // Castle dome
    for (let dx = -18; dx <= 18; dx++) {
      const domeH = Math.floor(18 * Math.sqrt(1 - (dx * dx) / (18 * 18)));
      rect(ctx, 340 + dx, 130 - domeH, 1, domeH, '#7A9A7A');
    }
    // Dome lantern
    rect(ctx, 337, 108, 6, 6, '#8AAA8A');
    rect(ctx, 339, 103, 2, 5, '#6A8A6A');
    // Castle windows (grid)
    for (let wy = 0; wy < 4; wy++) {
      for (let wx = 0; wx < 12; wx++) {
        rect(ctx, 278 + wx * 11, 138 + wy * 12, 5, 7, '#8A7A6A');
      }
    }
    // Terraced gardens below
    for (let i = 0; i < 4; i++) {
      rect(ctx, 280 + i * 5, 190 + i * 8, 120 - i * 10, 3, '#5A8A4A');
    }

    // Fisherman's Bastion — white turrets
    const bastionX = 420;
    for (let t = 0; t < 5; t++) {
      const tx = bastionX + t * 14;
      rect(ctx, tx, 145, 8, 30, '#EEEEEE');
      // Conical roof
      for (let i = 0; i < 8; i++) {
        rect(ctx, tx + Math.floor(i / 2), 145 - i, 8 - i, 1, '#DDDDDD');
      }
    }

    // ── CENTER (x=400-700): Bridges ──
    // Chain Bridge
    const cbLeft = 440;
    const cbRight = 540;
    // Stone towers
    rect(ctx, cbLeft, 240, 20, 50, '#8A8A7A');
    rect(ctx, cbRight, 240, 20, 50, '#8A8A7A');
    // Tower tops
    rect(ctx, cbLeft - 2, 235, 24, 5, '#7A7A6A');
    rect(ctx, cbRight - 2, 235, 24, 5, '#7A7A6A');
    // Bridge deck
    rect(ctx, cbLeft + 10, 280, cbRight - cbLeft, 4, '#7A7A6A');
    // Catenary chains (parabolic arc)
    for (let x = cbLeft + 10; x < cbRight + 10; x++) {
      const t = (x - cbLeft - 10) / (cbRight - cbLeft);
      const sag = 20 * (4 * t * (1 - t)); // parabola
      const chainY = 250 - Math.floor(sag) + 20;
      px(ctx, x, chainY, '#6A6A5A');
      px(ctx, x, chainY + 1, '#6A6A5A');
      // Vertical suspenders every 10px
      if ((x - cbLeft) % 10 === 0) {
        for (let sy = chainY; sy < 280; sy++) {
          px(ctx, x, sy, '#8A8A7A');
        }
      }
    }

    // Liberty Bridge (green iron, to the left)
    rect(ctx, 350, 285, 80, 3, '#2A6A3A');
    // Arched structure
    for (let i = 0; i < 80; i += 20) {
      for (let a = 0; a < 15; a++) {
        const ax = 350 + i + 10;
        const ay = 285 - Math.floor(Math.sqrt(Math.max(0, 100 - (a - 10) * (a - 10))));
        px(ctx, ax + a - 7, ay, '#2A6A3A');
      }
    }

    // Margaret Bridge (stone arches, to the right)
    rect(ctx, 580, 285, 90, 3, '#9A8A7A');
    for (let i = 0; i < 3; i++) {
      for (let a = 0; a < 25; a++) {
        const ax = 590 + i * 28 + a;
        const ay = 285 - Math.floor(8 * Math.sin((a / 25) * Math.PI));
        px(ctx, ax, ay, '#8A7A6A');
      }
    }

    // ── RIGHT-CENTER (x=600-900): Parliament ──
    const parlX = 640;
    const parlY = 150;
    // Main facade
    rect(ctx, parlX, parlY + 20, 200, 80, '#D4C8B0');
    // Foundation / riverside
    rect(ctx, parlX - 5, parlY + 100, 210, 15, darken('#D4C8B0', 0.15));
    // Riverside stairs
    for (let s = 0; s < 4; s++) {
      rect(ctx, parlX + 20 + s * 45, parlY + 100, 30, 3 + s * 3, darken('#D4C8B0', 0.1 + s * 0.03));
    }
    // Central dome
    for (let dx = -28; dx <= 28; dx++) {
      const domeH = Math.floor(28 * Math.sqrt(1 - (dx * dx) / (28 * 28)));
      rect(ctx, parlX + 100 + dx, parlY + 20 - domeH, 1, domeH, '#C8BCA0');
    }
    // Dome spire
    rect(ctx, parlX + 99, parlY - 20, 2, 12, '#B0A490');
    rect(ctx, parlX + 98, parlY - 8, 4, 2, '#B0A490');
    // Two side spires
    rect(ctx, parlX + 40, parlY + 5, 3, 15, '#C0B498');
    rect(ctx, parlX + 160, parlY + 5, 3, 15, '#C0B498');
    // Gothic arches row
    for (let i = 0; i < 8; i++) {
      const ax = parlX + 15 + i * 24;
      rect(ctx, ax, parlY + 25, 16, 12, darken('#D4C8B0', 0.08));
      // Pointed arch top
      for (let p = 0; p < 5; p++) {
        rect(ctx, ax + p + 3, parlY + 24 - Math.floor(p / 2), 16 - p * 2 - 6, 1, darken('#D4C8B0', 0.08));
      }
    }
    // Windows grid (5 rows x 15 cols)
    for (let wy = 0; wy < 5; wy++) {
      for (let wx = 0; wx < 15; wx++) {
        const winX = parlX + 8 + wx * 13;
        const winY = parlY + 40 + wy * 11;
        rect(ctx, winX, winY, 4, 6, '#8A7A6A');
        // Some windows lit
        if (rng() > 0.6) {
          rect(ctx, winX, winY, 4, 6, '#FFEE88');
        }
      }
    }

    // ── RIGHT SECTION (x=800-1200): Pest skyline ──
    // St. Stephen's Basilica dome
    const bsX = 950;
    const bsY = 180;
    rect(ctx, bsX - 25, bsY, 50, 50, '#C0B4A0');
    for (let dx = -22; dx <= 22; dx++) {
      const dh = Math.floor(22 * Math.sqrt(1 - (dx * dx) / (22 * 22)));
      rect(ctx, bsX + dx, bsY - dh, 1, dh, '#B0A490');
    }
    // Basilica cross
    rect(ctx, bsX - 1, bsY - 28, 2, 8, '#8A8A7A');
    rect(ctx, bsX - 4, bsY - 24, 8, 2, '#8A8A7A');
    // Basilica columns
    for (let i = 0; i < 4; i++) {
      rect(ctx, bsX - 18 + i * 12, bsY + 5, 3, 40, darken('#C0B4A0', 0.1));
    }

    // Mix of buildings across Pest skyline
    const pestBuildings = [
      { x: 810, w: 35, h: 100, color: '#B0A89A' },
      { x: 850, w: 28, h: 70, color: '#A0988A' },
      { x: 885, w: 40, h: 120, color: '#C8B890' },
      { x: 930, w: 20, h: 60, color: '#9A8A7A' },
      { x: 980, w: 45, h: 90, color: '#B8A890' },
      { x: 1030, w: 30, h: 110, color: '#A09888' },
      { x: 1065, w: 38, h: 75, color: '#C0B098' },
      { x: 1110, w: 35, h: 95, color: '#B0A490' },
      { x: 1150, w: 45, h: 80, color: '#A89888' },
    ];
    for (const b of pestBuildings) {
      const by = 290 - b.h;
      rect(ctx, b.x, by, b.w, b.h, b.color);
      // Roof variation
      if (rng() > 0.5) {
        // Peaked roof
        for (let p = 0; p < 8; p++) {
          rect(ctx, b.x + p, by - p, b.w - p * 2, 1, darken(b.color, 0.1));
        }
      }
      // Windows
      const winCols = Math.floor(b.w / 8);
      const winRows = Math.floor(b.h / 14);
      for (let wy = 0; wy < winRows; wy++) {
        for (let wx = 0; wx < winCols; wx++) {
          const winX = b.x + 4 + wx * 8;
          const winY = by + 6 + wy * 14;
          const lit = rng() > 0.55;
          rect(ctx, winX, winY, 4, 6, lit ? '#FFEE88' : '#6A7A8A');
        }
      }
      // Chimneys
      if (rng() > 0.4) {
        rect(ctx, b.x + Math.floor(b.w / 3), by - 8, 3, 8, darken(b.color, 0.2));
      }
      // Antenna on some
      if (rng() > 0.7) {
        rect(ctx, b.x + Math.floor(b.w / 2), by - 15, 1, 15, '#5A5A5A');
      }
    }

    // Andrassy Avenue ornate facades (rightmost area)
    for (let i = 0; i < 3; i++) {
      const ax = 1060 + i * 50;
      const ah = 60 + Math.floor(rng() * 40);
      const ay = 290 - ah;
      rect(ctx, ax, ay, 40, ah, '#C8B898');
      // Ornate cornice
      rect(ctx, ax - 2, ay, 44, 3, lighten('#C8B898', 0.1));
      // Balconies
      for (let by = 0; by < 3; by++) {
        rect(ctx, ax + 3, ay + 15 + by * 16, 34, 2, '#A09080');
      }
    }

    // Ground / riverbank line
    rect(ctx, 0, 290, 1200, 3, '#5A7A4A');
    // Water hint (Danube area)
    for (let x = 350; x < 670; x++) {
      const waterY = 295 + Math.floor(Math.sin(x * 0.08) * 2);
      rect(ctx, x, waterY, 1, 105, '#3A5A7A');
      if (rng() > 0.8) {
        px(ctx, x, waterY + Math.floor(rng() * 20), lighten('#3A5A7A', 0.15));
      }
    }

    c.refresh();
  }

  // ── Budapest Eye POV: near buildings (parallax layer) ──
  {
    const c = scene.textures.createCanvas('bp-eye-pov-buildings-near', 1000, 300);
    if (!c) return;
    const ctx = c.context;
    const rng = seededRandom(9001);

    const buildings = [
      { x: 10, w: 90, h: 180, color: '#E8B0B0' },
      { x: 110, w: 80, h: 140, color: '#E8D888' },
      { x: 200, w: 100, h: 200, color: '#D4B888' },
      { x: 310, w: 85, h: 120, color: '#E0C8A0' },
      { x: 405, w: 95, h: 170, color: '#E8B0B0' },
      { x: 510, w: 75, h: 90, color: '#DABE90' },
      { x: 595, w: 110, h: 195, color: '#E8D888' },
      { x: 715, w: 80, h: 130, color: '#D4B888' },
      { x: 805, w: 95, h: 160, color: '#E0C8A0' },
      { x: 910, w: 80, h: 110, color: '#E8B0B0' },
    ];

    for (const b of buildings) {
      const by = 300 - b.h;

      // Main building body
      rect(ctx, b.x, by, b.w, b.h, b.color);

      // Building edge shading
      rect(ctx, b.x, by, 3, b.h, darken(b.color, 0.08));
      rect(ctx, b.x + b.w - 3, by, 3, b.h, darken(b.color, 0.06));

      // Roof line / cornice
      rect(ctx, b.x - 2, by, b.w + 4, 4, darken(b.color, 0.12));
      rect(ctx, b.x - 1, by - 2, b.w + 2, 2, darken(b.color, 0.15));

      // Windows (4 cols x 6 rows, each 8x10px)
      const winCols = Math.min(4, Math.floor((b.w - 16) / 18));
      const winRows = Math.min(6, Math.floor((b.h - 20) / 22));
      const winStartX = b.x + Math.floor((b.w - winCols * 18) / 2);
      for (let wy = 0; wy < winRows; wy++) {
        for (let wx = 0; wx < winCols; wx++) {
          const winX = winStartX + wx * 18;
          const winY = by + 14 + wy * 22;
          const lit = rng() > 0.45;
          // Window frame
          rect(ctx, winX - 1, winY - 1, 10, 12, darken(b.color, 0.1));
          // Window pane
          rect(ctx, winX, winY, 8, 10, lit ? '#FFEE88' : '#6A7A8A');
          // Window divider
          rect(ctx, winX + 3, winY, 1, 10, darken(b.color, 0.05));
          rect(ctx, winX, winY + 4, 8, 1, darken(b.color, 0.05));
        }
      }

      // Balconies with railings and flower boxes
      for (let wy = 0; wy < winRows; wy++) {
        if (rng() > 0.5) {
          const balY = by + 14 + wy * 22 + 10;
          const balX = winStartX - 2;
          const balW = winCols * 18 + 2;
          // Balcony ledge
          rect(ctx, balX, balY, balW, 3, darken(b.color, 0.15));
          // Railing bars
          for (let rb = 0; rb < Math.floor(balW / 5); rb++) {
            rect(ctx, balX + 2 + rb * 5, balY + 3, 1, 5, '#6A6A6A');
          }
          // Bottom rail
          rect(ctx, balX, balY + 7, balW, 1, '#6A6A6A');
          // Flower boxes on some balconies
          if (rng() > 0.4) {
            const fbx = balX + Math.floor(rng() * (balW - 12));
            rect(ctx, fbx, balY - 3, 10, 3, '#6A5A4A');
            // Flowers — tiny colored dots
            const flowerColors = ['#FF4444', '#FF88AA', '#AA44CC', '#FF6644'];
            for (let f = 0; f < 5; f++) {
              px(ctx, fbx + 1 + Math.floor(rng() * 8), balY - 4 - Math.floor(rng() * 3),
                flowerColors[Math.floor(rng() * flowerColors.length)]);
            }
          }
        }
      }

      // Rooftop details
      // Chimney
      if (rng() > 0.3) {
        const chX = b.x + Math.floor(rng() * (b.w - 10)) + 5;
        rect(ctx, chX, by - 12, 6, 12, darken(b.color, 0.25));
        rect(ctx, chX - 1, by - 14, 8, 2, darken(b.color, 0.3));
      }
      // Satellite dish
      if (rng() > 0.6) {
        const sdX = b.x + b.w - 12;
        circle(ctx, sdX, by - 3, 3, '#8A8A8A');
        rect(ctx, sdX, by - 3, 1, 5, '#7A7A7A');
      }
      // AC unit
      if (rng() > 0.5) {
        const acX = b.x + b.w - 15 - Math.floor(rng() * 20);
        const acY = by + 30 + Math.floor(rng() * 40);
        rect(ctx, acX, acY, 10, 7, '#8A8A8A');
        rect(ctx, acX + 1, acY + 1, 8, 2, '#6A6A6A');
      }
    }

    // Gaps between buildings — darker background
    for (const b of buildings) {
      const gapX = b.x + b.w;
      let hasNeighbor = false;
      for (let ni = 0; ni < buildings.length; ni++) {
        if (buildings[ni].x > gapX && buildings[ni].x < gapX + 20) {
          hasNeighbor = true;
          break;
        }
      }
      if (!hasNeighbor) {
        const gapW = 10 + Math.floor(rng() * 10);
        rect(ctx, gapX, 150, gapW, 150, '#2A2A3A');
      }
    }

    // Trees between buildings
    for (let i = 0; i < 6; i++) {
      const tx = 50 + Math.floor(rng() * 900);
      const treeTop = 260 - Math.floor(rng() * 30);
      // Trunk
      rect(ctx, tx, treeTop + 10, 3, 30, '#5A4A2A');
      // Foliage cluster
      circle(ctx, tx + 1, treeTop, 7, '#3A7A2A');
      circle(ctx, tx - 4, treeTop + 4, 5, '#4A8A3A');
      circle(ctx, tx + 6, treeTop + 4, 5, '#3A7A2A');
    }

    c.refresh();
  }

  // ── Budapest Eye POV: cabin interior railing/ledge ──
  {
    const c = scene.textures.createCanvas('bp-eye-pov-railing', 800, 50);
    if (!c) return;
    const ctx = c.context;

    // Main railing bar at top
    rect(ctx, 0, 5, 800, 6, '#5A5A6A');
    // Railing highlight on top edge
    rect(ctx, 0, 5, 800, 1, lighten('#5A5A6A', 0.15));

    // Glass panel below railing — semi-transparent bluish
    for (let y = 11; y < 30; y++) {
      const opacity = 0.3 + Math.sin(y * 0.3) * 0.05;
      ctx.fillStyle = `rgba(74, 106, 138, ${opacity})`;
      ctx.fillRect(0, y, 800, 1);
    }

    // Ledge surface below glass
    rect(ctx, 0, 30, 800, 20, '#4A4A52');

    // Anti-slip texture on ledge surface — horizontal lines every 3px
    for (let y = 31; y < 50; y += 3) {
      rect(ctx, 0, y, 800, 1, darken('#4A4A52', 0.06));
    }

    // Informational plaque at center
    rect(ctx, 350, 33, 100, 14, darken('#4A4A52', 0.2));
    rect(ctx, 352, 35, 96, 10, darken('#4A4A52', 0.15));
    // Tiny text-like marks on plaque
    for (let tx = 355; tx < 445; tx += 4) {
      const tw = 2 + Math.floor(Math.random() * 2);
      rect(ctx, tx, 37, tw, 1, '#8A8A8A');
      if (tx % 8 === 3) {
        rect(ctx, tx, 40, tw + 1, 1, '#7A7A7A');
      }
    }

    // Cup holders
    circle(ctx, 200, 40, 3, '#6A6A7A');
    circle(ctx, 200, 40, 2, darken('#6A6A7A', 0.15));
    circle(ctx, 600, 40, 3, '#6A6A7A');
    circle(ctx, 600, 40, 2, darken('#6A6A7A', 0.15));

    // Bolts/screws at regular intervals along the railing
    for (let bx = 30; bx < 800; bx += 60) {
      circle(ctx, bx, 8, 2, '#6A6A7A');
      // Screw slot mark
      px(ctx, bx - 1, 8, darken('#6A6A7A', 0.2));
      px(ctx, bx + 1, 8, darken('#6A6A7A', 0.2));
    }

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── OUTFIT-AWARE CUTSCENE SPRITE GENERATOR ──────────────────────────────
// Generates character sprites that match the player's outfit selection,
// mirroring AirportTextures' generateCutsceneSeatedSprites approach.
// ══════════════════════════════════════════════════════════════════════════

interface OutfitColors {
  shirt: string;
  hair: string;
  maleHair?: string;
  skin: string;
  hairStyle: string;
  maleHairStyle?: string;
}

function drawCutsceneHead(
  ctx: Ctx, hx: number, hy: number, hw: number, hh: number,
  skin: string, hairColor: string, hairStyle: string,
  isMale: boolean, eyeState: 'open' | 'closed' = 'open',
): void {
  // Head shape
  rect(ctx, hx + 1, hy, hw - 2, hh, skin);
  rect(ctx, hx, hy + 1, hw, hh - 2, skin);

  if (isMale) {
    // Stronger jaw for male
    rect(ctx, hx - 1, hy + hh - 4, hw + 2, 4, skin);
  }

  // Forehead highlight
  rect(ctx, hx + 2, hy + 1, hw - 4, 2, lighten(skin, 0.1));

  // Eyes
  const eyeY = hy + Math.floor(hh * 0.4);
  const eyeW = Math.max(2, Math.floor(hw * 0.22));
  const leftEyeX = hx + Math.floor(hw * 0.15);
  const rightEyeX = hx + hw - Math.floor(hw * 0.15) - eyeW;

  if (eyeState === 'open') {
    rect(ctx, leftEyeX, eyeY, eyeW, Math.ceil(eyeW * 0.75), '#fff');
    rect(ctx, rightEyeX, eyeY, eyeW, Math.ceil(eyeW * 0.75), '#fff');
    px(ctx, leftEyeX + Math.floor(eyeW / 2), eyeY + Math.floor(eyeW * 0.25), '#334');
    px(ctx, rightEyeX + Math.floor(eyeW / 2), eyeY + Math.floor(eyeW * 0.25), '#334');
  } else {
    // Closed eyes — horizontal lines
    rect(ctx, leftEyeX, eyeY + 1, eyeW, 1, '#556');
    rect(ctx, rightEyeX, eyeY + 1, eyeW, 1, '#556');
  }

  // Blush (female only or when relaxed)
  if (!isMale) {
    const blushAlpha = eyeState === 'closed' ? 0.35 : 0.25;
    rect(ctx, leftEyeX - 1, eyeY + Math.ceil(eyeW * 0.75) + 1, eyeW + 1, 2,
      `rgba(255,130,130,${blushAlpha})`);
    rect(ctx, rightEyeX, eyeY + Math.ceil(eyeW * 0.75) + 1, eyeW + 1, 2,
      `rgba(255,130,130,${blushAlpha})`);
  }

  // Mouth
  const mouthY = hy + Math.floor(hh * 0.75);
  const mouthW = Math.max(2, Math.floor(hw * 0.28));
  rect(ctx, hx + Math.floor((hw - mouthW) / 2), mouthY, mouthW, 1, '#c88');

  // Hair
  const isLong = hairStyle === 'long' || hairStyle === 'ponytail';
  // Top coverage
  rect(ctx, hx - 1, hy - 3, hw + 2, 5, hairColor);
  rect(ctx, hx + 1, hy - 4, hw - 2, 3, hairColor);
  // Highlight
  rect(ctx, hx + 2, hy - 3, hw - 4, 2, lighten(hairColor, 0.15));
  // Bangs
  rect(ctx, hx, hy + 1, Math.floor(hw * 0.25), 2, hairColor);
  rect(ctx, hx + hw - Math.floor(hw * 0.25), hy + 1, Math.floor(hw * 0.25), 2, hairColor);

  if (isLong && !isMale) {
    // Long side curtains
    rect(ctx, hx - 2, hy + 1, 3, hh, hairColor);
    rect(ctx, hx + hw - 1, hy + 1, 3, hh, hairColor);
    rect(ctx, hx - 3, hy + Math.floor(hh * 0.5), 3, Math.floor(hh * 0.6), hairColor);
    rect(ctx, hx + hw, hy + Math.floor(hh * 0.5), 3, Math.floor(hh * 0.6), hairColor);
  } else if (hairStyle === 'spiky') {
    rect(ctx, hx + 1, hy - 6, 2, 2, hairColor);
    rect(ctx, hx + 4, hy - 7, 3, 3, hairColor);
    rect(ctx, hx + hw - 5, hy - 6, 3, 2, hairColor);
  } else {
    rect(ctx, hx - 1, hy + 1, 2, 3, hairColor);
    rect(ctx, hx + hw - 1, hy + 1, 2, 3, hairColor);
  }
}

export function generateBudapestCoupleSprites(
  scene: Phaser.Scene,
  playerOutfit: OutfitColors,
  partnerOutfit: OutfitColors,
): void {
  // ── bp-couple-bus: side-by-side seated on bus — 64×48 ──
  {
    const c = scene.textures.createCanvas('bp-couple-bus', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Seat/bench
    rect(ctx, 10, 34, 44, 10, '#3A3A4A');
    rect(ctx, 10, 34, 44, 2, '#4A4A5A');

    // Left figure (player) — female
    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;

    drawCutsceneHead(ctx, 16, 4, 12, 14, pSkin, pHair, pHairStyle, false);
    // Neck
    rect(ctx, 20, 18, 4, 3, pSkin);
    // Body
    rect(ctx, 14, 21, 14, 14, pShirt);
    // Arm
    rect(ctx, 12, 24, 4, 10, pShirt);
    // Hand
    rect(ctx, 12, 34, 3, 2, pSkin);

    // Right figure (partner) — male
    const mSkin = partnerOutfit.skin;
    const mShirt = partnerOutfit.shirt;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    drawCutsceneHead(ctx, 34, 3, 12, 14, mSkin, mHair, mHairStyle, true);
    // Neck
    rect(ctx, 38, 17, 4, 3, mSkin);
    // Body
    rect(ctx, 32, 20, 16, 14, mShirt);
    // Arm
    rect(ctx, 48, 24, 4, 10, mShirt);
    // Hand
    rect(ctx, 49, 34, 3, 2, mSkin);

    // Hands together
    rect(ctx, 27, 30, 6, 3, pSkin);

    c.refresh();
  }

  // ── bp-couple-bus-cozy: leaning together on bus — 64×48 ──
  {
    const c = scene.textures.createCanvas('bp-couple-bus-cozy', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Seat
    rect(ctx, 10, 34, 44, 10, '#3A3A4A');
    rect(ctx, 10, 34, 44, 2, '#4A4A5A');

    // Player (left) — tilted right (leaning on partner)
    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;

    // Body first (tilted)
    rect(ctx, 16, 21, 14, 14, pShirt);
    rect(ctx, 14, 24, 4, 10, pShirt);
    // Neck (angled toward partner)
    rect(ctx, 22, 17, 4, 4, pSkin);
    // Head (shifted right and tilted — drawn offset)
    drawCutsceneHead(ctx, 18, 2, 12, 14, pSkin, pHair, pHairStyle, false, 'closed');
    // Hand on partner's arm
    rect(ctx, 28, 28, 4, 3, pSkin);

    // Partner (right) — slightly tilted left
    const mSkin = partnerOutfit.skin;
    const mShirt = partnerOutfit.shirt;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    rect(ctx, 32, 20, 16, 14, mShirt);
    rect(ctx, 48, 24, 4, 10, mShirt);
    rect(ctx, 38, 16, 4, 4, mSkin);
    drawCutsceneHead(ctx, 34, 2, 12, 14, mSkin, mHair, mHairStyle, true);
    // Hand on player's shoulder
    rect(ctx, 27, 24, 5, 3, mSkin);

    c.refresh();
  }

  // ── bp-couple-close: upper body close-up — 64×48 ──
  {
    const c = scene.textures.createCanvas('bp-couple-close', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Player (left)
    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;

    // Body/shoulders
    rect(ctx, 6, 24, 22, 22, pShirt);
    // Neck
    rect(ctx, 14, 19, 6, 6, pSkin);
    // Head
    drawCutsceneHead(ctx, 10, 2, 14, 16, pSkin, pHair, pHairStyle, false);
    // Arm
    rect(ctx, 2, 28, 6, 16, pShirt);

    // Partner (right)
    const mSkin = partnerOutfit.skin;
    const mShirt = partnerOutfit.shirt;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    // Body
    rect(ctx, 34, 24, 22, 22, mShirt);
    // Neck
    rect(ctx, 42, 19, 6, 6, mSkin);
    // Head
    drawCutsceneHead(ctx, 38, 2, 14, 16, mSkin, mHair, mHairStyle, true);
    // Arm
    rect(ctx, 56, 28, 6, 16, mShirt);

    c.refresh();
  }

  // ── bp-couple-close-cozy: close-up, leaning together — 64×48 ──
  {
    const c = scene.textures.createCanvas('bp-couple-close-cozy', 64, 48);
    if (!c) return;
    const ctx = c.context;

    // Player (left) — leaning right
    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;

    rect(ctx, 8, 24, 22, 22, pShirt);
    rect(ctx, 17, 19, 6, 6, pSkin);
    drawCutsceneHead(ctx, 13, 2, 14, 16, pSkin, pHair, pHairStyle, false, 'closed');
    rect(ctx, 2, 28, 6, 16, pShirt);
    // Hand reaching right
    rect(ctx, 30, 32, 4, 3, pSkin);

    // Partner (right) — leaning left
    const mSkin = partnerOutfit.skin;
    const mShirt = partnerOutfit.shirt;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    rect(ctx, 32, 24, 22, 22, mShirt);
    rect(ctx, 39, 19, 6, 6, mSkin);
    drawCutsceneHead(ctx, 35, 3, 14, 16, mSkin, mHair, mHairStyle, true);
    rect(ctx, 54, 28, 6, 16, mShirt);
    // Hand on player's shoulder
    rect(ctx, 28, 27, 5, 3, mSkin);

    c.refresh();
  }

  // ── bp-couple-pool: in the thermal bath — 64×32 ──
  {
    const c = scene.textures.createCanvas('bp-couple-pool', 64, 32);
    if (!c) return;
    const ctx = c.context;

    // Water at bottom
    rect(ctx, 0, 20, 64, 12, '#2A8A9A');
    const rng = seededRandom(8700);
    for (let i = 0; i < 15; i++) {
      px(ctx, Math.floor(rng() * 64), 22 + Math.floor(rng() * 8), lighten('#2A8A9A', 0.2));
    }
    // Pool edge
    rect(ctx, 0, 18, 64, 3, '#AAAAAA');

    // Player (left) — shoulders up
    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;

    drawCutsceneHead(ctx, 16, 2, 10, 10, pSkin, pHair, pHairStyle, false);
    rect(ctx, 15, 12, 12, 8, pShirt);

    // Partner (right)
    const mSkin = partnerOutfit.skin;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;
    const mShirt = partnerOutfit.shirt;

    drawCutsceneHead(ctx, 36, 1, 10, 10, mSkin, mHair, mHairStyle, true);
    rect(ctx, 35, 11, 12, 8, mShirt);

    // Shoulders touching
    rect(ctx, 27, 12, 8, 2, pSkin);

    c.refresh();
  }

  // ── bp-couple-pool-relaxed: eyes closed, blissful — 64×32 ──
  {
    const c = scene.textures.createCanvas('bp-couple-pool-relaxed', 64, 32);
    if (!c) return;
    const ctx = c.context;

    rect(ctx, 0, 20, 64, 12, '#2A8A9A');
    const rng = seededRandom(8701);
    for (let i = 0; i < 15; i++) {
      px(ctx, Math.floor(rng() * 64), 22 + Math.floor(rng() * 8), lighten('#2A8A9A', 0.2));
    }
    rect(ctx, 0, 18, 64, 3, '#AAAAAA');

    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    drawCutsceneHead(ctx, 16, 2, 10, 10, pSkin, playerOutfit.hair, playerOutfit.hairStyle, false, 'closed');
    rect(ctx, 15, 12, 12, 8, pShirt);

    const mSkin = partnerOutfit.skin;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;
    const mShirt = partnerOutfit.shirt;
    drawCutsceneHead(ctx, 36, 1, 10, 10, mSkin, mHair, mHairStyle, true, 'closed');
    rect(ctx, 35, 11, 12, 8, mShirt);

    rect(ctx, 27, 12, 8, 2, pSkin);

    c.refresh();
  }

  // ── bp-couple-walking: side by side — 48×48 ──
  {
    const c = scene.textures.createCanvas('bp-couple-walking', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const pSkin = playerOutfit.skin;
    const pShirt = playerOutfit.shirt;
    const pHair = playerOutfit.hair;

    // Shadow
    rect(ctx, 8, 42, 32, 4, 'rgba(0,0,0,0.12)');

    // Player (left)
    drawCutsceneHead(ctx, 6, 4, 10, 12, pSkin, pHair, playerOutfit.hairStyle, false);
    rect(ctx, 7, 16, 4, 3, pSkin); // neck
    rect(ctx, 4, 19, 12, 14, pShirt); // body
    rect(ctx, 5, 33, 4, 10, '#444466'); // left leg
    rect(ctx, 11, 33, 4, 10, '#444466'); // right leg

    // Partner (right)
    const mSkin = partnerOutfit.skin;
    const mShirt = partnerOutfit.shirt;
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;

    drawCutsceneHead(ctx, 28, 2, 12, 12, mSkin, mHair,
      partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle, true);
    rect(ctx, 31, 14, 5, 3, mSkin); // neck
    rect(ctx, 26, 17, 14, 16, mShirt); // body
    rect(ctx, 28, 33, 4, 10, '#444466'); // left leg
    rect(ctx, 34, 33, 4, 10, '#444466'); // right leg

    // Hands together
    rect(ctx, 16, 26, 10, 3, pSkin);

    c.refresh();
  }

  // ── bp-couple-shower: hugging in bathing suits under water — 64×64 ──
  // Female has hourglass figure: defined bust, narrow waist, wider hips
  // Couple is hugging — arms wrapped around each other, bodies close
  {
    const c = scene.textures.createCanvas('bp-couple-shower', 64, 64);
    if (!c) return;
    const ctx = c.context;

    const pSkin = playerOutfit.skin;
    const pSkinS = darken(pSkin, 0.08);
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;
    const mSkin = partnerOutfit.skin;
    const mSkinS = darken(mSkin, 0.08);
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    // Partner (right, male) — drawn first so female overlaps slightly in hug
    drawCutsceneHead(ctx, 30, 0, 16, 18, mSkin, mHair, mHairStyle, true);
    rect(ctx, 36, 18, 6, 3, mSkin);         // neck
    rect(ctx, 28, 21, 12, 3, mSkin);        // shoulders left
    rect(ctx, 42, 21, 8, 3, mSkin);         // shoulders right
    rect(ctx, 28, 24, 22, 16, mSkin);       // broad torso/chest
    rect(ctx, 30, 25, 18, 2, lighten(mSkin, 0.06));  // pec highlight
    rect(ctx, 30, 40, 18, 6, '#003366');    // swim trunks
    rect(ctx, 48, 24, 4, 16, mSkin);        // right arm (away side)
    // Left arm wraps around her back (drawn behind her)
    rect(ctx, 18, 26, 12, 3, mSkin);        // arm reaching across to her
    rect(ctx, 16, 28, 4, 3, mSkin);         // hand on her back
    rect(ctx, 32, 46, 6, 14, mSkin);        // left leg
    rect(ctx, 41, 46, 6, 14, mSkin);        // right leg
    rect(ctx, 32, 46, 6, 1, mSkinS);        // leg shadow

    // Player (left, female) — hourglass figure, hugging him
    drawCutsceneHead(ctx, 8, 2, 14, 16, pSkin, pHair, pHairStyle, false);
    rect(ctx, 12, 18, 6, 3, pSkin);         // neck
    rect(ctx, 6, 21, 8, 3, pSkin);          // shoulders left
    rect(ctx, 16, 21, 6, 3, pSkin);         // shoulders right

    // Hourglass torso — bust → narrow waist → wide hips
    rect(ctx, 4, 24, 18, 4, '#FF1493');     // bikini top (wide, bust)
    rect(ctx, 5, 25, 16, 2, lighten('#FF1493', 0.1)); // bikini highlight
    rect(ctx, 6, 28, 14, 2, pSkin);         // upper torso (still wide from bust)
    rect(ctx, 8, 30, 10, 2, pSkin);         // narrowing waist
    rect(ctx, 9, 32, 8, 2, pSkin);          // narrowest waist
    rect(ctx, 7, 34, 12, 2, pSkin);         // waist widens to hips
    rect(ctx, 5, 36, 16, 4, pSkin);         // wide hips
    rect(ctx, 5, 40, 16, 4, '#FF1493');     // bikini bottom (wide, hips)
    rect(ctx, 6, 41, 14, 2, lighten('#FF1493', 0.08)); // bottom highlight
    // Waist shadow for depth
    rect(ctx, 9, 32, 1, 2, pSkinS);
    rect(ctx, 16, 32, 1, 2, pSkinS);

    rect(ctx, 2, 24, 4, 14, pSkin);         // left arm (away side)
    // Right arm wraps around his waist
    rect(ctx, 20, 26, 10, 3, pSkin);        // arm reaching across to him
    rect(ctx, 28, 28, 4, 3, pSkin);         // hand on his side
    rect(ctx, 7, 44, 5, 14, pSkin);         // left leg
    rect(ctx, 14, 44, 5, 14, pSkin);        // right leg
    rect(ctx, 7, 44, 5, 1, pSkinS);         // leg shadow

    // Wet hair shine highlights
    rect(ctx, 10, 3, 2, 6, 'rgba(255,255,255,0.25)');
    rect(ctx, 34, 1, 2, 7, 'rgba(255,255,255,0.25)');

    c.refresh();
  }

  // ── bp-couple-shower-cozy: tight embrace, eyes closed, intimate — 64×64 ──
  // Bodies pressed close, his arms around her, her head on his chest
  {
    const c = scene.textures.createCanvas('bp-couple-shower-cozy', 64, 64);
    if (!c) return;
    const ctx = c.context;

    const pSkin = playerOutfit.skin;
    const pSkinS = darken(pSkin, 0.08);
    const pHair = playerOutfit.hair;
    const pHairStyle = playerOutfit.hairStyle;
    const mSkin = partnerOutfit.skin;
    const mSkinS = darken(mSkin, 0.08);
    const mHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    const mHairStyle = partnerOutfit.maleHairStyle ?? partnerOutfit.hairStyle;

    // Partner (right, male) — both arms wrapping around her
    drawCutsceneHead(ctx, 30, 0, 16, 18, mSkin, mHair, mHairStyle, true, 'closed');
    rect(ctx, 36, 18, 6, 3, mSkin);         // neck
    rect(ctx, 28, 21, 12, 3, mSkin);        // shoulders left
    rect(ctx, 42, 21, 8, 3, mSkin);         // shoulders right
    rect(ctx, 28, 24, 22, 16, mSkin);       // broad torso
    rect(ctx, 30, 25, 18, 2, lighten(mSkin, 0.06)); // pec highlight
    rect(ctx, 30, 40, 18, 6, '#003366');    // swim trunks
    rect(ctx, 48, 24, 4, 12, mSkin);        // right arm (partially visible)
    // Both arms wrapping around her (behind her body)
    rect(ctx, 14, 26, 16, 3, mSkin);        // left arm across her upper back
    rect(ctx, 12, 34, 16, 3, mSkin);        // right arm across her lower back
    rect(ctx, 12, 26, 3, 3, mSkin);         // left hand on her shoulder
    rect(ctx, 10, 34, 3, 3, mSkin);         // right hand on her waist
    rect(ctx, 32, 46, 6, 14, mSkin);        // left leg
    rect(ctx, 41, 46, 6, 14, mSkin);        // right leg
    rect(ctx, 32, 46, 6, 1, mSkinS);

    // Player (left, female) — pressed against him, head tilted onto his chest
    // Head closer to him and slightly lower (resting on chest)
    drawCutsceneHead(ctx, 12, 4, 14, 16, pSkin, pHair, pHairStyle, false, 'closed');
    rect(ctx, 16, 20, 6, 3, pSkin);         // neck (shifted right toward him)
    rect(ctx, 10, 23, 8, 3, pSkin);         // shoulders left
    rect(ctx, 20, 23, 6, 3, pSkin);         // shoulders right

    // Hourglass torso — bust → narrow waist → wide hips
    rect(ctx, 8, 26, 18, 4, '#FF1493');     // bikini top (wide bust)
    rect(ctx, 9, 27, 16, 2, lighten('#FF1493', 0.1)); // bikini highlight
    rect(ctx, 10, 30, 14, 2, pSkin);        // upper torso
    rect(ctx, 12, 32, 10, 2, pSkin);        // narrowing waist
    rect(ctx, 13, 34, 8, 2, pSkin);         // narrowest waist
    rect(ctx, 11, 36, 12, 2, pSkin);        // widens to hips
    rect(ctx, 9, 38, 16, 2, pSkin);         // wide hips
    rect(ctx, 9, 40, 16, 4, '#FF1493');     // bikini bottom (wide hips)
    rect(ctx, 10, 41, 14, 2, lighten('#FF1493', 0.08)); // bottom highlight
    // Waist shadow
    rect(ctx, 13, 34, 1, 2, pSkinS);
    rect(ctx, 20, 34, 1, 2, pSkinS);

    // Her arms around his torso
    rect(ctx, 24, 28, 8, 3, pSkin);         // right arm across him
    rect(ctx, 30, 30, 4, 3, pSkin);         // hand on his back
    rect(ctx, 6, 26, 4, 12, pSkin);         // left arm (partially visible)
    rect(ctx, 10, 44, 5, 14, pSkin);        // left leg
    rect(ctx, 17, 44, 5, 14, pSkin);        // right leg
    rect(ctx, 10, 44, 5, 1, pSkinS);

    // Wet hair shine (intensified for cozy)
    rect(ctx, 14, 5, 2, 6, 'rgba(255,255,255,0.3)');
    rect(ctx, 34, 1, 2, 7, 'rgba(255,255,255,0.3)');

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── AIRBNB INTERIORS ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function generateBudapestAirbnbInteriors(scene: Phaser.Scene): void {

  // interior-reception-desk — 32×32, dark mahogany desk with gold trim and marble top
  {
    const c = scene.textures.createCanvas('interior-reception-desk', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Desk body — dark mahogany
    rect(ctx, 4, 14, 24, 16, '#4A1E0A');
    rect(ctx, 5, 15, 22, 14, '#5C2E14');

    // Front panel detail
    rect(ctx, 8, 18, 16, 8, '#4A1E0A');
    rect(ctx, 9, 19, 14, 6, darken('#5C2E14', 0.1));

    // Marble top surface
    rect(ctx, 3, 12, 26, 3, '#F5F0E8');
    rect(ctx, 5, 12, 4, 1, '#EDE8DF');
    rect(ctx, 14, 13, 6, 1, '#EDE8DF');
    rect(ctx, 22, 12, 3, 1, '#E8E3DA');

    // Gold trim along top edge
    rect(ctx, 3, 11, 26, 1, '#D4A843');
    rect(ctx, 3, 14, 26, 1, '#C9A648');

    // Desk legs
    rect(ctx, 5, 28, 3, 4, '#4A1E0A');
    rect(ctx, 24, 28, 3, 4, '#4A1E0A');

    // Gold knobs
    px(ctx, 16, 22, '#D4A843');
    px(ctx, 15, 22, '#B8942E');

    c.refresh();
  }

  // interior-luggage — 32×32, elegant stacked suitcases, burgundy/brown leather
  {
    const c = scene.textures.createCanvas('interior-luggage', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Bottom suitcase — brown leather
    rect(ctx, 6, 18, 20, 12, '#6B3A1F');
    rect(ctx, 7, 19, 18, 10, '#7A4528');
    rect(ctx, 6, 23, 20, 1, '#5C2E14');
    // Handle
    rect(ctx, 14, 17, 4, 2, '#4A1E0A');
    // Gold clasp
    px(ctx, 16, 20, '#D4A843');
    px(ctx, 15, 20, '#D4A843');
    // Gold trim
    rect(ctx, 6, 18, 20, 1, '#B8942E');

    // Top suitcase — burgundy
    rect(ctx, 8, 6, 16, 12, '#800020');
    rect(ctx, 9, 7, 14, 10, '#9A1030');
    rect(ctx, 8, 11, 16, 1, '#700018');
    // Handle
    rect(ctx, 14, 4, 4, 3, '#5C0018');
    rect(ctx, 15, 4, 2, 1, '#D4A843');
    // Gold clasps
    px(ctx, 13, 8, '#D4A843');
    px(ctx, 19, 8, '#D4A843');
    // Gold trim
    rect(ctx, 8, 6, 16, 1, '#B8942E');

    c.refresh();
  }

  // interior-elevator — 32×32, brass/gold elevator doors with art deco pattern
  {
    const c = scene.textures.createCanvas('interior-elevator', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Wall surround
    rect(ctx, 0, 0, 32, 32, '#3A3A3A');

    // Elevator frame — brass
    rect(ctx, 3, 2, 26, 28, '#B5A642');
    rect(ctx, 4, 3, 24, 26, '#C9A648');

    // Left door
    rect(ctx, 5, 4, 10, 24, '#8A7A32');
    rect(ctx, 6, 5, 8, 22, '#9A8A3A');

    // Right door
    rect(ctx, 17, 4, 10, 24, '#8A7A32');
    rect(ctx, 18, 5, 8, 22, '#9A8A3A');

    // Door gap
    rect(ctx, 15, 4, 2, 24, '#1A1A1A');

    // Art deco pattern — left door
    rect(ctx, 8, 7, 4, 1, '#D4A843');
    rect(ctx, 9, 8, 2, 4, '#D4A843');
    rect(ctx, 8, 12, 4, 1, '#D4A843');
    rect(ctx, 8, 16, 4, 1, '#D4A843');
    rect(ctx, 9, 17, 2, 4, '#D4A843');
    rect(ctx, 8, 21, 4, 1, '#D4A843');

    // Art deco pattern — right door
    rect(ctx, 20, 7, 4, 1, '#D4A843');
    rect(ctx, 21, 8, 2, 4, '#D4A843');
    rect(ctx, 20, 12, 4, 1, '#D4A843');
    rect(ctx, 20, 16, 4, 1, '#D4A843');
    rect(ctx, 21, 17, 2, 4, '#D4A843');
    rect(ctx, 20, 21, 4, 1, '#D4A843');

    // Floor indicator above
    rect(ctx, 13, 1, 6, 2, '#1A1A1A');
    px(ctx, 15, 1, '#D4A843');
    px(ctx, 16, 1, '#D4A843');

    c.refresh();
  }

  // interior-shower — 32×32, glass shower enclosure with chrome/gold fixtures, marble base
  {
    const c = scene.textures.createCanvas('interior-shower', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Marble base/floor
    rect(ctx, 4, 26, 24, 6, '#F5F0E8');
    rect(ctx, 6, 27, 5, 2, '#EDE8DF');
    rect(ctx, 16, 28, 4, 1, '#E8E3DA');

    // Back wall — marble
    rect(ctx, 4, 2, 24, 24, '#EDE8DF');
    rect(ctx, 5, 4, 8, 3, '#F5F0E8');
    rect(ctx, 18, 8, 6, 2, '#F5F0E8');

    // Glass panels (semi-transparent look)
    rect(ctx, 4, 2, 1, 24, '#B8D4E8');
    rect(ctx, 27, 2, 1, 24, '#B8D4E8');
    rect(ctx, 4, 2, 24, 1, '#B8D4E8');

    // Glass door frame
    rect(ctx, 16, 2, 1, 24, '#A8C4D8');

    // Shower head — gold
    rect(ctx, 22, 3, 4, 2, '#D4A843');
    rect(ctx, 23, 5, 2, 1, '#B8942E');
    // Water drops
    px(ctx, 22, 7, '#A8C4D8');
    px(ctx, 24, 9, '#B8D4E8');
    px(ctx, 23, 11, '#A8C4D8');
    px(ctx, 25, 8, '#B8D4E8');

    // Gold faucet handle
    rect(ctx, 22, 14, 3, 2, '#D4A843');
    px(ctx, 23, 13, '#C9A648');

    // Drain
    circle(ctx, 16, 29, 1, '#B8942E');

    c.refresh();
  }

  // interior-chandelier — 32×32, crystal chandelier with gold frame and light glow
  {
    const c = scene.textures.createCanvas('interior-chandelier', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Glow effect (soft yellow backdrop)
    circle(ctx, 16, 16, 12, 'rgba(255,248,220,0.3)');
    circle(ctx, 16, 16, 8, 'rgba(255,240,200,0.4)');

    // Ceiling mount — gold
    rect(ctx, 14, 0, 4, 3, '#B8942E');

    // Chain
    rect(ctx, 15, 3, 2, 4, '#D4A843');

    // Main body — gold frame
    rect(ctx, 10, 7, 12, 3, '#D4A843');
    rect(ctx, 12, 10, 8, 2, '#C9A648');

    // Crystal drops — left arm
    rect(ctx, 6, 9, 2, 1, '#D4A843');
    rect(ctx, 8, 8, 2, 2, '#D4A843');
    px(ctx, 6, 10, '#F0E8D0');
    px(ctx, 7, 11, '#FFF8E7');
    px(ctx, 6, 12, '#E8E0C8');
    px(ctx, 7, 13, '#F0E8D0');

    // Crystal drops — right arm
    rect(ctx, 22, 9, 2, 1, '#D4A843');
    rect(ctx, 22, 8, 2, 2, '#D4A843');
    px(ctx, 24, 10, '#F0E8D0');
    px(ctx, 23, 11, '#FFF8E7');
    px(ctx, 24, 12, '#E8E0C8');
    px(ctx, 23, 13, '#F0E8D0');

    // Center crystal drops
    px(ctx, 14, 12, '#FFF8E7');
    px(ctx, 16, 13, '#F0E8D0');
    px(ctx, 18, 12, '#FFF8E7');
    px(ctx, 15, 14, '#E8E0C8');
    px(ctx, 17, 14, '#E8E0C8');
    px(ctx, 16, 15, '#FFF8E7');
    px(ctx, 14, 15, '#F0E8D0');
    px(ctx, 18, 15, '#F0E8D0');
    px(ctx, 15, 17, '#FFF8E7');
    px(ctx, 17, 17, '#FFF8E7');
    px(ctx, 16, 18, '#F0E8D0');

    // Light bulbs (warm glow)
    px(ctx, 9, 10, '#FFFDE0');
    px(ctx, 22, 10, '#FFFDE0');
    px(ctx, 14, 11, '#FFFDE0');
    px(ctx, 18, 11, '#FFFDE0');

    c.refresh();
  }

  // interior-armchair — 32×32, plush velvet emerald armchair with gold legs
  {
    const c = scene.textures.createCanvas('interior-armchair', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Gold legs
    rect(ctx, 7, 26, 2, 6, '#D4A843');
    rect(ctx, 23, 26, 2, 6, '#D4A843');
    rect(ctx, 8, 28, 2, 4, '#B8942E');
    rect(ctx, 22, 28, 2, 4, '#B8942E');

    // Seat cushion
    rect(ctx, 6, 18, 20, 8, '#1B6B3A');
    rect(ctx, 7, 19, 18, 6, lighten('#1B6B3A', 0.1));

    // Back rest
    rect(ctx, 8, 6, 16, 13, '#1B6B3A');
    rect(ctx, 9, 7, 14, 11, lighten('#1B6B3A', 0.15));
    rect(ctx, 10, 8, 12, 4, lighten('#1B6B3A', 0.05));

    // Left armrest
    rect(ctx, 3, 10, 4, 16, '#1B6B3A');
    rect(ctx, 4, 11, 2, 14, darken('#1B6B3A', 0.1));

    // Right armrest
    rect(ctx, 25, 10, 4, 16, '#1B6B3A');
    rect(ctx, 26, 11, 2, 14, darken('#1B6B3A', 0.1));

    // Button tufting on back
    px(ctx, 13, 9, '#0E5A2A');
    px(ctx, 19, 9, '#0E5A2A');
    px(ctx, 16, 11, '#0E5A2A');

    // Gold trim on armrest tops
    rect(ctx, 3, 10, 4, 1, '#D4A843');
    rect(ctx, 25, 10, 4, 1, '#D4A843');

    c.refresh();
  }

  // interior-plant-lux — 32×32, tall potted plant in gold/brass pot
  {
    const c = scene.textures.createCanvas('interior-plant-lux', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Gold/brass pot
    rect(ctx, 10, 22, 12, 10, '#B5A642');
    rect(ctx, 11, 23, 10, 8, '#C9A648');
    rect(ctx, 9, 22, 14, 2, '#D4A843');
    rect(ctx, 12, 30, 8, 2, '#B8942E');

    // Pot rim highlight
    rect(ctx, 9, 22, 14, 1, lighten('#D4A843', 0.2));

    // Soil
    rect(ctx, 11, 22, 10, 2, '#3E2B1A');

    // Stem
    rect(ctx, 15, 10, 2, 12, '#2D5A1E');

    // Leaves — large tropical
    rect(ctx, 10, 6, 6, 4, '#1B6B3A');
    rect(ctx, 16, 4, 6, 4, '#1B6B3A');
    rect(ctx, 8, 10, 5, 3, '#228B3A');
    rect(ctx, 19, 8, 5, 3, '#228B3A');
    rect(ctx, 12, 2, 4, 4, '#1B6B3A');
    rect(ctx, 18, 6, 4, 3, lighten('#1B6B3A', 0.1));
    rect(ctx, 6, 7, 4, 3, lighten('#228B3A', 0.1));

    // Leaf veins
    px(ctx, 13, 7, '#0E5A2A');
    px(ctx, 18, 5, '#0E5A2A');
    px(ctx, 10, 11, '#1A5C2A');
    px(ctx, 21, 9, '#1A5C2A');

    c.refresh();
  }

  // interior-painting — 32×32, ornate gold frame with landscape painting
  {
    const c = scene.textures.createCanvas('interior-painting', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Outer gold frame
    rect(ctx, 2, 4, 28, 24, '#D4A843');
    rect(ctx, 3, 5, 26, 22, '#C9A648');
    rect(ctx, 4, 6, 24, 20, '#B8942E');

    // Inner frame border
    rect(ctx, 5, 7, 22, 18, '#D4A843');

    // Canvas — landscape painting
    rect(ctx, 6, 8, 20, 16, '#87CEEB'); // sky
    rect(ctx, 6, 16, 20, 8, '#4A8C3F'); // grass/hills
    rect(ctx, 6, 18, 20, 6, '#3A7A2F'); // foreground

    // Rolling hills
    circle(ctx, 12, 17, 4, '#5A9C4F');
    circle(ctx, 22, 18, 3, '#4A8C3F');

    // Sun
    circle(ctx, 22, 10, 2, '#F5D061');

    // Clouds
    rect(ctx, 8, 9, 4, 2, '#FFFFFF');
    rect(ctx, 14, 10, 3, 1, '#F0F0F0');

    // Trees
    rect(ctx, 9, 14, 2, 4, '#5C3A1E');
    circle(ctx, 10, 13, 2, '#2D6B1E');

    // Frame corner ornaments
    px(ctx, 3, 5, lighten('#D4A843', 0.3));
    px(ctx, 28, 5, lighten('#D4A843', 0.3));
    px(ctx, 3, 26, lighten('#D4A843', 0.3));
    px(ctx, 28, 26, lighten('#D4A843', 0.3));

    c.refresh();
  }

  // interior-mirror — 32×32, oval mirror with gold ornate frame, reflective surface
  {
    const c = scene.textures.createCanvas('interior-mirror', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Gold frame — oval approximation
    circle(ctx, 16, 16, 13, '#D4A843');
    circle(ctx, 16, 16, 12, '#C9A648');
    circle(ctx, 16, 16, 11, '#B8942E');

    // Mirror surface — reflective blue-white
    circle(ctx, 16, 16, 10, '#C8D8E8');
    circle(ctx, 16, 16, 9, '#D0E0F0');

    // Reflection highlights
    rect(ctx, 11, 10, 3, 1, '#E8F0FF');
    rect(ctx, 12, 11, 2, 3, '#E0E8F0');
    px(ctx, 11, 9, '#FFFFFF');
    px(ctx, 20, 18, '#E0E8F0');

    // Frame ornament — top
    rect(ctx, 14, 2, 4, 2, '#D4A843');
    px(ctx, 15, 1, lighten('#D4A843', 0.2));
    px(ctx, 16, 1, lighten('#D4A843', 0.2));

    // Frame ornament — bottom
    rect(ctx, 14, 28, 4, 2, '#D4A843');
    px(ctx, 15, 30, lighten('#D4A843', 0.2));
    px(ctx, 16, 30, lighten('#D4A843', 0.2));

    c.refresh();
  }

  // interior-minibar — 32×32, small dark wood cabinet with glass door showing bottles
  {
    const c = scene.textures.createCanvas('interior-minibar', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Cabinet body — dark wood
    rect(ctx, 4, 4, 24, 26, '#4A1E0A');
    rect(ctx, 5, 5, 22, 24, '#5C2E14');

    // Glass door panel
    rect(ctx, 7, 7, 18, 18, '#2A3A4A');
    rect(ctx, 8, 8, 16, 16, '#3A4A5A');

    // Shelves
    rect(ctx, 8, 14, 16, 1, '#5C2E14');
    rect(ctx, 8, 20, 16, 1, '#5C2E14');

    // Bottles — top shelf
    rect(ctx, 10, 9, 2, 5, '#800020'); // burgundy bottle
    rect(ctx, 10, 8, 2, 1, '#600018');
    rect(ctx, 14, 10, 2, 4, '#2A5A2A'); // green bottle
    rect(ctx, 14, 9, 2, 1, '#1A4A1A');
    rect(ctx, 18, 9, 2, 5, '#C9A648'); // gold bottle
    rect(ctx, 18, 8, 2, 1, '#B8942E');

    // Bottles — bottom shelf
    rect(ctx, 11, 15, 2, 5, '#4A6A8A'); // blue bottle
    rect(ctx, 11, 14, 2, 1, '#3A5A7A');
    rect(ctx, 16, 15, 2, 5, '#8A4A2A'); // amber bottle
    rect(ctx, 16, 14, 2, 1, '#7A3A1A');

    // Gold handle
    rect(ctx, 24, 14, 2, 4, '#D4A843');

    // Gold trim — top
    rect(ctx, 4, 4, 24, 1, '#B8942E');

    // Legs
    rect(ctx, 5, 28, 2, 4, '#4A1E0A');
    rect(ctx, 25, 28, 2, 4, '#4A1E0A');

    c.refresh();
  }

  // interior-wardrobe — 32×32, tall dark wood wardrobe with ornate handles
  {
    const c = scene.textures.createCanvas('interior-wardrobe', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Main body — dark wood
    rect(ctx, 3, 2, 26, 28, '#4A1E0A');
    rect(ctx, 4, 3, 24, 26, '#5C2E14');

    // Left door panel
    rect(ctx, 5, 4, 10, 24, '#6B3A1F');
    rect(ctx, 6, 5, 8, 22, '#5C2E14');

    // Right door panel
    rect(ctx, 17, 4, 10, 24, '#6B3A1F');
    rect(ctx, 18, 5, 8, 22, '#5C2E14');

    // Door gap
    rect(ctx, 15, 4, 2, 24, '#3A1608');

    // Gold handles
    rect(ctx, 13, 14, 1, 4, '#D4A843');
    rect(ctx, 18, 14, 1, 4, '#D4A843');
    px(ctx, 13, 13, '#B8942E');
    px(ctx, 18, 13, '#B8942E');
    px(ctx, 13, 18, '#B8942E');
    px(ctx, 18, 18, '#B8942E');

    // Ornate panel insets — left door
    rect(ctx, 7, 7, 6, 8, darken('#5C2E14', 0.15));
    rect(ctx, 7, 18, 6, 6, darken('#5C2E14', 0.15));

    // Ornate panel insets — right door
    rect(ctx, 19, 7, 6, 8, darken('#5C2E14', 0.15));
    rect(ctx, 19, 18, 6, 6, darken('#5C2E14', 0.15));

    // Crown molding
    rect(ctx, 2, 1, 28, 2, '#4A1E0A');
    rect(ctx, 3, 0, 26, 1, '#D4A843');

    // Base molding
    rect(ctx, 2, 29, 28, 2, '#4A1E0A');

    // Feet
    rect(ctx, 4, 30, 3, 2, '#3A1608');
    rect(ctx, 25, 30, 3, 2, '#3A1608');

    c.refresh();
  }

  // interior-coffee-table — 32×32, glass/marble top coffee table with gold legs
  {
    const c = scene.textures.createCanvas('interior-coffee-table', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Gold legs
    rect(ctx, 6, 18, 2, 14, '#D4A843');
    rect(ctx, 24, 18, 2, 14, '#D4A843');
    rect(ctx, 6, 20, 2, 2, '#B8942E');
    rect(ctx, 24, 20, 2, 2, '#B8942E');

    // Cross brace — gold
    rect(ctx, 8, 24, 16, 1, '#C9A648');

    // Marble/glass tabletop
    rect(ctx, 3, 14, 26, 5, '#F5F0E8');
    rect(ctx, 4, 15, 24, 3, '#EDE8DF');
    rect(ctx, 8, 15, 6, 1, '#E8E3DA');
    rect(ctx, 18, 16, 4, 1, '#E8E3DA');

    // Gold rim
    rect(ctx, 3, 14, 26, 1, '#D4A843');
    rect(ctx, 3, 18, 26, 1, '#C9A648');

    // Subtle marble veining
    px(ctx, 10, 16, '#D8D3CB');
    px(ctx, 11, 16, '#D8D3CB');
    px(ctx, 20, 15, '#D8D3CB');

    c.refresh();
  }

  // interior-rug — 32×32, persian/ornate rug with rich red/gold pattern
  {
    const c = scene.textures.createCanvas('interior-rug', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Base — deep red
    rect(ctx, 2, 6, 28, 20, '#800020');
    rect(ctx, 3, 7, 26, 18, '#9A1030');

    // Gold border
    rect(ctx, 2, 6, 28, 1, '#D4A843');
    rect(ctx, 2, 25, 28, 1, '#D4A843');
    rect(ctx, 2, 6, 1, 20, '#D4A843');
    rect(ctx, 29, 6, 1, 20, '#D4A843');

    // Inner border
    rect(ctx, 4, 8, 24, 1, '#C9A648');
    rect(ctx, 4, 24, 24, 1, '#C9A648');
    rect(ctx, 4, 8, 1, 16, '#C9A648');
    rect(ctx, 27, 8, 1, 16, '#C9A648');

    // Central medallion
    circle(ctx, 16, 16, 5, '#D4A843');
    circle(ctx, 16, 16, 4, '#800020');
    circle(ctx, 16, 16, 2, '#C9A648');
    px(ctx, 16, 16, '#FFF8E7');

    // Corner ornaments
    rect(ctx, 5, 9, 3, 3, '#D4A843');
    rect(ctx, 6, 10, 1, 1, '#800020');
    rect(ctx, 24, 9, 3, 3, '#D4A843');
    rect(ctx, 25, 10, 1, 1, '#800020');
    rect(ctx, 5, 21, 3, 3, '#D4A843');
    rect(ctx, 6, 22, 1, 1, '#800020');
    rect(ctx, 24, 21, 3, 3, '#D4A843');
    rect(ctx, 25, 22, 1, 1, '#800020');

    // Pattern details
    px(ctx, 10, 12, '#B8942E');
    px(ctx, 22, 12, '#B8942E');
    px(ctx, 10, 20, '#B8942E');
    px(ctx, 22, 20, '#B8942E');
    px(ctx, 16, 10, '#FFF8E7');
    px(ctx, 16, 22, '#FFF8E7');

    // Fringe on short edges
    for (let x = 3; x < 30; x += 2) {
      px(ctx, x, 5, '#D4A843');
      px(ctx, x, 26, '#D4A843');
    }

    c.refresh();
  }

  // interior-nightstand — 32×32, small bedside table with gold knob, lamp on top
  {
    const c = scene.textures.createCanvas('interior-nightstand', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Table body — dark wood
    rect(ctx, 6, 16, 20, 12, '#4A1E0A');
    rect(ctx, 7, 17, 18, 10, '#5C2E14');

    // Drawer
    rect(ctx, 8, 19, 16, 6, '#6B3A1F');
    rect(ctx, 9, 20, 14, 4, '#5C2E14');

    // Gold knob
    px(ctx, 16, 21, '#D4A843');
    px(ctx, 15, 21, '#B8942E');

    // Table top
    rect(ctx, 5, 14, 22, 2, '#4A1E0A');
    rect(ctx, 5, 14, 22, 1, '#5C2E14');

    // Legs
    rect(ctx, 7, 27, 2, 5, '#4A1E0A');
    rect(ctx, 23, 27, 2, 5, '#4A1E0A');

    // Lamp on top
    // Lamp base
    rect(ctx, 14, 12, 4, 2, '#B8942E');
    // Lamp stem
    rect(ctx, 15, 8, 2, 4, '#D4A843');
    // Lampshade
    rect(ctx, 11, 4, 10, 5, '#FFF8E7');
    rect(ctx, 12, 5, 8, 3, lighten('#FFF8E7', 0.1));
    // Warm glow
    px(ctx, 16, 6, '#FFFDE0');

    c.refresh();
  }

  // interior-luxury-bed — 64×64, king-size bed with dark wood frame, white/gold bedding
  {
    const c = scene.textures.createCanvas('interior-luxury-bed', 64, 64);
    if (!c) return;
    const ctx = c.context;

    // Bed frame — dark wood
    rect(ctx, 4, 8, 56, 52, '#4A1E0A');
    rect(ctx, 6, 10, 52, 48, '#5C2E14');

    // Headboard
    rect(ctx, 4, 4, 56, 10, '#4A1E0A');
    rect(ctx, 6, 5, 52, 8, '#5C2E14');
    rect(ctx, 8, 6, 48, 6, '#6B3A1F');
    // Gold trim on headboard
    rect(ctx, 4, 4, 56, 1, '#D4A843');
    rect(ctx, 8, 7, 48, 1, '#C9A648');

    // Mattress
    rect(ctx, 8, 14, 48, 40, '#FFFFFF');
    rect(ctx, 9, 15, 46, 38, '#FFF8E7');

    // Duvet/comforter — white with gold trim
    rect(ctx, 8, 24, 48, 30, '#FFFFFF');
    rect(ctx, 9, 25, 46, 28, '#F5F0E8');
    rect(ctx, 8, 24, 48, 2, '#D4A843');

    // Duvet fold detail
    rect(ctx, 10, 26, 44, 1, '#EDE8DF');
    rect(ctx, 10, 30, 44, 1, lighten('#EDE8DF', 0.1));

    // Pillows — left
    rect(ctx, 10, 15, 20, 10, '#FFFFFF');
    rect(ctx, 11, 16, 18, 8, '#FFF8E7');
    rect(ctx, 12, 17, 16, 2, '#F5F0E8');

    // Pillows — right
    rect(ctx, 34, 15, 20, 10, '#FFFFFF');
    rect(ctx, 35, 16, 18, 8, '#FFF8E7');
    rect(ctx, 36, 17, 16, 2, '#F5F0E8');

    // Gold accent stripe on duvet
    rect(ctx, 10, 38, 44, 1, '#D4A843');
    rect(ctx, 10, 42, 44, 1, '#C9A648');

    // Decorative throw pillow — center (burgundy with gold)
    rect(ctx, 24, 16, 16, 8, '#800020');
    rect(ctx, 25, 17, 14, 6, '#9A1030');
    rect(ctx, 26, 19, 12, 1, '#D4A843');

    // Footboard
    rect(ctx, 4, 54, 56, 6, '#4A1E0A');
    rect(ctx, 6, 55, 52, 4, '#5C2E14');
    rect(ctx, 4, 59, 56, 1, '#D4A843');

    // Bed legs
    rect(ctx, 4, 58, 4, 6, '#3A1608');
    rect(ctx, 56, 58, 4, 6, '#3A1608');

    c.refresh();
  }

  // interior-tv-luxury — 32×32, flat screen mounted TV with thin bezel, blue screen
  {
    const c = scene.textures.createCanvas('interior-tv-luxury', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Wall mount bracket
    rect(ctx, 14, 4, 4, 3, '#3A3A3A');

    // TV frame — thin dark bezel
    rect(ctx, 3, 6, 26, 18, '#1A1A1A');
    rect(ctx, 4, 7, 24, 16, '#222222');

    // Screen — blue glow
    rect(ctx, 5, 8, 22, 14, '#1A3A6A');
    rect(ctx, 6, 9, 20, 12, '#2A4A7A');

    // Screen reflection/content
    rect(ctx, 8, 10, 8, 4, '#3A5A8A');
    rect(ctx, 18, 12, 6, 3, '#2A4A7A');
    rect(ctx, 10, 15, 12, 1, '#3A5A8A');

    // Screen highlight
    rect(ctx, 6, 9, 10, 1, 'rgba(255,255,255,0.15)');

    // Power LED
    px(ctx, 16, 23, '#00FF00');

    // Gold accent strip on bottom bezel
    rect(ctx, 5, 22, 22, 1, '#B8942E');

    c.refresh();
  }

  // interior-vanity — 32×32, bathroom vanity with marble counter, gold faucet, vessel sink
  {
    const c = scene.textures.createCanvas('interior-vanity', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Cabinet body — dark wood
    rect(ctx, 4, 16, 24, 14, '#4A1E0A');
    rect(ctx, 5, 17, 22, 12, '#5C2E14');

    // Cabinet doors
    rect(ctx, 6, 18, 9, 10, '#6B3A1F');
    rect(ctx, 17, 18, 9, 10, '#6B3A1F');

    // Gold handles
    px(ctx, 14, 22, '#D4A843');
    px(ctx, 18, 22, '#D4A843');

    // Marble countertop
    rect(ctx, 3, 13, 26, 3, '#F5F0E8');
    rect(ctx, 5, 14, 4, 1, '#EDE8DF');
    rect(ctx, 16, 13, 6, 1, '#EDE8DF');
    rect(ctx, 24, 14, 3, 1, '#E8E3DA');

    // Vessel sink — white porcelain
    rect(ctx, 12, 10, 8, 4, '#FFFFFF');
    rect(ctx, 13, 11, 6, 2, '#E8E8F0');
    rect(ctx, 12, 13, 8, 1, '#F5F0E8');

    // Gold faucet
    rect(ctx, 15, 6, 2, 5, '#D4A843');
    rect(ctx, 14, 6, 4, 1, '#C9A648');
    px(ctx, 15, 11, '#B8942E');

    // Faucet handles
    px(ctx, 13, 7, '#D4A843');
    px(ctx, 18, 7, '#D4A843');

    // Legs
    rect(ctx, 5, 29, 2, 3, '#4A1E0A');
    rect(ctx, 25, 29, 2, 3, '#4A1E0A');

    c.refresh();
  }

  // interior-towel-rack — 32×32, gold towel rack with white towels
  {
    const c = scene.textures.createCanvas('interior-towel-rack', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Wall mount plates — gold
    rect(ctx, 5, 8, 3, 4, '#D4A843');
    rect(ctx, 24, 8, 3, 4, '#D4A843');

    // Top bar — gold
    rect(ctx, 5, 10, 22, 2, '#D4A843');
    rect(ctx, 6, 10, 20, 1, '#C9A648');

    // Towel 1 — white, draped over bar
    rect(ctx, 7, 11, 8, 2, '#FFFFFF');
    rect(ctx, 6, 13, 10, 12, '#FFFFFF');
    rect(ctx, 7, 14, 8, 10, '#F5F0E8');
    rect(ctx, 8, 15, 6, 2, '#EDE8DF');

    // Towel 2 — white, draped over bar
    rect(ctx, 17, 11, 8, 2, '#FFFFFF');
    rect(ctx, 16, 13, 10, 10, '#FFFFFF');
    rect(ctx, 17, 14, 8, 8, '#F5F0E8');
    rect(ctx, 18, 15, 6, 2, '#EDE8DF');

    // Gold trim on towels
    rect(ctx, 6, 24, 10, 1, '#D4A843');
    rect(ctx, 16, 22, 10, 1, '#D4A843');

    // Bottom bar — gold
    rect(ctx, 5, 26, 22, 2, '#D4A843');
    rect(ctx, 24, 12, 3, 16, '#B8942E');
    rect(ctx, 5, 12, 3, 16, '#B8942E');

    c.refresh();
  }

  // interior-staircase — 32×32, spiral staircase with ornate railing, marble steps
  {
    const c = scene.textures.createCanvas('interior-staircase', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Central pole — gold
    rect(ctx, 15, 0, 2, 32, '#D4A843');
    rect(ctx, 15, 0, 1, 32, '#C9A648');

    // Steps — marble, spiraling down
    // Step 1 (top)
    rect(ctx, 16, 2, 12, 3, '#F5F0E8');
    rect(ctx, 17, 2, 10, 1, '#EDE8DF');
    rect(ctx, 16, 4, 12, 1, '#D8D3CB');

    // Step 2
    rect(ctx, 18, 7, 10, 3, '#F5F0E8');
    rect(ctx, 19, 7, 8, 1, '#EDE8DF');
    rect(ctx, 18, 9, 10, 1, '#D8D3CB');

    // Step 3
    rect(ctx, 16, 12, 12, 3, '#F5F0E8');
    rect(ctx, 17, 12, 10, 1, '#EDE8DF');
    rect(ctx, 16, 14, 12, 1, '#D8D3CB');

    // Step 4
    rect(ctx, 4, 17, 12, 3, '#F5F0E8');
    rect(ctx, 5, 17, 10, 1, '#EDE8DF');
    rect(ctx, 4, 19, 12, 1, '#D8D3CB');

    // Step 5
    rect(ctx, 4, 22, 12, 3, '#F5F0E8');
    rect(ctx, 5, 22, 10, 1, '#EDE8DF');
    rect(ctx, 4, 24, 12, 1, '#D8D3CB');

    // Step 6 (bottom)
    rect(ctx, 4, 27, 14, 3, '#F5F0E8');
    rect(ctx, 5, 27, 12, 1, '#EDE8DF');
    rect(ctx, 4, 29, 14, 1, '#D8D3CB');

    // Railing — gold ornate
    px(ctx, 27, 1, '#D4A843');
    rect(ctx, 27, 2, 1, 3, '#B8942E');
    px(ctx, 27, 6, '#D4A843');
    rect(ctx, 27, 7, 1, 3, '#B8942E');
    px(ctx, 27, 11, '#D4A843');
    rect(ctx, 27, 12, 1, 3, '#B8942E');
    px(ctx, 4, 16, '#D4A843');
    rect(ctx, 4, 17, 1, 3, '#B8942E');
    px(ctx, 4, 21, '#D4A843');
    rect(ctx, 4, 22, 1, 3, '#B8942E');
    px(ctx, 4, 26, '#D4A843');

    // Top finial
    circle(ctx, 16, 0, 1, '#D4A843');

    c.refresh();
  }

  // interior-luggage-rack — 32×32, hotel luggage rack with suitcase on it
  {
    const c = scene.textures.createCanvas('interior-luggage-rack', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Rack legs — gold/brass X-shape
    // Left leg pair
    rect(ctx, 6, 20, 2, 12, '#B5A642');
    rect(ctx, 10, 20, 2, 12, '#B5A642');

    // Right leg pair
    rect(ctx, 20, 20, 2, 12, '#B5A642');
    rect(ctx, 24, 20, 2, 12, '#B5A642');

    // Cross braces
    rect(ctx, 8, 26, 16, 1, '#D4A843');

    // Rack straps/bars
    rect(ctx, 5, 18, 22, 2, '#4A1E0A');
    rect(ctx, 6, 18, 20, 1, '#5C2E14');
    rect(ctx, 5, 20, 22, 1, '#D4A843');

    // Suitcase on rack — burgundy
    rect(ctx, 6, 6, 20, 12, '#800020');
    rect(ctx, 7, 7, 18, 10, '#9A1030');

    // Suitcase handle
    rect(ctx, 14, 4, 4, 3, '#5C0018');
    rect(ctx, 15, 4, 2, 1, '#D4A843');

    // Suitcase trim
    rect(ctx, 6, 11, 20, 1, '#700018');
    rect(ctx, 6, 6, 20, 1, '#B8942E');

    // Gold clasps
    px(ctx, 12, 9, '#D4A843');
    px(ctx, 20, 9, '#D4A843');

    // Suitcase tag
    rect(ctx, 22, 8, 3, 4, '#FFF8E7');
    px(ctx, 23, 7, '#D4A843');

    c.refresh();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN EXPORT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// ── Indian restaurant mini-game textures ──────────────────────────────────

function generateCurryHuntTextures(scene: Phaser.Scene): void {
  // Curry bowl (32×32)
  {
    const c = scene.textures.createCanvas('curry-bowl', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Bowl
    rect(ctx, 6, 14, 20, 10, '#D2691E');
    rect(ctx, 8, 12, 16, 4, '#CD853F');
    // Curry filling
    rect(ctx, 9, 14, 14, 6, '#DAA520');
    rect(ctx, 10, 15, 12, 4, '#FF8C00');
    // Rice on the side
    rect(ctx, 20, 16, 4, 3, '#FFFFF0');
    rect(ctx, 21, 17, 3, 2, '#FAFAD2');
    // Steam wisps
    rect(ctx, 13, 10, 2, 3, 'rgba(255,255,255,0.5)');
    rect(ctx, 17, 8, 2, 4, 'rgba(255,255,255,0.4)');
    rect(ctx, 15, 9, 1, 3, 'rgba(255,255,255,0.3)');
    // Bowl rim
    rect(ctx, 5, 13, 22, 1, '#8B4513');
    rect(ctx, 6, 24, 20, 2, '#8B4513');
    // Bowl base
    rect(ctx, 10, 24, 12, 2, '#A0522D');
    c.refresh();
  }

  // Cover / dome (32×32)
  {
    const c = scene.textures.createCanvas('curry-cover', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Dome body (silver cloche)
    rect(ctx, 6, 12, 20, 14, '#C0C0C0');
    rect(ctx, 8, 8, 16, 6, '#D3D3D3');
    rect(ctx, 10, 6, 12, 4, '#DCDCDC');
    rect(ctx, 12, 4, 8, 3, '#E8E8E8');
    // Knob on top
    rect(ctx, 14, 2, 4, 3, '#FFD700');
    rect(ctx, 15, 1, 2, 2, '#DAA520');
    // Base rim
    rect(ctx, 4, 26, 24, 2, '#A9A9A9');
    rect(ctx, 5, 25, 22, 1, '#B8B8B8');
    // Highlight (shine)
    rect(ctx, 10, 8, 2, 8, 'rgba(255,255,255,0.4)');
    rect(ctx, 11, 10, 1, 5, 'rgba(255,255,255,0.3)');
    // Shadow on right side
    rect(ctx, 22, 12, 3, 12, 'rgba(0,0,0,0.15)');
    c.refresh();
  }

  // Indian waiter NPC (48×48)
  {
    const c = scene.textures.createCanvas('npc-indian-waiter', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#C68642',
      hair: '#1a1a1a',
      top: '#FFFFFF',     // white chef coat
      pants: '#2F2F2F',
      shoes: '#1a1a1a',
      detail: (dCtx: Ctx) => {
        // Chef hat / toque
        rect(dCtx, 17, 0, 14, 5, '#FFFFFF');
        rect(dCtx, 19, -2, 10, 3, '#FFFFFF');
        // Apron
        rect(dCtx, 16, 28, 16, 8, '#F5F5F5');
        rect(dCtx, 18, 28, 12, 1, '#DDD');
        // Mustache
        rect(dCtx, 19, 15, 4, 1, '#1a1a1a');
        rect(dCtx, 25, 15, 4, 1, '#1a1a1a');
      },
    });
    c.refresh();
  }

  // building-bp-indian-restaurant — 128×96, Indian restaurant exterior
  {
    const c = scene.textures.createCanvas('building-bp-indian-restaurant', 128, 96);
    if (!c) return;
    const ctx = c.context;
    const wall = '#D4A050'; // warm saffron/ochre wall
    const trim = '#8B1A1A'; // deep red trim (Indian aesthetic)

    // Main building
    rect(ctx, 4, 12, 120, 78, wall);
    // Roof with decorative scalloped edge
    rect(ctx, 2, 8, 124, 6, trim);
    for (let i = 0; i < 15; i++) {
      circle(ctx, 6 + i * 8, 14, 3, trim);
    }

    // Ground floor
    rect(ctx, 10, 54, 108, 36, darken(wall, 0.06));

    // Large front windows with arch tops
    rect(ctx, 14, 58, 30, 20, '#8ABACC');
    rect(ctx, 19, 55, 20, 3, '#8ABACC'); // arch
    rect(ctx, 84, 58, 30, 20, '#8ABACC');
    rect(ctx, 89, 55, 20, 3, '#8ABACC'); // arch

    // Door — ornate
    rect(ctx, 52, 56, 24, 34, trim);
    rect(ctx, 54, 58, 20, 32, '#3A2A1A');
    rect(ctx, 54, 58, 20, 1, '#FFD700'); // gold trim
    px(ctx, 72, 74, '#FFD700'); // door handle

    // Awning — saffron and green stripes (Indian flag colors)
    for (let x = 10; x < 118; x++) {
      const seg = Math.floor((x - 10) / 8) % 3;
      const color = seg === 0 ? '#FF9933' : seg === 1 ? '#FFFFFF' : '#138808';
      rect(ctx, x, 52, 1, 4, color);
    }

    // "CURRY" sign in gold
    // C
    rect(ctx, 30, 42, 6, 8, '#FFD700');
    rect(ctx, 32, 44, 4, 4, wall);
    // U
    rect(ctx, 38, 42, 2, 8, '#FFD700');
    rect(ctx, 42, 42, 2, 8, '#FFD700');
    rect(ctx, 38, 48, 6, 2, '#FFD700');
    // R
    rect(ctx, 46, 42, 6, 8, '#FFD700');
    rect(ctx, 48, 44, 2, 2, wall);
    rect(ctx, 50, 46, 2, 4, '#FFD700');
    // R
    rect(ctx, 54, 42, 6, 8, '#FFD700');
    rect(ctx, 56, 44, 2, 2, wall);
    rect(ctx, 58, 46, 2, 4, '#FFD700');
    // Y
    rect(ctx, 62, 42, 2, 4, '#FFD700');
    rect(ctx, 66, 42, 2, 4, '#FFD700');
    rect(ctx, 63, 46, 4, 4, '#FFD700');

    // Decorative paisley/mandala dots on facade
    const dotColor = '#FFD700';
    circle(ctx, 20, 30, 2, dotColor);
    circle(ctx, 64, 30, 2, dotColor);
    circle(ctx, 108, 30, 2, dotColor);
    circle(ctx, 42, 28, 1, dotColor);
    circle(ctx, 86, 28, 1, dotColor);

    // Upper floor windows with arched tops
    for (let col = 0; col < 4; col++) {
      const wx = 16 + col * 28;
      rect(ctx, wx, 18, 12, 14, '#7A8A9A');
      rect(ctx, wx + 2, 16, 8, 3, '#7A8A9A'); // arch
    }

    // Small dome/cupola on roof center
    rect(ctx, 56, 2, 16, 8, trim);
    circle(ctx, 64, 2, 6, trim);
    circle(ctx, 64, 0, 2, '#FFD700'); // gold finial

    c.refresh();
  }
}

function generateMinigameTextures(scene: Phaser.Scene): void {
  // Lángos plate (72×48)
  {
    const c = scene.textures.createCanvas('langos-plate', 72, 48);
    if (!c) return;
    const ctx = c.context;
    // Plate
    circle(ctx, 36, 28, 22, '#E8D8B0');
    circle(ctx, 36, 28, 20, '#F5E6C8');
    // Lángos dough
    circle(ctx, 36, 26, 16, '#D4A040');
    circle(ctx, 36, 26, 14, '#DAA520');
    c.refresh();
  }

  // Topping sprites (28×28 each)
  const toppings: Array<{ key: string; color: string; accent?: string }> = [
    { key: 'langos-sour-cream', color: '#FFFDD0', accent: '#F5F5DC' },
    { key: 'langos-cheese', color: '#FFD700', accent: '#DAA520' },
    { key: 'langos-garlic', color: '#F5F5DC', accent: '#DDD' },
    { key: 'langos-ketchup', color: '#CC2222', accent: '#AA1111' },
    { key: 'langos-rock', color: '#888888', accent: '#666666' },
    { key: 'langos-shoe', color: '#3A2A1A', accent: '#222' },
  ];

  toppings.forEach(t => {
    const c = scene.textures.createCanvas(t.key, 28, 28);
    if (!c) return;
    const ctx = c.context;
    circle(ctx, 14, 14, 10, t.color);
    circle(ctx, 14, 12, 6, t.accent || t.color);
    c.refresh();
  });
}

export function generateBudapestTextures(scene: Phaser.Scene): void {
  generateBudapestTerrain(scene);
  generateBudapestNPCs(scene);
  generateBudapestVehicles(scene);
  generateBudapestBuildings(scene);
  generateBudapestDecorations(scene);
  generateBudapestCutsceneSprites(scene);
  generateCurryHuntTextures(scene);
  generateMinigameTextures(scene);
  generateBudapestAirbnbInteriors(scene);
}
