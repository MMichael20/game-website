// src/game/rendering/AirportTextures.ts
// Generates all airport-related textures: NPCs, building, interior decorations, signs

type Ctx = CanvasRenderingContext2D;

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

// ── NPC drawing (48×48) ──────────────────────────────────────────────────

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

// ── NPC textures ─────────────────────────────────────────────────────────

function generateNPCTextures(scene: Phaser.Scene): void {
  // npc-ticket-agent: blue vest over white shirt, dark pants, friendly face
  {
    const c = scene.textures.createCanvas('npc-ticket-agent', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#d4a574', hair: '#443322', top: '#EEEEEE', pants: '#333344',
      detail: (ctx) => {
        // Blue vest panels over white shirt
        rect(ctx, 14, 19, 6, 16, '#2244AA');
        rect(ctx, 28, 19, 6, 16, '#2244AA');
        rect(ctx, 14, 19, 20, 2, '#2244AA');
        // Vest collar
        rect(ctx, 20, 18, 8, 2, '#2244AA');
        // Vest buttons
        px(ctx, 24, 23, darken('#2244AA', 0.3));
        px(ctx, 24, 27, darken('#2244AA', 0.3));
        px(ctx, 24, 31, darken('#2244AA', 0.3));
      },
    });
    c.refresh();
  }

  // npc-traveler: tan jacket, dark pants, backpack, cap
  {
    const c = scene.textures.createCanvas('npc-traveler', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#d4a574', hair: '#554433', top: '#C3A080', pants: '#444444',
      detail: (ctx) => {
        // Backpack on right side
        rect(ctx, 36, 20, 6, 12, '#8B6914');
        rect(ctx, 36, 20, 6, 2, darken('#8B6914', 0.2));
        rect(ctx, 38, 19, 3, 1, darken('#8B6914', 0.1)); // strap
        // Cap
        rect(ctx, 17, 4, 14, 3, '#886644');
        rect(ctx, 15, 6, 4, 2, '#886644'); // brim
      },
    });
    c.refresh();
  }

  // npc-traveler-2: red top, blue pants, different skin tone, no hat
  {
    const c = scene.textures.createCanvas('npc-traveler-2', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#e8c090', hair: '#222222', top: '#CC4444', pants: '#3344AA',
      detail: (ctx) => {
        // Collar detail
        rect(ctx, 20, 18, 8, 2, darken('#CC4444', 0.15));
      },
    });
    c.refresh();
  }

  // npc-security-guard: dark navy uniform, gold badge, cap
  {
    const c = scene.textures.createCanvas('npc-security-guard', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#8B6B4A', hair: '#111111', top: '#1A1A4E', pants: '#111133',
      shoes: '#111111',
      detail: (ctx) => {
        // Gold badge on chest
        rect(ctx, 17, 23, 3, 4, '#FFD700');
        px(ctx, 18, 22, '#FFD700');
        // Belt
        rect(ctx, 14, 33, 20, 2, '#333333');
        px(ctx, 23, 33, '#FFD700'); // belt buckle
        px(ctx, 24, 33, '#FFD700');
        // Navy cap
        rect(ctx, 17, 3, 14, 4, '#1A1A4E');
        rect(ctx, 15, 6, 4, 2, '#1A1A4E'); // brim
        rect(ctx, 17, 3, 14, 1, lighten('#1A1A4E', 0.15));
      },
    });
    c.refresh();
  }

  // npc-gate-agent: teal vest over white shirt, dark pants, no hat
  {
    const c = scene.textures.createCanvas('npc-gate-agent', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#d4a574', hair: '#663322', top: '#EEEEEE', pants: '#333344',
      detail: (ctx) => {
        // Teal vest panels
        rect(ctx, 14, 19, 6, 16, '#008080');
        rect(ctx, 28, 19, 6, 16, '#008080');
        rect(ctx, 14, 19, 20, 2, '#008080');
        // Vest collar
        rect(ctx, 20, 18, 8, 2, '#008080');
        // Vest buttons
        px(ctx, 24, 24, darken('#008080', 0.3));
        px(ctx, 24, 28, darken('#008080', 0.3));
      },
    });
    c.refresh();
  }

  // npc-cafe-worker: brown apron over green shirt, no hat
  {
    const c = scene.textures.createCanvas('npc-cafe-worker', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#e8c090', hair: '#443322', top: '#228B22', pants: '#333333',
      detail: (ctx) => {
        // Brown apron over shirt
        rect(ctx, 16, 23, 16, 12, '#8B4513');
        rect(ctx, 16, 23, 16, 2, lighten('#8B4513', 0.15));
        // Apron strings
        rect(ctx, 14, 25, 2, 1, '#8B4513');
        rect(ctx, 32, 25, 2, 1, '#8B4513');
        // Apron pocket
        rect(ctx, 20, 29, 8, 4, darken('#8B4513', 0.1));
        rect(ctx, 20, 29, 8, 1, darken('#8B4513', 0.2));
      },
    });
    c.refresh();
  }
}

