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
  const c = scene.textures.createCanvas('maui-terrain', 288, 32);
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

  // Index 6 — Road
  {
    const ox = 192;
    const rng = seededRandom(700);
    rect(ctx, ox, 0, 32, 32, '#444444');
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#3a3a3a' : '#4e4e4e');
    }
    for (let x = 2; x < 32; x += 8) {
      rect(ctx, ox + x, 15, 5, 2, '#FFD700');
    }
  }

  // Index 7 — ParkingLot
  {
    const ox = 224;
    const rng = seededRandom(800);
    rect(ctx, ox, 0, 32, 32, '#666666');
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#5a5a5a' : '#707070');
    }
    rect(ctx, ox + 30, 0, 2, 32, '#CCCCCC');
  }

  // Index 8 — Sidewalk
  {
    const ox = 256;
    const rng = seededRandom(900);
    rect(ctx, ox, 0, 32, 32, '#BBBBBB');
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#AAAAAA' : '#CCCCCC');
    }
    for (let y = 10; y < 22; y++) {
      px(ctx, ox + 16 + (y % 3 === 0 ? 1 : 0), y, '#999999');
    }
  }

  c.refresh();

  // Register frames for tile rendering
  const texture = scene.textures.get('maui-terrain');
  texture.add(0, 0, 0, 0, 32, 32);     // Sand
  texture.add(1, 0, 32, 0, 32, 32);    // SandStone
  texture.add(2, 0, 64, 0, 32, 32);    // Stone
  texture.add(3, 0, 96, 0, 32, 32);    // ShallowWater
  texture.add(4, 0, 128, 0, 32, 32);   // Ocean
  texture.add(5, 0, 160, 0, 32, 32);   // Grass
  texture.add(6, 0, 192, 0, 32, 32);   // Road
  texture.add(7, 0, 224, 0, 32, 32);   // ParkingLot
  texture.add(8, 0, 256, 0, 32, 32);   // Sidewalk
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

  // npc-maui-restaurant — Dark-haired person with white apron
  {
    const c = scene.textures.createCanvas('npc-maui-restaurant', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D2A679', hair: '#222222', top: '#FFFFFF', pants: '#333333',
      detail: (ctx) => {
        // Apron strings tied at back
        rect(ctx, 18, 25, 1, 8, '#DDDDDD');
        rect(ctx, 29, 25, 1, 8, '#DDDDDD');
        // Apron waist tie
        rect(ctx, 18, 25, 12, 1, '#DDDDDD');
        // Food stain on apron
        rect(ctx, 22, 28, 2, 2, '#CC6633');
        px(ctx, 25, 30, '#CC6633');
      },
    });
    c.refresh();
  }

  // npc-maui-greeter — Person in aloha shirt
  {
    const c = scene.textures.createCanvas('npc-maui-greeter', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#B87333', hair: '#333333', top: '#FF6347', pants: '#C4A265',
      detail: (ctx) => {
        // Floral pattern dots on shirt (yellow, white)
        px(ctx, 16, 22, '#FFD700');
        px(ctx, 20, 25, '#FFFFFF');
        px(ctx, 18, 28, '#FFD700');
        px(ctx, 24, 23, '#FFFFFF');
        px(ctx, 28, 26, '#FFD700');
        px(ctx, 22, 31, '#FFFFFF');
        px(ctx, 30, 29, '#FFD700');
        px(ctx, 26, 33, '#FFFFFF');
        // Dots on arms
        px(ctx, 11, 27, '#FFD700');
        px(ctx, 35, 28, '#FFFFFF');
      },
    });
    c.refresh();
  }

  // npc-maui-tourist — Casual vacation outfit with hat
  {
    const c = scene.textures.createCanvas('npc-maui-tourist', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#F5DEB3', hair: '#AA8844', top: '#87CEEB', pants: '#F0E68C',
      detail: (ctx) => {
        // Wide hat above head
        rect(ctx, 12, 1, 24, 3, '#C4A265');
        rect(ctx, 16, 0, 16, 1, '#C4A265');
        rect(ctx, 18, 3, 12, 2, darken('#C4A265', 0.1));
        // Sunglasses on face
        rect(ctx, 19, 11, 4, 3, '#222222');
        rect(ctx, 25, 11, 4, 3, '#222222');
        rect(ctx, 23, 12, 2, 1, '#222222');
      },
    });
    c.refresh();
  }

  // npc-lifeguard — Red shorts, no shirt, red cross armband
  {
    const c = scene.textures.createCanvas('npc-lifeguard', 48, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#D2A679';
    drawNPCBase(ctx, {
      skin, hair: '#AA6633', top: skin, pants: '#CC3333',
      shoes: '#886644',
      detail: (ctx) => {
        // Wider torso (shirtless detail)
        rect(ctx, 12, 20, 2, 14, skin);
        rect(ctx, 34, 20, 2, 14, skin);
        // Chest definition
        rect(ctx, 20, 22, 8, 1, darken(skin, 0.08));
        rect(ctx, 23, 23, 2, 4, darken(skin, 0.06));
        // Red cross armband on left arm
        rect(ctx, 10, 26, 4, 4, '#CC3333');
        rect(ctx, 11, 27, 2, 1, '#FFFFFF');
        px(ctx, 11, 26, '#FFFFFF');
        px(ctx, 11, 28, '#FFFFFF');
        // Shorts waistband
        rect(ctx, 14, 34, 20, 1, darken('#CC3333', 0.2));
      },
    });
    c.refresh();
  }

  // npc-beach-bar — Hawaiian shirt, holding a colored drink
  {
    const c = scene.textures.createCanvas('npc-beach-bar', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#B87333', hair: '#222222', top: '#FF6347', pants: '#C4A265',
      shoes: '#886644',
      detail: (ctx) => {
        // Hawaiian shirt floral pattern
        px(ctx, 16, 22, '#FFD700');
        px(ctx, 20, 25, '#FFFFFF');
        px(ctx, 24, 22, '#FFD700');
        px(ctx, 28, 26, '#FFFFFF');
        px(ctx, 18, 29, '#FFD700');
        px(ctx, 22, 31, '#FFFFFF');
        // Drink in right hand — colored block
        rect(ctx, 35, 30, 4, 6, '#FF8C00');
        rect(ctx, 35, 30, 4, 1, '#FFDD44');
        // Tiny straw
        rect(ctx, 37, 28, 1, 3, '#FFFFFF');
      },
    });
    c.refresh();
  }

  // npc-sandcastle-kid — Bright clothes, bucket detail
  {
    const c = scene.textures.createCanvas('npc-sandcastle-kid', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#F5DEB3', hair: '#FFD700', top: '#FF69B4', pants: '#4488CC',
      shoes: '#886644',
      detail: (ctx) => {
        // Bucket in left hand
        rect(ctx, 6, 32, 5, 5, '#FF4444');
        rect(ctx, 6, 31, 5, 1, '#CC3333');
        // Handle on bucket
        rect(ctx, 7, 30, 3, 1, '#888888');
      },
    });
    c.refresh();
  }

  // npc-maui-frontdesk — Hotel uniform
  {
    const c = scene.textures.createCanvas('npc-maui-frontdesk', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D2A679', hair: '#222222', top: '#2C3E50', pants: '#2C3E50',
      detail: (ctx) => {
        // Name badge rectangle on chest
        rect(ctx, 20, 22, 8, 4, '#FFFFFF');
        rect(ctx, 21, 23, 6, 2, '#333333');
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

  // deco-wave-foam — 32×8 (semi-transparent white foam line)
  {
    const c = scene.textures.createCanvas('deco-wave-foam', 32, 8);
    if (!c) return;
    const ctx = c.context;
    ctx.globalAlpha = 0.6;
    // Curved foam line
    for (let x = 0; x < 32; x++) {
      const y = Math.round(3 + Math.sin(x * 0.3) * 2);
      rect(ctx, x, y, 1, 2, '#FFFFFF');
      if (x % 3 === 0) px(ctx, x, y - 1, '#E8F4FF');
    }
    ctx.globalAlpha = 1.0;
    c.refresh();
  }

  // deco-sandcastle — 32×32
  {
    const c = scene.textures.createCanvas('deco-sandcastle', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const tan = '#D2B48C';
    const brown = '#A0522D';
    // Base mound
    rect(ctx, 4, 20, 24, 12, tan);
    rect(ctx, 6, 18, 20, 2, tan);
    // Main tower
    rect(ctx, 10, 8, 12, 12, tan);
    // Battlement top
    rect(ctx, 10, 6, 3, 4, tan);
    rect(ctx, 15, 6, 3, 4, tan);
    rect(ctx, 19, 6, 3, 4, tan);
    // Door
    rect(ctx, 14, 14, 4, 6, brown);
    // Red flag on top
    rect(ctx, 16, 1, 1, 6, brown);
    rect(ctx, 17, 1, 4, 3, '#CC3333');
    // Sandy texture
    for (let i = 0; i < 10; i++) {
      px(ctx, 8 + (i * 3) % 16, 22 + (i * 7) % 8, darken(tan, 0.1));
    }
    c.refresh();
  }

  // deco-beach-chair — 32×32
  {
    const c = scene.textures.createCanvas('deco-beach-chair', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const wood = '#A0522D';
    const fabric = '#4488CC';
    // Back legs (angled)
    rect(ctx, 6, 4, 2, 24, wood);
    rect(ctx, 24, 4, 2, 24, wood);
    // Front legs
    rect(ctx, 10, 16, 2, 16, wood);
    rect(ctx, 20, 16, 2, 16, wood);
    // Seat frame
    rect(ctx, 6, 16, 20, 2, wood);
    // Fabric back
    rect(ctx, 8, 6, 16, 10, fabric);
    rect(ctx, 8, 10, 16, 1, lighten(fabric, 0.15));
    // Fabric seat
    rect(ctx, 10, 18, 12, 4, fabric);
    c.refresh();
  }

  // deco-volleyball-net — 96×48
  {
    const c = scene.textures.createCanvas('deco-volleyball-net', 96, 48);
    if (!c) return;
    const ctx = c.context;
    const pole = '#8B4513';
    // Left pole
    rect(ctx, 4, 4, 3, 40, pole);
    // Right pole
    rect(ctx, 89, 4, 3, 40, pole);
    // Net — horizontal lines
    for (let y = 8; y < 32; y += 4) {
      rect(ctx, 7, y, 82, 1, '#FFFFFF');
    }
    // Net — vertical lines
    for (let x = 7; x < 89; x += 6) {
      rect(ctx, x, 8, 1, 24, '#FFFFFF');
    }
    // Top rope
    rect(ctx, 4, 6, 88, 2, '#DDDDDD');
    c.refresh();
  }

  // deco-beach-shack — 64×48
  {
    const c = scene.textures.createCanvas('deco-beach-shack', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const wood = '#A0522D';
    // Thatched roof
    for (let y = 0; y < 18; y++) {
      const indent = Math.max(0, Math.floor((18 - y) * 0.3));
      rect(ctx, indent, y, 64 - indent * 2, 1, y % 3 === 0 ? '#B8860B' : '#DAA520');
    }
    // Walls
    rect(ctx, 4, 18, 56, 26, wood);
    // Wall planks
    for (let y = 20; y < 44; y += 4) {
      rect(ctx, 4, y, 56, 1, darken(wood, 0.12));
    }
    // Counter opening
    rect(ctx, 12, 28, 40, 16, darken(wood, 0.3));
    // Counter surface
    rect(ctx, 12, 36, 40, 3, lighten(wood, 0.15));
    // "BAR" text
    const tc = '#FFFFFF';
    // B
    rect(ctx, 22, 20, 2, 6, tc);
    rect(ctx, 24, 20, 2, 2, tc);
    rect(ctx, 24, 22, 2, 2, tc);
    rect(ctx, 24, 24, 2, 2, tc);
    // A
    rect(ctx, 28, 22, 2, 4, tc);
    rect(ctx, 32, 22, 2, 4, tc);
    rect(ctx, 30, 20, 2, 2, tc);
    rect(ctx, 28, 23, 6, 1, tc);
    // R
    rect(ctx, 36, 20, 2, 6, tc);
    rect(ctx, 38, 20, 2, 2, tc);
    rect(ctx, 40, 20, 2, 3, tc);
    rect(ctx, 38, 22, 2, 1, tc);
    rect(ctx, 39, 23, 3, 3, tc);
    c.refresh();
  }

  // deco-shell — 16×16
  {
    const c = scene.textures.createCanvas('deco-shell', 16, 16);
    if (!c) return;
    const ctx = c.context;
    // Spiral shell shape
    circle(ctx, 8, 8, 5, '#FFCCCC');
    circle(ctx, 8, 8, 3, '#FFE4E1');
    circle(ctx, 7, 7, 1, '#FFF0F0');
    // Spiral ridge lines
    px(ctx, 10, 5, '#DDA0A0');
    px(ctx, 11, 7, '#DDA0A0');
    px(ctx, 10, 10, '#DDA0A0');
    px(ctx, 6, 11, '#DDA0A0');
    c.refresh();
  }

  // deco-lifeguard-tower — 32×64
  {
    const c = scene.textures.createCanvas('deco-lifeguard-tower', 32, 64);
    if (!c) return;
    const ctx = c.context;
    const wood = '#A0522D';
    // Four legs
    rect(ctx, 4, 30, 3, 34, wood);
    rect(ctx, 25, 30, 3, 34, wood);
    // Cross braces
    for (let i = 0; i < 6; i++) {
      const y = 34 + i * 5;
      px(ctx, 7 + i * 3, y, wood);
      px(ctx, 24 - i * 3, y, wood);
    }
    // Platform
    rect(ctx, 2, 28, 28, 3, wood);
    // Cabin
    rect(ctx, 4, 10, 24, 18, lighten(wood, 0.1));
    // Roof
    rect(ctx, 2, 6, 28, 5, '#CC3333');
    rect(ctx, 4, 4, 24, 3, '#CC3333');
    // Window opening
    rect(ctx, 8, 14, 16, 8, '#AADDFF');
    // Window frame
    rect(ctx, 15, 14, 2, 8, wood);
    // Red flag on top
    rect(ctx, 15, 0, 1, 5, wood);
    rect(ctx, 16, 0, 6, 3, '#CC3333');
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

  // deco-maui-jacuzzi — 64×64 (2x2 tiles)
  {
    const c = scene.textures.createCanvas('deco-maui-jacuzzi', 64, 64);
    if (!c) return;
    const ctx = c.context;
    // Wooden rim (outer circle)
    circle(ctx, 32, 32, 28, '#A0522D');
    circle(ctx, 32, 32, 25, darken('#A0522D', 0.1));
    // Water surface
    circle(ctx, 32, 32, 22, '#5DADE2');
    // Bubble highlights
    const bubbles = [[24,26],[36,22],[28,38],[40,34],[20,34],[32,28],[38,40]];
    bubbles.forEach(([bx,by]) => {
      circle(ctx, bx, by, 2, lighten('#5DADE2', 0.25));
      px(ctx, bx-1, by-1, '#FFFFFF');
    });
    c.refresh();
  }

  // deco-maui-tenniscourt — 128×128 (4x4 tiles)
  {
    const c = scene.textures.createCanvas('deco-maui-tenniscourt', 128, 128);
    if (!c) return;
    const ctx = c.context;
    // Court surface
    rect(ctx, 0, 0, 128, 128, '#2E7D32');
    // Outer boundary lines
    rect(ctx, 4, 4, 120, 2, '#FFFFFF');     // top
    rect(ctx, 4, 122, 120, 2, '#FFFFFF');   // bottom
    rect(ctx, 4, 4, 2, 120, '#FFFFFF');     // left
    rect(ctx, 122, 4, 2, 120, '#FFFFFF');   // right
    // Center net line
    rect(ctx, 4, 63, 120, 2, '#FFFFFF');
    // Service lines
    rect(ctx, 20, 4, 2, 120, '#FFFFFF');
    rect(ctx, 106, 4, 2, 120, '#FFFFFF');
    // Center mark
    rect(ctx, 63, 4, 2, 30, '#FFFFFF');
    rect(ctx, 63, 94, 2, 30, '#FFFFFF');
    c.refresh();
  }

  // deco-maui-parkedcar — 32×32 (1x1 tile, top-down view)
  {
    // Create 1 parked car texture — gray car, top-down view
    const c = scene.textures.createCanvas('deco-maui-parkedcar', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Car body
    rect(ctx, 6, 4, 20, 24, '#888888');
    // Roof slightly inset
    rect(ctx, 8, 8, 16, 12, '#777777');
    // Windshield (front)
    rect(ctx, 9, 5, 14, 4, '#AADDFF');
    // Rear window
    rect(ctx, 9, 23, 14, 3, '#AADDFF');
    // Wheels
    rect(ctx, 4, 7, 3, 5, '#333333');
    rect(ctx, 25, 7, 3, 5, '#333333');
    rect(ctx, 4, 20, 3, 5, '#333333');
    rect(ctx, 25, 20, 3, 5, '#333333');
    c.refresh();
  }
}

// ── Buildings ───────────────────────────────────────────────────────────

function generateMauiBuildings(scene: Phaser.Scene): void {
  // building-maui-hotel — 256×160 (8x5 tiles)
  {
    const c = scene.textures.createCanvas('building-maui-hotel', 256, 160);
    if (!c) return;
    const ctx = c.context;
    const wallColor = '#D4C5A0';
    const roofColor = '#888888';
    const windowColor = '#AADDFF';
    const frameColor = '#8B7355';
    const doorColor = '#5C3317';

    // Main walls
    rect(ctx, 0, 16, 256, 144, wallColor);

    // Flat gray roof
    rect(ctx, 0, 0, 256, 20, roofColor);
    rect(ctx, 0, 18, 256, 2, darken(roofColor, 0.15));

    // Grid of windows: 4 columns x 3 rows
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = 24 + col * 58;
        const wy = 30 + row * 34;
        // Window frame
        rect(ctx, wx - 1, wy - 1, 22, 18, frameColor);
        // Window glass
        rect(ctx, wx, wy, 20, 16, windowColor);
        // Cross divider
        rect(ctx, wx + 9, wy, 2, 16, frameColor);
        rect(ctx, wx, wy + 7, 20, 2, frameColor);
      }
    }

    // "HOTEL" pixel text on top area
    const textY = 6;
    const tc = '#2C3E50';
    // H
    rect(ctx, 96, textY, 2, 8, tc);
    rect(ctx, 102, textY, 2, 8, tc);
    rect(ctx, 98, textY + 3, 4, 2, tc);
    // O
    rect(ctx, 106, textY, 2, 8, tc);
    rect(ctx, 112, textY, 2, 8, tc);
    rect(ctx, 108, textY, 4, 2, tc);
    rect(ctx, 108, textY + 6, 4, 2, tc);
    // T
    rect(ctx, 116, textY, 8, 2, tc);
    rect(ctx, 119, textY, 2, 8, tc);
    // E
    rect(ctx, 126, textY, 2, 8, tc);
    rect(ctx, 128, textY, 6, 2, tc);
    rect(ctx, 128, textY + 3, 4, 2, tc);
    rect(ctx, 128, textY + 6, 6, 2, tc);
    // L
    rect(ctx, 136, textY, 2, 8, tc);
    rect(ctx, 138, textY + 6, 6, 2, tc);

    // Wide entrance door at bottom center (double door)
    const doorX = 108;
    const doorY = 126;
    rect(ctx, doorX, doorY, 40, 34, doorColor);
    // Door divider
    rect(ctx, doorX + 19, doorY, 2, 34, darken(doorColor, 0.2));
    // Door handles
    rect(ctx, doorX + 14, doorY + 16, 2, 3, '#FFD700');
    rect(ctx, doorX + 24, doorY + 16, 2, 3, '#FFD700');
    // Door frame
    rect(ctx, doorX - 2, doorY, 2, 34, frameColor);
    rect(ctx, doorX + 40, doorY, 2, 34, frameColor);
    rect(ctx, doorX - 2, doorY - 2, 44, 2, frameColor);

    // Foundation strip at bottom
    rect(ctx, 0, 152, 256, 8, '#777777');

    c.refresh();
  }

  // building-maui-restaurant — 160×96 (5x3 tiles)
  {
    const c = scene.textures.createCanvas('building-maui-restaurant', 160, 96);
    if (!c) return;
    const ctx = c.context;
    const wallColor = '#CC6B3B';
    const roofColor = darken(wallColor, 0.25);
    const windowColor = '#AADDFF';
    const frameColor = '#5C3317';

    // Terracotta walls
    rect(ctx, 0, 24, 160, 72, wallColor);

    // Sloped darker roof
    for (let y = 0; y < 28; y++) {
      const indent = Math.max(0, Math.floor((28 - y) * 0.4));
      rect(ctx, indent, y, 160 - indent * 2, 1, y % 3 === 0 ? darken(roofColor, 0.1) : roofColor);
    }
    // Roof edge
    rect(ctx, 0, 26, 160, 2, darken(roofColor, 0.2));

    // "CURRY HOUSE" pixel text
    const textY = 30;
    const tc = '#FFFFFF';
    // C
    rect(ctx, 30, textY, 2, 6, tc);
    rect(ctx, 32, textY, 4, 2, tc);
    rect(ctx, 32, textY + 4, 4, 2, tc);
    // U
    rect(ctx, 38, textY, 2, 6, tc);
    rect(ctx, 44, textY, 2, 6, tc);
    rect(ctx, 40, textY + 4, 4, 2, tc);
    // R
    rect(ctx, 48, textY, 2, 6, tc);
    rect(ctx, 50, textY, 4, 2, tc);
    rect(ctx, 54, textY, 2, 3, tc);
    rect(ctx, 50, textY + 2, 4, 2, tc);
    rect(ctx, 53, textY + 4, 3, 2, tc);
    // R
    rect(ctx, 58, textY, 2, 6, tc);
    rect(ctx, 60, textY, 4, 2, tc);
    rect(ctx, 64, textY, 2, 3, tc);
    rect(ctx, 60, textY + 2, 4, 2, tc);
    rect(ctx, 63, textY + 4, 3, 2, tc);
    // Y
    rect(ctx, 68, textY, 2, 3, tc);
    rect(ctx, 74, textY, 2, 3, tc);
    rect(ctx, 70, textY + 2, 4, 2, tc);
    rect(ctx, 71, textY + 4, 2, 2, tc);

    // H
    rect(ctx, 82, textY, 2, 6, tc);
    rect(ctx, 88, textY, 2, 6, tc);
    rect(ctx, 84, textY + 2, 4, 2, tc);
    // O
    rect(ctx, 92, textY, 2, 6, tc);
    rect(ctx, 98, textY, 2, 6, tc);
    rect(ctx, 94, textY, 4, 2, tc);
    rect(ctx, 94, textY + 4, 4, 2, tc);
    // U
    rect(ctx, 102, textY, 2, 6, tc);
    rect(ctx, 108, textY, 2, 6, tc);
    rect(ctx, 104, textY + 4, 4, 2, tc);
    // S
    rect(ctx, 112, textY, 6, 2, tc);
    rect(ctx, 112, textY, 2, 3, tc);
    rect(ctx, 112, textY + 2, 6, 2, tc);
    rect(ctx, 116, textY + 3, 2, 3, tc);
    rect(ctx, 112, textY + 4, 6, 2, tc);
    // E
    rect(ctx, 120, textY, 2, 6, tc);
    rect(ctx, 122, textY, 4, 2, tc);
    rect(ctx, 122, textY + 2, 3, 2, tc);
    rect(ctx, 122, textY + 4, 4, 2, tc);

    // Window on left side
    rect(ctx, 16, 50, 24, 18, windowColor);
    rect(ctx, 15, 49, 26, 1, frameColor);
    rect(ctx, 15, 68, 26, 1, frameColor);
    rect(ctx, 15, 49, 1, 20, frameColor);
    rect(ctx, 41, 49, 1, 20, frameColor);
    rect(ctx, 27, 50, 1, 18, frameColor);

    // Window on right side
    rect(ctx, 120, 50, 24, 18, windowColor);
    rect(ctx, 119, 49, 26, 1, frameColor);
    rect(ctx, 119, 68, 26, 1, frameColor);
    rect(ctx, 119, 49, 1, 20, frameColor);
    rect(ctx, 145, 49, 1, 20, frameColor);
    rect(ctx, 131, 50, 1, 18, frameColor);

    // Doorway at bottom center
    rect(ctx, 64, 58, 32, 38, darken(wallColor, 0.35));
    // Door frame
    rect(ctx, 62, 56, 2, 40, frameColor);
    rect(ctx, 96, 56, 2, 40, frameColor);
    rect(ctx, 62, 56, 36, 2, frameColor);

    // Awning over entrance
    for (let y = 0; y < 8; y++) {
      rect(ctx, 56 - y, 48 + y, 48 + y * 2, 1, y % 2 === 0 ? '#CC3333' : '#FFEECC');
    }

    c.refresh();
  }
}

// ── Driving cars (side view) ────────────────────────────────────────────

function generateMauiCars(scene: Phaser.Scene): void {
  const carConfigs: Array<{ key: string; bodyColor: string }> = [
    { key: 'car-red', bodyColor: '#CC3333' },
    { key: 'car-blue', bodyColor: '#3366CC' },
    { key: 'car-white', bodyColor: '#EEEEEE' },
  ];

  for (const { key, bodyColor } of carConfigs) {
    const c = scene.textures.createCanvas(key, 48, 32);
    if (!c) return;
    const ctx = c.context;
    // Body
    rect(ctx, 4, 12, 40, 14, bodyColor);
    // Roof (slightly inset, darker)
    rect(ctx, 12, 6, 22, 8, darken(bodyColor, 0.1));
    // Windshield
    rect(ctx, 10, 7, 6, 6, '#AADDFF');
    // Rear window
    rect(ctx, 32, 7, 6, 6, '#AADDFF');
    // Wheels
    circle(ctx, 12, 26, 4, '#333333');
    circle(ctx, 36, 26, 4, '#333333');
    // Wheel rims
    circle(ctx, 12, 26, 2, '#888888');
    circle(ctx, 36, 26, 2, '#888888');
    // Headlight
    rect(ctx, 42, 15, 3, 3, '#FFFF88');
    // Taillight
    rect(ctx, 3, 15, 3, 3, '#FF4444');
    c.refresh();
  }
}

// ── Hotel interior furniture ────────────────────────────────────────────

function generateHotelInteriorTextures(scene: Phaser.Scene): void {
  // interior-kitchen-counter — 32×32
  {
    const c = scene.textures.createCanvas('interior-kitchen-counter', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const wood = '#8B6914';
    rect(ctx, 0, 0, 32, 32, wood);
    rect(ctx, 0, 28, 32, 4, darken(wood, 0.2));
    // Surface grain
    for (let x = 2; x < 30; x += 6) {
      rect(ctx, x, 2, 1, 24, darken(wood, 0.08));
    }
    c.refresh();
  }

  // interior-sink — 32×32
  {
    const c = scene.textures.createCanvas('interior-sink', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const counter = '#8B6914';
    rect(ctx, 0, 0, 32, 32, counter);
    rect(ctx, 0, 28, 32, 4, darken(counter, 0.2));
    // Oval basin
    circle(ctx, 16, 14, 8, '#AAAAAA');
    circle(ctx, 16, 14, 6, '#CCCCCC');
    // Faucet
    rect(ctx, 15, 4, 2, 6, '#888888');
    rect(ctx, 14, 4, 4, 2, '#888888');
    c.refresh();
  }

  // interior-fridge — 32×32
  {
    const c = scene.textures.createCanvas('interior-fridge', 32, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 4, 0, 24, 32, '#F0F0F0');
    // Door divider
    rect(ctx, 4, 14, 24, 2, '#DDDDDD');
    // Handle line
    rect(ctx, 25, 4, 2, 8, '#999999');
    rect(ctx, 25, 20, 2, 8, '#999999');
    // Edge shadow
    rect(ctx, 4, 0, 1, 32, '#DDDDDD');
    rect(ctx, 27, 0, 1, 32, '#DDDDDD');
    c.refresh();
  }

  // interior-bathroom-wall — 32×32
  {
    const c = scene.textures.createCanvas('interior-bathroom-wall', 32, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 32, '#E8E0D0');
    // Tile pattern
    for (let y = 0; y < 32; y += 8) {
      rect(ctx, 0, y, 32, 1, '#D8D0C0');
    }
    for (let x = 0; x < 32; x += 8) {
      rect(ctx, x, 0, 1, 32, '#D8D0C0');
    }
    c.refresh();
  }

  // interior-toilet — 32×32
  {
    const c = scene.textures.createCanvas('interior-toilet', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Gray tile floor
    rect(ctx, 0, 0, 32, 32, '#BBBBBB');
    // Toilet base (white oval)
    circle(ctx, 16, 18, 8, '#FFFFFF');
    circle(ctx, 16, 18, 6, '#F0F0F0');
    // Tank at back
    rect(ctx, 10, 6, 12, 8, '#FFFFFF');
    rect(ctx, 10, 6, 12, 1, '#DDDDDD');
    c.refresh();
  }

  // interior-tv — 32×32
  {
    const c = scene.textures.createCanvas('interior-tv', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // TV body
    rect(ctx, 2, 4, 28, 20, '#222222');
    // Screen
    rect(ctx, 4, 6, 24, 16, '#3366AA');
    // Screen color bar detail
    rect(ctx, 4, 14, 8, 8, '#44AA44');
    rect(ctx, 12, 14, 8, 8, '#CC5533');
    rect(ctx, 20, 14, 8, 8, '#DDDD44');
    // Stand
    rect(ctx, 12, 24, 8, 4, '#333333');
    rect(ctx, 8, 28, 16, 2, '#333333');
    c.refresh();
  }

  // interior-bed — 64×64 (2x2 tiles)
  {
    const c = scene.textures.createCanvas('interior-bed', 64, 64);
    if (!c) return;
    const ctx = c.context;
    // Bed frame
    rect(ctx, 4, 8, 56, 52, '#8B6914');
    // Mattress / white sheet
    rect(ctx, 6, 10, 52, 48, '#FFFFFF');
    // Sheet wrinkle details
    rect(ctx, 6, 30, 52, 1, '#EEEEEE');
    rect(ctx, 6, 44, 52, 1, '#EEEEEE');
    // Blue pillow at top
    rect(ctx, 10, 12, 20, 12, '#5588CC');
    rect(ctx, 34, 12, 20, 12, '#5588CC');
    // Pillow highlights
    rect(ctx, 12, 14, 16, 2, lighten('#5588CC', 0.15));
    rect(ctx, 36, 14, 16, 2, lighten('#5588CC', 0.15));
    // Headboard
    rect(ctx, 2, 4, 60, 6, darken('#8B6914', 0.15));
    c.refresh();
  }

  // interior-desk — 32×32
  {
    const c = scene.textures.createCanvas('interior-desk', 32, 32);
    if (!c) return;
    const ctx = c.context;
    const wood = '#8B6914';
    // Desk top surface
    rect(ctx, 0, 8, 32, 6, wood);
    rect(ctx, 0, 8, 32, 1, lighten(wood, 0.1));
    // Legs
    rect(ctx, 2, 14, 3, 18, darken(wood, 0.1));
    rect(ctx, 27, 14, 3, 18, darken(wood, 0.1));
    // Drawer
    rect(ctx, 8, 14, 16, 8, darken(wood, 0.05));
    // Drawer handle
    rect(ctx, 14, 17, 4, 2, '#999999');
    c.refresh();
  }
}

// ── Main export ─────────────────────────────────────────────────────────

export function generateMauiTextures(scene: Phaser.Scene): void {
  generateMauiTerrain(scene);
  generateMauiNPCs(scene);
  generateMauiDecorations(scene);
  generateMauiBuildings(scene);
  generateMauiCars(scene);
  generateHotelInteriorTextures(scene);
}