// ── Building ─────────────────────────────────────────────────────────────

function generateBuildingTexture(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('building-airport', 96, 64);
  if (!c) return;
  const ctx = c.context;

  // Main walls
  rect(ctx, 0, 12, 96, 52, '#8A8A8A');
  rect(ctx, 0, 12, 96, 1, lighten('#8A8A8A', 0.15));

  // Blue roof accent band
  rect(ctx, 0, 0, 96, 12, '#2244AA');
  rect(ctx, 0, 0, 96, 2, lighten('#2244AA', 0.2));
  rect(ctx, 0, 10, 96, 2, darken('#2244AA', 0.2));

  // Windows along wall
  for (let x = 4; x < 90; x += 12) {
    if (x >= 36 && x <= 56) continue; // skip door area
    rect(ctx, x, 22, 8, 10, '#AADDFF');
    rect(ctx, x, 22, 8, 1, '#999999');
    rect(ctx, x, 31, 8, 1, '#999999');
    rect(ctx, x, 22, 1, 10, '#999999');
    rect(ctx, x + 7, 22, 1, 10, '#999999');
    // Mullion
    rect(ctx, x + 3, 22, 2, 10, '#999999');
  }

  // Glass door center
  rect(ctx, 38, 24, 20, 40, '#AADDFF');
  rect(ctx, 38, 24, 1, 40, '#777777');
  rect(ctx, 57, 24, 1, 40, '#777777');
  rect(ctx, 47, 24, 2, 40, '#777777');
  // Door handle dots
  px(ctx, 46, 44, '#CCCCCC');
  px(ctx, 49, 44, '#CCCCCC');

  // "AIRPORT" text suggestion — a row of colored pixel clusters
  const textY = 4;
  const textColors = '#FFFFFF';
  // A
  px(ctx, 28, textY, textColors); px(ctx, 29, textY, textColors);
  px(ctx, 27, textY + 1, textColors); px(ctx, 30, textY + 1, textColors);
  px(ctx, 27, textY + 2, textColors); px(ctx, 28, textY + 2, textColors); px(ctx, 29, textY + 2, textColors); px(ctx, 30, textY + 2, textColors);
  px(ctx, 27, textY + 3, textColors); px(ctx, 30, textY + 3, textColors);
  // I
  px(ctx, 32, textY, textColors); px(ctx, 32, textY + 1, textColors); px(ctx, 32, textY + 2, textColors); px(ctx, 32, textY + 3, textColors);
  // R
  px(ctx, 34, textY, textColors); px(ctx, 35, textY, textColors);
  px(ctx, 34, textY + 1, textColors); px(ctx, 36, textY + 1, textColors);
  px(ctx, 34, textY + 2, textColors); px(ctx, 35, textY + 2, textColors);
  px(ctx, 34, textY + 3, textColors); px(ctx, 36, textY + 3, textColors);
  // P
  px(ctx, 38, textY, textColors); px(ctx, 39, textY, textColors);
  px(ctx, 38, textY + 1, textColors); px(ctx, 40, textY + 1, textColors);
  px(ctx, 38, textY + 2, textColors); px(ctx, 39, textY + 2, textColors);
  px(ctx, 38, textY + 3, textColors);
  // O
  px(ctx, 42, textY, textColors); px(ctx, 43, textY, textColors);
  px(ctx, 41, textY + 1, textColors); px(ctx, 44, textY + 1, textColors);
  px(ctx, 41, textY + 2, textColors); px(ctx, 44, textY + 2, textColors);
  px(ctx, 42, textY + 3, textColors); px(ctx, 43, textY + 3, textColors);
  // R
  px(ctx, 46, textY, textColors); px(ctx, 47, textY, textColors);
  px(ctx, 46, textY + 1, textColors); px(ctx, 48, textY + 1, textColors);
  px(ctx, 46, textY + 2, textColors); px(ctx, 47, textY + 2, textColors);
  px(ctx, 46, textY + 3, textColors); px(ctx, 48, textY + 3, textColors);
  // T
  px(ctx, 50, textY, textColors); px(ctx, 51, textY, textColors); px(ctx, 52, textY, textColors);
  px(ctx, 51, textY + 1, textColors); px(ctx, 51, textY + 2, textColors); px(ctx, 51, textY + 3, textColors);

  // Ground line
  rect(ctx, 0, 62, 96, 2, '#666666');

  c.refresh();
}

// ── Interior decorations ─────────────────────────────────────────────────

function generateInteriorTextures(scene: Phaser.Scene): void {
  // interior-airport-counter (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-counter', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Front panel
    rect(ctx, 0, 10, 32, 22, '#444444');
    rect(ctx, 0, 10, 32, 1, '#555555');
    // Top surface
    rect(ctx, 0, 8, 32, 4, '#888888');
    rect(ctx, 0, 8, 32, 1, lighten('#888888', 0.2));
    // Panel detail lines
    rect(ctx, 8, 14, 1, 16, '#555555');
    rect(ctx, 23, 14, 1, 16, '#555555');
    c.refresh();
  }

  // interior-airport-bench (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-bench', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Legs
    rect(ctx, 3, 20, 2, 12, '#999999');
    rect(ctx, 27, 20, 2, 12, '#999999');
    rect(ctx, 14, 20, 2, 12, '#999999');
    // Seat
    rect(ctx, 1, 16, 30, 5, '#666666');
    rect(ctx, 1, 16, 30, 1, lighten('#666666', 0.2));
    // Arm rests
    rect(ctx, 1, 12, 2, 5, '#999999');
    rect(ctx, 29, 12, 2, 5, '#999999');
    c.refresh();
  }

  // interior-airport-conveyor-belt (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-conveyor-belt', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Belt body
    rect(ctx, 0, 10, 32, 16, '#555555');
    // Silver edges
    rect(ctx, 0, 9, 32, 2, '#AAAAAA');
    rect(ctx, 0, 25, 32, 2, '#AAAAAA');
    // Belt segments
    for (let x = 2; x < 30; x += 5) {
      rect(ctx, x, 12, 3, 12, '#4A4A4A');
    }
    // Legs
    rect(ctx, 2, 27, 3, 5, '#777777');
    rect(ctx, 27, 27, 3, 5, '#777777');
    c.refresh();
  }

  // interior-airport-metal-detector (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-metal-detector', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Left post
    rect(ctx, 4, 4, 4, 28, '#999999');
    rect(ctx, 4, 4, 4, 1, lighten('#999999', 0.2));
    // Right post
    rect(ctx, 24, 4, 4, 28, '#999999');
    rect(ctx, 24, 4, 4, 1, lighten('#999999', 0.2));
    // Top bar
    rect(ctx, 4, 2, 24, 4, '#AAAAAA');
    rect(ctx, 4, 2, 24, 1, lighten('#AAAAAA', 0.15));
    // Light indicator
    px(ctx, 15, 3, '#44CC44');
    px(ctx, 16, 3, '#44CC44');
    c.refresh();
  }

  // interior-airport-rope-barrier (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-rope-barrier', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Gold posts
    rect(ctx, 3, 8, 3, 24, '#DAA520');
    rect(ctx, 3, 8, 3, 1, lighten('#DAA520', 0.2));
    rect(ctx, 26, 8, 3, 24, '#DAA520');
    rect(ctx, 26, 8, 3, 1, lighten('#DAA520', 0.2));
    // Post tops (rounded)
    rect(ctx, 2, 6, 5, 3, '#DAA520');
    rect(ctx, 25, 6, 5, 3, '#DAA520');
    // Red rope
    rect(ctx, 6, 12, 20, 2, '#CC2222');
    rect(ctx, 6, 12, 20, 1, lighten('#CC2222', 0.2));
    // Rope sag
    px(ctx, 15, 13, '#CC2222');
    px(ctx, 16, 13, '#CC2222');
    px(ctx, 14, 14, '#CC2222');
    px(ctx, 17, 14, '#CC2222');
    c.refresh();
  }

  // interior-airport-departures-board (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-departures-board', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Black screen
    rect(ctx, 1, 1, 30, 30, '#111111');
    rect(ctx, 1, 1, 30, 1, '#333333');
    // Header row
    rect(ctx, 3, 3, 26, 2, '#334488');
    // Flight rows with colored status dots
    const rowColors = ['#44CC44', '#44CC44', '#CCCC44', '#CCCC44', '#CC8844', '#CC4444'];
    for (let i = 0; i < 6; i++) {
      const y = 7 + i * 4;
      // Flight info dots
      rect(ctx, 3, y, 8, 1, '#888888');
      rect(ctx, 13, y, 6, 1, '#666666');
      // Status dot
      rect(ctx, 22, y, 3, 2, rowColors[i]);
    }
    // Border
    rect(ctx, 0, 0, 32, 1, '#444444');
    rect(ctx, 0, 31, 32, 1, '#444444');
    rect(ctx, 0, 0, 1, 32, '#444444');
    rect(ctx, 31, 0, 1, 32, '#444444');
    c.refresh();
  }

  // interior-airport-window (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-window', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Frame
    rect(ctx, 0, 0, 32, 32, '#999999');
    // Glass
    rect(ctx, 2, 2, 28, 28, '#AADDFF');
    // Mullion cross
    rect(ctx, 14, 2, 4, 28, '#999999');
    rect(ctx, 2, 14, 28, 4, '#999999');
    // Highlight on glass
    rect(ctx, 4, 4, 3, 6, lighten('#AADDFF', 0.3));
    rect(ctx, 20, 4, 3, 6, lighten('#AADDFF', 0.3));
    c.refresh();
  }

  // interior-airport-gate-desk (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-gate-desk', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Front panel (darker wood)
    rect(ctx, 4, 12, 24, 20, darken('#A0522D', 0.2));
    rect(ctx, 4, 12, 24, 1, '#A0522D');
    // Top surface
    rect(ctx, 2, 10, 28, 4, '#A0522D');
    rect(ctx, 2, 10, 28, 1, lighten('#A0522D', 0.2));
    // Panel inset
    rect(ctx, 8, 16, 16, 12, darken('#A0522D', 0.3));
    c.refresh();
  }

  // interior-airport-bin (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-bin', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Gray rectangular tray
    rect(ctx, 2, 18, 28, 10, '#888888');
    rect(ctx, 2, 18, 28, 1, lighten('#888888', 0.2));
    // Inner area (darker)
    rect(ctx, 4, 20, 24, 6, '#777777');
    // Rim
    rect(ctx, 1, 17, 30, 2, '#999999');
    c.refresh();
  }

  // interior-airport-cafe-counter (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-cafe-counter', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Front panel
    rect(ctx, 0, 12, 32, 20, '#5C4033');
    // Counter top
    rect(ctx, 0, 10, 32, 4, '#8B6914');
    rect(ctx, 0, 10, 32, 1, lighten('#8B6914', 0.2));
    // Coffee machine (on top)
    rect(ctx, 22, 2, 8, 9, '#333333');
    rect(ctx, 22, 2, 8, 1, '#555555');
    // Coffee pot (brown circle)
    rect(ctx, 24, 5, 4, 4, '#6B3410');
    px(ctx, 25, 4, '#6B3410');
    px(ctx, 26, 4, '#6B3410');
    c.refresh();
  }

  // interior-airport-stool (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-stool', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Pole
    rect(ctx, 15, 14, 2, 16, '#999999');
    // Base
    rect(ctx, 10, 28, 12, 3, '#999999');
    rect(ctx, 10, 28, 12, 1, lighten('#999999', 0.2));
    // Seat (round)
    rect(ctx, 10, 10, 12, 5, '#666666');
    rect(ctx, 12, 9, 8, 2, '#666666');
    rect(ctx, 10, 10, 12, 1, lighten('#666666', 0.2));
    c.refresh();
  }

  // interior-airport-cafe-menu (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-cafe-menu', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Black board
    rect(ctx, 1, 1, 30, 30, '#222222');
    // Border
    rect(ctx, 0, 0, 32, 1, '#8B4513');
    rect(ctx, 0, 31, 32, 1, '#8B4513');
    rect(ctx, 0, 0, 1, 32, '#8B4513');
    rect(ctx, 31, 0, 1, 32, '#8B4513');
    // Text lines (white)
    rect(ctx, 4, 5, 14, 1, '#EEEEEE');
    rect(ctx, 4, 9, 18, 1, '#EEEEEE');
    rect(ctx, 4, 13, 12, 1, '#EEEEEE');
    rect(ctx, 4, 17, 20, 1, '#EEEEEE');
    rect(ctx, 4, 21, 16, 1, '#EEEEEE');
    rect(ctx, 4, 25, 10, 1, '#EEEEEE');
    // Prices on right
    rect(ctx, 24, 9, 4, 1, '#CCCCCC');
    rect(ctx, 24, 13, 4, 1, '#CCCCCC');
    rect(ctx, 24, 17, 4, 1, '#CCCCCC');
    c.refresh();
  }

  // interior-airport-plant (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-plant', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Pot
    rect(ctx, 9, 22, 14, 10, '#8B4513');
    rect(ctx, 7, 21, 18, 2, darken('#8B4513', 0.15));
    rect(ctx, 10, 22, 12, 1, lighten('#8B4513', 0.15));
    // Soil
    rect(ctx, 10, 22, 12, 2, '#5C3317');
    // Green bush / leaves
    rect(ctx, 7, 10, 18, 12, '#228B22');
    rect(ctx, 9, 6, 14, 6, '#228B22');
    rect(ctx, 11, 4, 10, 4, lighten('#228B22', 0.15));
    // Leaf highlights
    px(ctx, 10, 8, lighten('#228B22', 0.3));
    px(ctx, 14, 6, lighten('#228B22', 0.3));
    px(ctx, 20, 9, lighten('#228B22', 0.3));
    px(ctx, 12, 12, lighten('#228B22', 0.25));
    px(ctx, 18, 14, lighten('#228B22', 0.25));
    // Darker leaf shadows
    px(ctx, 8, 16, darken('#228B22', 0.2));
    px(ctx, 22, 18, darken('#228B22', 0.2));
    c.refresh();
  }

  // interior-airport-luggage-cart (32×32)
  {
    const c = scene.textures.createCanvas('interior-airport-luggage-cart', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Cart frame
    rect(ctx, 2, 18, 28, 3, '#999999');
    rect(ctx, 2, 18, 28, 1, lighten('#999999', 0.2));
    // Handle
    rect(ctx, 26, 8, 2, 11, '#999999');
    rect(ctx, 24, 7, 6, 2, '#AAAAAA');
    // Wheels
    rect(ctx, 4, 28, 4, 4, '#555555');
    rect(ctx, 24, 28, 4, 4, '#555555');
    // Suitcases
    rect(ctx, 3, 8, 10, 10, '#3366CC');
    rect(ctx, 3, 8, 10, 1, lighten('#3366CC', 0.2));
    rect(ctx, 14, 11, 8, 7, '#CC3333');
    rect(ctx, 14, 11, 8, 1, lighten('#CC3333', 0.2));
    // Suitcase handles
    rect(ctx, 7, 7, 3, 1, '#555555');
    rect(ctx, 17, 10, 3, 1, '#555555');
    c.refresh();
  }
}

// ── Signs (32×16) ────────────────────────────────────────────────────────

function generateSignTextures(scene: Phaser.Scene): void {
  // interior-sign-departures: blue bg, white right arrow
  {
    const c = scene.textures.createCanvas('interior-sign-departures', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#1A5276');
    rect(ctx, 0, 0, 32, 1, lighten('#1A5276', 0.15));
    // Arrow pointing right
    rect(ctx, 8, 7, 12, 2, '#FFFFFF');
    px(ctx, 20, 5, '#FFFFFF');
    px(ctx, 21, 6, '#FFFFFF');
    px(ctx, 22, 7, '#FFFFFF');
    px(ctx, 22, 8, '#FFFFFF');
    px(ctx, 21, 9, '#FFFFFF');
    px(ctx, 20, 10, '#FFFFFF');
    c.refresh();
  }

  // interior-sign-gate: blue bg, airplane icon
  {
    const c = scene.textures.createCanvas('interior-sign-gate', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#1A5276');
    rect(ctx, 0, 0, 32, 1, lighten('#1A5276', 0.15));
    // Simple airplane chevron pointing right
    px(ctx, 10, 8, '#FFFFFF');
    rect(ctx, 11, 7, 1, 3, '#FFFFFF');
    rect(ctx, 12, 6, 1, 5, '#FFFFFF');
    rect(ctx, 13, 5, 1, 7, '#FFFFFF');
    rect(ctx, 14, 4, 1, 9, '#FFFFFF');
    rect(ctx, 15, 6, 1, 5, '#FFFFFF');
    rect(ctx, 16, 7, 4, 3, '#FFFFFF');
    // Tail
    rect(ctx, 20, 6, 2, 5, '#FFFFFF');
    px(ctx, 22, 7, '#FFFFFF');
    px(ctx, 22, 9, '#FFFFFF');
    c.refresh();
  }

  // interior-sign-security: blue bg, shield
  {
    const c = scene.textures.createCanvas('interior-sign-security', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#1A5276');
    rect(ctx, 0, 0, 32, 1, lighten('#1A5276', 0.15));
    // Shield shape
    rect(ctx, 12, 2, 8, 8, '#FFFFFF');
    rect(ctx, 13, 10, 6, 2, '#FFFFFF');
    rect(ctx, 14, 12, 4, 1, '#FFFFFF');
    px(ctx, 15, 13, '#FFFFFF');
    px(ctx, 16, 13, '#FFFFFF');
    // Shield inner
    rect(ctx, 14, 4, 4, 4, '#1A5276');
    c.refresh();
  }

  // interior-sign-cafe: brown bg, coffee cup
  {
    const c = scene.textures.createCanvas('interior-sign-cafe', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#5D4037');
    rect(ctx, 0, 0, 32, 1, lighten('#5D4037', 0.15));
    // Coffee cup (white circle/mug)
    rect(ctx, 13, 5, 6, 7, '#FFFFFF');
    rect(ctx, 12, 6, 1, 5, '#FFFFFF');
    rect(ctx, 19, 6, 1, 5, '#FFFFFF');
    // Handle
    rect(ctx, 20, 7, 2, 3, '#FFFFFF');
    px(ctx, 21, 7, '#5D4037');
    // Steam
    px(ctx, 14, 3, '#CCCCCC');
    px(ctx, 16, 2, '#CCCCCC');
    px(ctx, 18, 3, '#CCCCCC');
    c.refresh();
  }

  // interior-sign-gate-number: blue bg, "G7" in white
  {
    const c = scene.textures.createCanvas('interior-sign-gate-number', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#1A5276');
    rect(ctx, 0, 0, 32, 1, lighten('#1A5276', 0.15));
    // G
    rect(ctx, 8, 4, 5, 1, '#FFFFFF');
    rect(ctx, 8, 4, 1, 8, '#FFFFFF');
    rect(ctx, 8, 11, 5, 1, '#FFFFFF');
    rect(ctx, 12, 7, 1, 5, '#FFFFFF');
    rect(ctx, 10, 7, 3, 1, '#FFFFFF');
    // 7
    rect(ctx, 16, 4, 5, 1, '#FFFFFF');
    rect(ctx, 20, 4, 1, 3, '#FFFFFF');
    rect(ctx, 19, 6, 1, 2, '#FFFFFF');
    rect(ctx, 18, 8, 1, 2, '#FFFFFF');
    rect(ctx, 17, 10, 1, 2, '#FFFFFF');
    c.refresh();
  }
}

// ── Airplane / cutscene textures ─────────────────────────────────────────

function generateAirplaneTextures(scene: Phaser.Scene): void {
  // airplane-exterior — 128×48: white fuselage, blue tail, gray wing, window dots
  {
    const c = scene.textures.createCanvas('airplane-exterior', 128, 48);
    if (!c) return;
    const ctx = c.context;

    // Wing (behind fuselage)
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.moveTo(45, 24);
    ctx.lineTo(30, 38);
    ctx.lineTo(70, 38);
    ctx.lineTo(65, 24);
    ctx.closePath();
    ctx.fill();

    // Fuselage (rounded rect / oval)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(64, 20, 56, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose highlight
    ctx.fillStyle = '#EEEEEE';
    ctx.beginPath();
    ctx.ellipse(112, 20, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail fin
    ctx.fillStyle = '#2244AA';
    ctx.beginPath();
    ctx.moveTo(8, 20);
    ctx.lineTo(2, 2);
    ctx.lineTo(20, 2);
    ctx.lineTo(22, 20);
    ctx.closePath();
    ctx.fill();
    // Tail fin highlight
    ctx.fillStyle = '#3355BB';
    ctx.fillRect(6, 4, 8, 2);

    // Window dots
    ctx.fillStyle = '#87CEEB';
    for (let x = 30; x <= 100; x += 6) {
      ctx.fillRect(x, 17, 3, 3);
    }

    // Fuselage stripe
    ctx.fillStyle = '#2244AA';
    ctx.fillRect(14, 24, 100, 2);

    c.refresh();
  }

  // airplane-cabin-bg — 800×600: interior cabin view
  {
    const c = scene.textures.createCanvas('airplane-cabin-bg', 800, 600);
    if (!c) return;
    const ctx = c.context;

    // Background
    rect(ctx, 0, 0, 800, 600, '#2A2A3E');

    // Overhead bin strip
    rect(ctx, 0, 0, 800, 60, '#3A3A4A');
    rect(ctx, 0, 55, 800, 5, '#222233');
    // Bin panel lines
    for (let x = 0; x < 800; x += 100) {
      rect(ctx, x, 5, 1, 50, '#4A4A5A');
    }

    // Ceiling light strips
    rect(ctx, 0, 60, 800, 2, '#555577');

    // Left windows
    for (let y = 120; y < 400; y += 100) {
      rect(ctx, 20, y, 40, 60, '#444466');
      rect(ctx, 24, y + 4, 32, 52, '#87CEEB');
      // Window frame
      rect(ctx, 24, y + 28, 32, 2, '#444466');
    }

    // Right windows
    for (let y = 120; y < 400; y += 100) {
      rect(ctx, 740, y, 40, 60, '#444466');
      rect(ctx, 744, y + 4, 32, 52, '#87CEEB');
      rect(ctx, 744, y + 28, 32, 2, '#444466');
    }

    // Floor
    rect(ctx, 0, 480, 800, 120, '#333348');
    rect(ctx, 0, 480, 800, 2, '#444458');

    // Left row of seats
    for (let x = 100; x <= 280; x += 90) {
      // Seat back
      rect(ctx, x, 340, 60, 80, '#8B7355');
      rect(ctx, x, 340, 60, 4, '#9B8365');
      // Headrest
      rect(ctx, x + 10, 330, 40, 14, '#9B8365');
      // Seat cushion
      rect(ctx, x, 420, 60, 40, '#7A6345');
      rect(ctx, x, 460, 60, 4, '#6A5335');
    }

    // Right row of seats
    for (let x = 520; x <= 700; x += 90) {
      rect(ctx, x, 340, 60, 80, '#8B7355');
      rect(ctx, x, 340, 60, 4, '#9B8365');
      rect(ctx, x + 10, 330, 40, 14, '#9B8365');
      rect(ctx, x, 420, 60, 40, '#7A6345');
      rect(ctx, x, 460, 60, 4, '#6A5335');
    }

    // Aisle
    rect(ctx, 370, 340, 60, 140, '#333348');

    c.refresh();
  }

  // cloud-1 — 64×32
  {
    const c = scene.textures.createCanvas('cloud-1', 64, 32);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(20, 20, 12, 0, Math.PI * 2);
    ctx.arc(36, 16, 14, 0, Math.PI * 2);
    ctx.arc(50, 20, 10, 0, Math.PI * 2);
    ctx.arc(28, 14, 10, 0, Math.PI * 2);
    ctx.arc(44, 12, 9, 0, Math.PI * 2);
    ctx.fill();
    c.refresh();
  }

  // cloud-2 — 48×24
  {
    const c = scene.textures.createCanvas('cloud-2', 48, 24);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(14, 14, 8, 0, Math.PI * 2);
    ctx.arc(26, 11, 10, 0, Math.PI * 2);
    ctx.arc(38, 14, 7, 0, Math.PI * 2);
    ctx.fill();
    c.refresh();
  }

  // cloud-3 — 80×40
  {
    const c = scene.textures.createCanvas('cloud-3', 80, 40);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(20, 26, 14, 0, Math.PI * 2);
    ctx.arc(38, 18, 16, 0, Math.PI * 2);
    ctx.arc(56, 22, 12, 0, Math.PI * 2);
    ctx.arc(68, 26, 10, 0, Math.PI * 2);
    ctx.arc(30, 22, 11, 0, Math.PI * 2);
    ctx.arc(50, 16, 13, 0, Math.PI * 2);
    ctx.fill();
    c.refresh();
  }

  // runway — 800×64
  {
    const c = scene.textures.createCanvas('runway', 800, 64);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 800, 64, '#666666');
    // Dashed center line
    ctx.fillStyle = '#FFFFFF';
    for (let x = 10; x < 790; x += 40) {
      ctx.fillRect(x, 30, 20, 4);
    }
    // Edge lines
    rect(ctx, 0, 0, 800, 2, '#888888');
    rect(ctx, 0, 62, 800, 2, '#888888');
    c.refresh();
  }

  // ground-strip — 800×200
  {
    const c = scene.textures.createCanvas('ground-strip', 800, 200);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 800, 200, '#4a7c4f');
    c.refresh();
  }
}

// ── Main export ──────────────────────────────────────────────────────────

export function generateAirportTextures(scene: Phaser.Scene): void {
  generateNPCTextures(scene);
  generateBuildingTexture(scene);
  generateInteriorTextures(scene);
  generateSignTextures(scene);
  generateAirplaneTextures(scene);
}
