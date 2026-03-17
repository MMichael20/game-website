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

  // npc-passport-officer: dark uniform, stern look
  {
    const c = scene.textures.createCanvas('npc-passport-officer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D4A574',
      hair: '#222222',
      top: '#2C3E50',
      pants: '#1A1A2E',
      shoes: '#111111',
      detail: (dCtx) => {
        // Badge
        rect(dCtx, 16, 22, 4, 4, '#C8A84E');
        // Shoulder marks
        rect(dCtx, 14, 19, 3, 1, '#C8A84E');
        rect(dCtx, 31, 19, 3, 1, '#C8A84E');
      },
    });
    c.refresh();
  }
}

// ── Building ─────────────────────────────────────────────────────────────

function generateBuildingTexture(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('building-airport', 384, 96);
  if (!c) return;
  const ctx = c.context;

  // Main walls
  rect(ctx, 0, 16, 384, 78, '#8A8A8A');
  rect(ctx, 0, 16, 384, 1, lighten('#8A8A8A', 0.15));

  // Blue roof accent band (12px)
  rect(ctx, 0, 4, 384, 12, '#2244AA');
  rect(ctx, 0, 4, 384, 2, lighten('#2244AA', 0.2));
  rect(ctx, 0, 14, 384, 2, darken('#2244AA', 0.2));

  // Glass windows — repeating 24px pattern along wall
  for (let x = 8; x < 376; x += 24) {
    if (x >= 168 && x <= 216) continue; // skip door area
    rect(ctx, x, 30, 16, 14, '#AADDFF');
    rect(ctx, x, 30, 16, 1, '#999999');
    rect(ctx, x, 43, 16, 1, '#999999');
    rect(ctx, x, 30, 1, 14, '#999999');
    rect(ctx, x + 15, 30, 1, 14, '#999999');
    // Mullion
    rect(ctx, x + 7, 30, 2, 14, '#999999');
  }

  // Central entrance doors
  rect(ctx, 172, 34, 40, 60, '#AADDFF');
  rect(ctx, 172, 34, 1, 60, '#777777');
  rect(ctx, 211, 34, 1, 60, '#777777');
  rect(ctx, 191, 34, 2, 60, '#777777');
  // Door handle dots
  px(ctx, 189, 64, '#CCCCCC');
  px(ctx, 194, 64, '#CCCCCC');

  // Control tower bump on right side (inside canvas)
  rect(ctx, 330, 0, 40, 20, '#7A7A7A');
  rect(ctx, 330, 0, 40, 2, lighten('#7A7A7A', 0.2));
  // Tower windows
  for (let x = 334; x < 366; x += 10) {
    rect(ctx, x, 4, 6, 8, '#AADDFF');
    rect(ctx, x, 4, 6, 1, '#999999');
  }

  // "AIRPORT" pixel text — centered on 384px width (center ~192)
  const textY = 7;
  const tc = '#FFFFFF';
  const tx = 172; // start X for centered text
  // A
  px(ctx, tx, textY, tc); px(ctx, tx + 1, textY, tc);
  px(ctx, tx - 1, textY + 1, tc); px(ctx, tx + 2, textY + 1, tc);
  px(ctx, tx - 1, textY + 2, tc); px(ctx, tx, textY + 2, tc); px(ctx, tx + 1, textY + 2, tc); px(ctx, tx + 2, textY + 2, tc);
  px(ctx, tx - 1, textY + 3, tc); px(ctx, tx + 2, textY + 3, tc);
  // I
  px(ctx, tx + 4, textY, tc); px(ctx, tx + 4, textY + 1, tc); px(ctx, tx + 4, textY + 2, tc); px(ctx, tx + 4, textY + 3, tc);
  // R
  px(ctx, tx + 6, textY, tc); px(ctx, tx + 7, textY, tc);
  px(ctx, tx + 6, textY + 1, tc); px(ctx, tx + 8, textY + 1, tc);
  px(ctx, tx + 6, textY + 2, tc); px(ctx, tx + 7, textY + 2, tc);
  px(ctx, tx + 6, textY + 3, tc); px(ctx, tx + 8, textY + 3, tc);
  // P
  px(ctx, tx + 10, textY, tc); px(ctx, tx + 11, textY, tc);
  px(ctx, tx + 10, textY + 1, tc); px(ctx, tx + 12, textY + 1, tc);
  px(ctx, tx + 10, textY + 2, tc); px(ctx, tx + 11, textY + 2, tc);
  px(ctx, tx + 10, textY + 3, tc);
  // O
  px(ctx, tx + 14, textY, tc); px(ctx, tx + 15, textY, tc);
  px(ctx, tx + 13, textY + 1, tc); px(ctx, tx + 16, textY + 1, tc);
  px(ctx, tx + 13, textY + 2, tc); px(ctx, tx + 16, textY + 2, tc);
  px(ctx, tx + 14, textY + 3, tc); px(ctx, tx + 15, textY + 3, tc);
  // R
  px(ctx, tx + 18, textY, tc); px(ctx, tx + 19, textY, tc);
  px(ctx, tx + 18, textY + 1, tc); px(ctx, tx + 20, textY + 1, tc);
  px(ctx, tx + 18, textY + 2, tc); px(ctx, tx + 19, textY + 2, tc);
  px(ctx, tx + 18, textY + 3, tc); px(ctx, tx + 20, textY + 3, tc);
  // T
  px(ctx, tx + 22, textY, tc); px(ctx, tx + 23, textY, tc); px(ctx, tx + 24, textY, tc);
  px(ctx, tx + 23, textY + 1, tc); px(ctx, tx + 23, textY + 2, tc); px(ctx, tx + 23, textY + 3, tc);

  // Ground strip
  rect(ctx, 0, 92, 384, 4, '#666666');

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

  // airplane-cabin-bg — 800×600: left-looking aisle perspective
  {
    const c = scene.textures.createCanvas('airplane-cabin-bg', 800, 600);
    if (!c) return;
    const ctx = c.context;

    // Background fill
    rect(ctx, 0, 0, 800, 600, '#2A2A3E');

    // ── Ceiling / overhead bins (top 80px) ──
    rect(ctx, 0, 0, 800, 80, '#3A3A4A');
    // Bin seam lines
    for (let x = 0; x < 800; x += 120) {
      rect(ctx, x, 4, 1, 70, '#4A4A5A');
    }
    // Light strip along bottom of bins
    rect(ctx, 0, 76, 800, 4, '#555577');

    // ── Left wall with windows (left ~120px) ──
    rect(ctx, 0, 80, 120, 440, '#3A3A50');
    // 3 oval-ish windows
    const windowYs = [140, 260, 370];
    for (const wy of windowYs) {
      // Window frame
      rect(ctx, 30, wy, 60, 50, '#444466');
      // Window glass (sky blue, where clouds will scroll)
      rect(ctx, 34, wy + 4, 52, 42, '#87CEEB');
      // Horizontal frame divider
      rect(ctx, 34, wy + 24, 52, 2, '#444466');
      // Rounded corners (darken corners to fake oval)
      px(ctx, 34, wy + 4, '#444466'); px(ctx, 35, wy + 4, '#444466');
      px(ctx, 85, wy + 4, '#444466'); px(ctx, 84, wy + 4, '#444466');
      px(ctx, 34, wy + 45, '#444466'); px(ctx, 35, wy + 45, '#444466');
      px(ctx, 85, wy + 45, '#444466'); px(ctx, 84, wy + 45, '#444466');
    }

    // ── Floor (bottom 120px) ──
    rect(ctx, 0, 480, 800, 120, '#333348');
    rect(ctx, 0, 480, 800, 2, '#444458');

    // ── Aisle (center strip narrowing toward top — perspective) ──
    // Aisle goes from ~100px wide at bottom to ~60px wide at top
    ctx.fillStyle = '#3D3D52';
    ctx.beginPath();
    ctx.moveTo(330, 480); // bottom-left of aisle
    ctx.lineTo(350, 80);  // top-left (narrower)
    ctx.lineTo(410, 80);  // top-right
    ctx.lineTo(470, 480); // bottom-right
    ctx.closePath();
    ctx.fill();
    // Aisle carpet stripe
    ctx.fillStyle = '#4A4A60';
    ctx.beginPath();
    ctx.moveTo(385, 480);
    ctx.lineTo(375, 80);
    ctx.lineTo(385, 80);
    ctx.lineTo(415, 480);
    ctx.closePath();
    ctx.fill();

    // ── Seat rows (receding perspective — 3 rows on each side of aisle) ──
    const seatColor = '#8B7355';
    const headrestColor = '#9B8365';
    const cushionColor = '#7A6345';

    // Row definitions: { y, seatW, seatH, headH, gap }
    const rows = [
      { y: 380, seatW: 80, seatH: 60, headH: 14, gap: 20 },  // near
      { y: 260, seatW: 60, seatH: 45, headH: 10, gap: 15 },  // mid
      { y: 160, seatW: 40, seatH: 30, headH: 8, gap: 10 },   // far
    ];

    for (const row of rows) {
      // Lerp aisle edges at this y
      const t = (row.y - 80) / 400; // 0 at top, 1 at bottom
      const aisleL = 350 + (330 - 350) * t; // left edge
      const aisleR = 410 + (470 - 410) * t; // right edge

      // Window-side seats (left of aisle)
      const lx = aisleL - row.gap - row.seatW * 2 - 4;
      for (let s = 0; s < 2; s++) {
        const sx = lx + s * (row.seatW + 4);
        // Seat back
        rect(ctx, sx, row.y, row.seatW, row.seatH, seatColor);
        rect(ctx, sx, row.y, row.seatW, 3, headrestColor);
        // Headrest
        rect(ctx, sx + row.seatW * 0.15, row.y - row.headH, row.seatW * 0.7, row.headH, headrestColor);
        // Cushion
        rect(ctx, sx, row.y + row.seatH, row.seatW, row.seatH * 0.5, cushionColor);
      }

      // Aisle-side seats (right of aisle)
      const rx = aisleR + row.gap;
      for (let s = 0; s < 2; s++) {
        const sx = rx + s * (row.seatW + 4);
        rect(ctx, sx, row.y, row.seatW, row.seatH, seatColor);
        rect(ctx, sx, row.y, row.seatW, 3, headrestColor);
        rect(ctx, sx + row.seatW * 0.15, row.y - row.headH, row.seatW * 0.7, row.headH, headrestColor);
        rect(ctx, sx, row.y + row.seatH, row.seatW, row.seatH * 0.5, cushionColor);
      }
    }

    // ── Baked-in seated passengers (head/shoulder blobs above headrests) ──
    const passengers = [
      // [x, y, skinColor, hairColor]
      { x: 196, y: 362, skin: '#D2A679', hair: '#3B2314' },  // near row, left window
      { x: 280, y: 362, skin: '#F5D0B0', hair: '#FFD700' },  // near row, left aisle
      { x: 510, y: 362, skin: '#8D6E4C', hair: '#1A1A1A' },  // near row, right
      { x: 268, y: 246, skin: '#F0C8A0', hair: '#8B4513' },  // mid row, left
      { x: 455, y: 246, skin: '#C8956C', hair: '#2C1608' },  // mid row, right
    ];
    for (const p of passengers) {
      // Shoulders
      rect(ctx, p.x - 10, p.y, 20, 8, p.skin);
      // Head
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      // Hair (top half of head)
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 7, Math.PI, Math.PI * 2);
      ctx.fill();
    }

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

  // cabin-flight-attendant — 48×64: side-view attendant with drink cart
  {
    const c = scene.textures.createCanvas('cabin-flight-attendant', 48, 64);
    if (!c) return;
    const ctx = c.context;

    // ── Figure (top half, side-view) ──
    // Head
    ctx.fillStyle = '#F0C8A0';
    ctx.beginPath();
    ctx.arc(20, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    // Hair bun
    ctx.fillStyle = '#3B2314';
    ctx.beginPath();
    ctx.arc(20, 6, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Body (navy uniform)
    rect(ctx, 15, 14, 12, 20, '#1A1A5E');
    // Skirt
    rect(ctx, 14, 34, 14, 8, '#1A1A5E');
    // Legs
    rect(ctx, 16, 42, 4, 10, '#F0C8A0');
    rect(ctx, 24, 42, 4, 10, '#F0C8A0');
    // Shoes
    rect(ctx, 15, 52, 6, 2, '#1A1A1A');
    rect(ctx, 23, 52, 6, 2, '#1A1A1A');
    // Arm extended forward (holding cart)
    rect(ctx, 27, 18, 10, 3, '#1A1A5E');
    rect(ctx, 35, 18, 4, 3, '#F0C8A0');

    // ── Drink cart (right side, below arm level) ──
    // Cart body
    rect(ctx, 30, 22, 16, 28, '#999999');
    rect(ctx, 30, 22, 16, 2, '#AAAAAA'); // top rim
    // Wheels
    rect(ctx, 32, 50, 4, 4, '#555555');
    rect(ctx, 42, 50, 4, 4, '#555555');
    // Tray on top with glasses
    rect(ctx, 31, 20, 14, 2, '#BBBBBB');
    // Wine glass (red)
    rect(ctx, 33, 16, 3, 4, '#8B1A1A');
    rect(ctx, 34, 14, 1, 2, '#CCCCCC');
    // Wine glass (white)
    rect(ctx, 39, 16, 3, 4, '#EEEECC');
    rect(ctx, 40, 14, 1, 2, '#CCCCCC');

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

// ── Cutscene seated sprites (64×48, upper-body only) ─────────────────────

import { OUTFIT_STYLES } from './PixelArtGenerator';

export function generateCutsceneSeatedSprites(
  scene: Phaser.Scene,
  playerOutfitIdx: number,
  partnerOutfitIdx: number,
): void {
  const playerOutfit = OUTFIT_STYLES[playerOutfitIdx] ?? OUTFIT_STYLES[0];
  const partnerOutfit = OUTFIT_STYLES[partnerOutfitIdx] ?? OUTFIT_STYLES[0];

  // Helper: simplified front-facing hair (top of head + bangs)
  function drawSimpleHair(
    ctx: Ctx, hx: number, hy: number,
    color: string, style: string, isLong: boolean,
  ): void {
    const dark = darken(color, 0.2);
    const light = lighten(color, 0.15);
    // Top coverage
    rect(ctx, hx - 1, hy - 3, 18, 5, color);
    rect(ctx, hx + 2, hy - 4, 12, 3, color);
    rect(ctx, hx + 3, hy - 3, 10, 3, light);
    // Bangs
    rect(ctx, hx, hy + 1, 4, 2, color);
    rect(ctx, hx + 12, hy + 1, 4, 2, color);
    if (isLong) {
      // Long side curtains
      rect(ctx, hx - 2, hy + 1, 3, 14, color);
      rect(ctx, hx + 15, hy + 1, 3, 14, color);
      rect(ctx, hx - 3, hy + 8, 3, 10, color);
      rect(ctx, hx + 16, hy + 8, 3, 10, color);
      rect(ctx, hx - 3, hy + 16, 2, 3, dark);
      rect(ctx, hx + 17, hy + 16, 2, 3, dark);
    } else if (style === 'spiky') {
      // Spiky tips
      rect(ctx, hx + 1, hy - 6, 2, 2, color);
      rect(ctx, hx + 4, hy - 7, 3, 3, color);
      rect(ctx, hx + 8, hy - 6, 3, 2, color);
      rect(ctx, hx + 12, hy - 5, 2, 2, color);
    } else {
      // Short sides
      rect(ctx, hx - 1, hy + 1, 2, 3, color);
      rect(ctx, hx + 15, hy + 1, 2, 3, color);
    }
  }

  // ── cutscene-player-seated: female, front-facing, eyes open ──
  {
    const c = scene.textures.createCanvas('cutscene-player-seated', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const o = playerOutfit;
    const skin = o.skin;
    const shirtColor = o.shirt;
    const hairColor = o.hair;
    const hairStyle = o.hairStyle;

    // Head (16×14 rounded, centered at x=24)
    const hx = 24; const hy = 4;
    rect(ctx, hx + 1, hy, 14, 14, skin);
    rect(ctx, hx, hy + 1, 16, 12, skin);
    // Forehead highlight
    rect(ctx, hx + 4, hy + 1, 8, 2, lighten(skin, 0.1));
    // Eyes (open)
    rect(ctx, hx + 2, hy + 6, 4, 3, '#fff');
    rect(ctx, hx + 10, hy + 6, 4, 3, '#fff');
    px(ctx, hx + 3, hy + 7, '#334');
    px(ctx, hx + 4, hy + 7, '#334');
    px(ctx, hx + 11, hy + 7, '#334');
    px(ctx, hx + 12, hy + 7, '#334');
    // Blush
    rect(ctx, hx + 1, hy + 9, 3, 2, 'rgba(255,130,130,0.25)');
    rect(ctx, hx + 12, hy + 9, 3, 2, 'rgba(255,130,130,0.25)');
    // Mouth
    rect(ctx, hx + 6, hy + 11, 4, 1, '#c88');

    // Neck
    rect(ctx, 29, 18, 6, 3, skin);
    // Torso (female — narrower)
    rect(ctx, 20, 21, 24, 16, shirtColor);
    // Collar
    rect(ctx, 27, 20, 10, 2, darken(shirtColor, 0.15));
    // Arms resting on lap
    rect(ctx, 16, 28, 5, 10, shirtColor);
    rect(ctx, 43, 28, 5, 10, shirtColor);
    // Hands on lap
    rect(ctx, 24, 38, 6, 4, skin);
    rect(ctx, 34, 38, 6, 4, skin);

    // Hair (drawn last, on top)
    drawSimpleHair(ctx, hx, hy, hairColor, hairStyle, hairStyle === 'long' || hairStyle === 'ponytail');

    c.refresh();
  }

  // ── cutscene-partner-seated: male, front-facing ──
  {
    const c = scene.textures.createCanvas('cutscene-partner-seated', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const o = partnerOutfit;
    const skin = o.skin;
    const shirtColor = o.shirt;
    const hairColor = o.maleHair ?? o.hair;
    const hairStyle = o.maleHairStyle ?? o.hairStyle;

    // Head (wider jaw for male)
    const hx = 24; const hy = 3;
    rect(ctx, hx + 1, hy, 14, 14, skin);
    rect(ctx, hx, hy + 1, 16, 13, skin);
    // Stronger jaw
    rect(ctx, hx - 1, hy + 10, 18, 4, skin);
    // Eyes
    rect(ctx, hx + 2, hy + 5, 4, 3, '#fff');
    rect(ctx, hx + 10, hy + 5, 4, 3, '#fff');
    px(ctx, hx + 3, hy + 6, '#334');
    px(ctx, hx + 4, hy + 6, '#334');
    px(ctx, hx + 11, hy + 6, '#334');
    px(ctx, hx + 12, hy + 6, '#334');
    // Mouth
    rect(ctx, hx + 6, hy + 11, 4, 1, '#c88');

    // Neck (wider)
    rect(ctx, 28, 17, 8, 3, skin);
    // Torso (male — broader)
    rect(ctx, 18, 20, 28, 18, shirtColor);
    // Collar
    rect(ctx, 26, 19, 12, 2, darken(shirtColor, 0.15));
    // Arms at sides / one on armrest
    rect(ctx, 14, 24, 5, 12, shirtColor);
    rect(ctx, 45, 24, 5, 12, shirtColor);
    // Hands
    rect(ctx, 14, 36, 4, 3, skin);
    rect(ctx, 46, 36, 4, 3, skin);

    // Hair
    drawSimpleHair(ctx, hx, hy, hairColor, hairStyle, false);

    c.refresh();
  }

  // ── cutscene-player-resting: female, eyes closed (sleeping) ──
  {
    const c = scene.textures.createCanvas('cutscene-player-resting', 64, 48);
    if (!c) return;
    const ctx = c.context;
    const o = playerOutfit;
    const skin = o.skin;
    const shirtColor = o.shirt;
    const hairColor = o.hair;
    const hairStyle = o.hairStyle;

    // Head
    const hx = 24; const hy = 4;
    rect(ctx, hx + 1, hy, 14, 14, skin);
    rect(ctx, hx, hy + 1, 16, 12, skin);
    rect(ctx, hx + 4, hy + 1, 8, 2, lighten(skin, 0.1));
    // Eyes CLOSED — horizontal lines
    rect(ctx, hx + 2, hy + 7, 4, 1, '#556');
    rect(ctx, hx + 10, hy + 7, 4, 1, '#556');
    // Eyelashes (closed)
    px(ctx, hx + 1, hy + 7, '#445');
    px(ctx, hx + 6, hy + 7, '#445');
    px(ctx, hx + 9, hy + 7, '#445');
    px(ctx, hx + 14, hy + 7, '#445');
    // Blush (stronger when sleeping)
    rect(ctx, hx + 1, hy + 9, 3, 2, 'rgba(255,130,130,0.35)');
    rect(ctx, hx + 12, hy + 9, 3, 2, 'rgba(255,130,130,0.35)');
    // Slight smile
    rect(ctx, hx + 6, hy + 11, 4, 1, '#c88');
    px(ctx, hx + 5, hy + 10, '#c88');
    px(ctx, hx + 10, hy + 10, '#c88');

    // Neck
    rect(ctx, 29, 18, 6, 3, skin);
    // Torso
    rect(ctx, 20, 21, 24, 16, shirtColor);
    rect(ctx, 27, 20, 10, 2, darken(shirtColor, 0.15));
    // Arms
    rect(ctx, 16, 28, 5, 10, shirtColor);
    rect(ctx, 43, 28, 5, 10, shirtColor);
    // Hands on lap
    rect(ctx, 24, 38, 6, 4, skin);
    rect(ctx, 34, 38, 6, 4, skin);

    // Hair
    drawSimpleHair(ctx, hx, hy, hairColor, hairStyle, hairStyle === 'long' || hairStyle === 'ponytail');

    c.refresh();
  }
}

// ── Boarding animation textures ───────────────────────────────────────────

function generateBoardingTextures(scene: Phaser.Scene): void {
  // boarding-tarmac — 800×200: dark gray asphalt with yellow dashed lines
  {
    const c = scene.textures.createCanvas('boarding-tarmac', 800, 200);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 800, 200, '#555555');
    // Asphalt texture variation
    rect(ctx, 0, 0, 800, 200, '#525252');
    rect(ctx, 0, 100, 800, 100, '#585858');
    // Yellow dashed center line
    ctx.fillStyle = '#DDAA00';
    for (let x = 20; x < 780; x += 40) {
      ctx.fillRect(x, 95, 20, 4);
    }
    // Edge markings
    rect(ctx, 0, 0, 800, 2, '#777777');
    rect(ctx, 0, 198, 800, 2, '#777777');
    c.refresh();
  }

  // boarding-terminal — 120×200: gray building wall with doorway
  {
    const c = scene.textures.createCanvas('boarding-terminal', 120, 200);
    if (!c) return;
    const ctx = c.context;
    // Main wall
    rect(ctx, 0, 0, 120, 200, '#8A8A8A');
    // Roof line
    rect(ctx, 0, 0, 120, 8, '#2244AA');
    rect(ctx, 0, 0, 120, 2, lighten('#2244AA', 0.2));
    // Doorway opening at y=50
    rect(ctx, 80, 50, 40, 80, '#333333');
    rect(ctx, 82, 52, 36, 76, '#222222');
    // Door frame
    rect(ctx, 78, 48, 2, 84, '#666666');
    rect(ctx, 78, 48, 42, 2, '#666666');
    // Windows
    for (let y = 20; y < 45; y += 24) {
      for (let x = 10; x < 70; x += 28) {
        rect(ctx, x, y, 18, 14, '#AADDFF');
        rect(ctx, x, y, 18, 1, '#777777');
        rect(ctx, x + 8, y, 2, 14, '#777777');
        rect(ctx, x, y + 13, 18, 1, '#777777');
      }
    }
    // Wall texture lines
    rect(ctx, 0, 130, 120, 1, '#7A7A7A');
    rect(ctx, 0, 160, 120, 1, '#7A7A7A');
    c.refresh();
  }

  // boarding-roller-stairs — 80×80: metal staircase angling down-right from terminal
  {
    const c = scene.textures.createCanvas('boarding-roller-stairs', 80, 80);
    if (!c) return;
    const ctx = c.context;
    // Staircase frame angling from top-left to bottom-right
    ctx.fillStyle = '#999999';
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(75, 65);
    ctx.lineTo(75, 75);
    ctx.lineTo(5, 20);
    ctx.closePath();
    ctx.fill();
    // Step treads
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const sx = 8 + i * 8;
      const sy = 12 + i * 7;
      rect(ctx, sx, sy, 9, 2, '#BBBBBB');
      rect(ctx, sx, sy + 2, 9, 1, '#777777');
    }
    // Left handrail
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 6);
    ctx.lineTo(72, 60);
    ctx.stroke();
    // Right handrail
    ctx.beginPath();
    ctx.moveTo(10, 22);
    ctx.lineTo(78, 76);
    ctx.stroke();
    // Platform at top
    rect(ctx, 0, 8, 12, 14, '#888888');
    rect(ctx, 0, 8, 12, 2, '#AAAAAA');
    c.refresh();
  }

  // boarding-mobile-stairs — 64×100: wheeled stairs angling up-right to plane door
  {
    const c = scene.textures.createCanvas('boarding-mobile-stairs', 64, 100);
    if (!c) return;
    const ctx = c.context;
    // Staircase frame angling from bottom-left up to top-right
    ctx.fillStyle = '#999999';
    ctx.beginPath();
    ctx.moveTo(5, 85);
    ctx.lineTo(58, 15);
    ctx.lineTo(62, 15);
    ctx.lineTo(62, 25);
    ctx.lineTo(10, 90);
    ctx.closePath();
    ctx.fill();
    // Step treads
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const sx = 8 + i * 6;
      const sy = 82 - i * 8;
      rect(ctx, sx, sy, 8, 2, '#BBBBBB');
      rect(ctx, sx, sy + 2, 8, 1, '#777777');
    }
    // Yellow safety stripes at base
    for (let x = 2; x < 20; x += 6) {
      rect(ctx, x, 88, 3, 6, '#DDAA00');
    }
    // Handrails
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 82);
    ctx.lineTo(56, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 90);
    ctx.lineTo(62, 20);
    ctx.stroke();
    // Wheels at base
    ctx.fillStyle = '#444444';
    ctx.beginPath();
    ctx.arc(8, 96, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 96, 4, 0, Math.PI * 2);
    ctx.fill();
    // Platform at top
    rect(ctx, 52, 12, 12, 16, '#888888');
    rect(ctx, 52, 12, 12, 2, '#AAAAAA');
    c.refresh();
  }

  // boarding-traveler-1 through boarding-traveler-4: tiny side-view silhouettes
  const travelerColors = [
    { shirt: '#CC4444', pants: '#333366', skin: '#d4a574', hair: '#443322' },
    { shirt: '#4488CC', pants: '#444444', skin: '#e8c090', hair: '#222222' },
    { shirt: '#44AA44', pants: '#555555', skin: '#8B6B4A', hair: '#111111' },
    { shirt: '#CC8844', pants: '#3344AA', skin: '#F0C8A0', hair: '#554433' },
  ];
  for (let i = 0; i < 4; i++) {
    const tc = travelerColors[i];
    const c = scene.textures.createCanvas(`boarding-traveler-${i + 1}`, 12, 20);
    if (!c) continue;
    const ctx = c.context;
    // Head
    ctx.fillStyle = tc.skin;
    ctx.beginPath();
    ctx.arc(6, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Hair (top half)
    ctx.fillStyle = tc.hair;
    ctx.beginPath();
    ctx.arc(6, 3, 3, Math.PI, Math.PI * 2);
    ctx.fill();
    // Body
    rect(ctx, 3, 7, 6, 6, tc.shirt);
    // Pants/legs
    rect(ctx, 3, 13, 3, 5, tc.pants);
    rect(ctx, 6, 13, 3, 5, tc.pants);
    // Shoes
    rect(ctx, 3, 18, 3, 2, '#333333');
    rect(ctx, 6, 18, 3, 2, '#333333');
    c.refresh();
  }

  // boarding-player-side — 12×20: recognizable player colors
  {
    const playerOutfit = OUTFIT_STYLES[0];
    const c = scene.textures.createCanvas('boarding-player-side', 12, 20);
    if (!c) return;
    const ctx = c.context;
    // Head
    ctx.fillStyle = playerOutfit.skin;
    ctx.beginPath();
    ctx.arc(6, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = playerOutfit.hair;
    ctx.beginPath();
    ctx.arc(6, 3, 3, Math.PI, Math.PI * 2);
    ctx.fill();
    // Long hair sides
    rect(ctx, 2, 4, 2, 6, playerOutfit.hair);
    rect(ctx, 8, 4, 2, 6, playerOutfit.hair);
    // Body
    rect(ctx, 3, 7, 6, 6, playerOutfit.shirt);
    // Pants/legs
    rect(ctx, 3, 13, 3, 5, playerOutfit.pants);
    rect(ctx, 6, 13, 3, 5, playerOutfit.pants);
    // Shoes
    rect(ctx, 3, 18, 3, 2, '#443322');
    rect(ctx, 6, 18, 3, 2, '#443322');
    c.refresh();
  }

  // boarding-partner-side — 12×20: recognizable partner colors
  {
    const partnerOutfit = OUTFIT_STYLES[0];
    const c = scene.textures.createCanvas('boarding-partner-side', 12, 20);
    if (!c) return;
    const ctx = c.context;
    // Head
    ctx.fillStyle = partnerOutfit.skin;
    ctx.beginPath();
    ctx.arc(6, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Hair (male partner - use maleHair color)
    const partnerHair = partnerOutfit.maleHair ?? partnerOutfit.hair;
    ctx.fillStyle = partnerHair;
    ctx.beginPath();
    ctx.arc(6, 3, 3, Math.PI, Math.PI * 2);
    ctx.fill();
    // Short hair sides
    rect(ctx, 2, 4, 2, 3, partnerHair);
    rect(ctx, 8, 4, 2, 3, partnerHair);
    // Body (broader shoulders)
    rect(ctx, 2, 7, 8, 6, partnerOutfit.shirt);
    // Pants/legs
    rect(ctx, 3, 13, 3, 5, partnerOutfit.pants);
    rect(ctx, 6, 13, 3, 5, partnerOutfit.pants);
    // Shoes
    rect(ctx, 3, 18, 3, 2, '#443322');
    rect(ctx, 6, 18, 3, 2, '#443322');
    c.refresh();
  }
}

// ── Airplane taxiing sprite (top-down, 64×32) ──────────────────────────

function generateAirplaneTaxiingTexture(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('airplane-taxiing', 64, 32);
  if (!c) return;
  const ctx = c.context;

  // White fuselage (horizontal, centered)
  rect(ctx, 8, 12, 48, 8, '#EEEEF0');
  // Nose cone
  rect(ctx, 56, 13, 4, 6, '#DDDDE0');
  px(ctx, 60, 14, '#DDDDE0'); px(ctx, 60, 17, '#DDDDE0');
  px(ctx, 61, 15, '#CCCCCC'); px(ctx, 61, 16, '#CCCCCC');
  // Tail
  rect(ctx, 4, 10, 6, 12, '#DDDDE0');

  // Grey wings (swept back)
  rect(ctx, 20, 2, 18, 6, '#AAAAAA');
  rect(ctx, 20, 24, 18, 6, '#AAAAAA');
  // Wing tips
  rect(ctx, 18, 4, 4, 2, '#999999');
  rect(ctx, 18, 26, 4, 2, '#999999');

  // Blue tail fin (vertical stabilizer)
  rect(ctx, 2, 8, 6, 4, '#2244AA');
  rect(ctx, 0, 9, 4, 2, '#2244AA');

  // Tiny window dots along fuselage
  for (let x = 14; x < 54; x += 4) {
    px(ctx, x, 14, '#88AACC');
    px(ctx, x, 17, '#88AACC');
  }

  // Engine nacelles (under wings)
  rect(ctx, 26, 8, 6, 3, '#999999');
  rect(ctx, 26, 21, 6, 3, '#999999');

  c.refresh();
}

// ── Airport exterior decoration textures ────────────────────────────────

function generateExteriorDecoTextures(scene: Phaser.Scene): void {
  // deco-airport-fence (32×32): chain-link fence with posts and rails
  {
    const c = scene.textures.createCanvas('deco-airport-fence', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Posts
    rect(ctx, 2, 4, 3, 28, '#888888');
    rect(ctx, 27, 4, 3, 28, '#888888');
    // Post caps
    rect(ctx, 1, 2, 5, 3, '#999999');
    rect(ctx, 26, 2, 5, 3, '#999999');
    // Top rail
    rect(ctx, 5, 6, 22, 2, '#AAAAAA');
    // Bottom rail
    rect(ctx, 5, 26, 22, 2, '#AAAAAA');
    // Chain-link pattern (diagonal cross-hatch)
    for (let i = 0; i < 20; i += 3) {
      for (let j = 0; j < 16; j += 3) {
        px(ctx, 6 + i, 10 + j, '#7A7A7A');
        px(ctx, 7 + i, 11 + j, '#7A7A7A');
      }
    }
    c.refresh();
  }

  // deco-windsock (32×32): pole with orange/white striped cone
  {
    const c = scene.textures.createCanvas('deco-windsock', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Pole
    rect(ctx, 15, 8, 2, 24, '#888888');
    rect(ctx, 14, 6, 4, 3, '#999999');
    // Windsock cone (blowing right)
    const sockColors = ['#FF6600', '#FFFFFF', '#FF6600', '#FFFFFF', '#FF6600'];
    for (let i = 0; i < 5; i++) {
      const segW = 3;
      const segH = 8 - i;
      rect(ctx, 17 + i * segW, 6 + Math.floor(i / 2), segW, segH, sockColors[i]);
    }
    c.refresh();
  }

  // deco-runway-light (32×32): yellow light with subtle glow
  {
    const c = scene.textures.createCanvas('deco-runway-light', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Base mount
    rect(ctx, 13, 22, 6, 10, '#666666');
    rect(ctx, 12, 20, 8, 3, '#777777');
    // Light housing
    rect(ctx, 12, 16, 8, 5, '#888888');
    // Yellow light
    rect(ctx, 13, 17, 6, 3, '#FFCC00');
    // Subtle glow
    rect(ctx, 10, 14, 12, 2, 'rgba(255,204,0,0.25)');
    rect(ctx, 11, 12, 10, 2, 'rgba(255,204,0,0.15)');
    c.refresh();
  }

  // car-taxi (32×32): yellow taxi matching deco-maui-parkedcar size
  {
    const c = scene.textures.createCanvas('car-taxi', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Car body
    rect(ctx, 4, 10, 24, 14, '#F0C030');
    // Roof
    rect(ctx, 8, 6, 16, 6, '#E8B828');
    // Windshield
    rect(ctx, 8, 6, 6, 5, '#AADDFF');
    rect(ctx, 18, 6, 6, 5, '#AADDFF');
    // Wheels
    rect(ctx, 6, 24, 6, 4, '#333333');
    rect(ctx, 20, 24, 6, 4, '#333333');
    // Headlights
    rect(ctx, 4, 12, 2, 2, '#FFFFAA');
    rect(ctx, 26, 12, 2, 2, '#FFFFAA');
    // Taxi sign on roof
    rect(ctx, 12, 4, 8, 3, '#FFFFFF');
    px(ctx, 14, 5, '#333333'); px(ctx, 15, 5, '#333333'); px(ctx, 17, 5, '#333333');
    // Door line
    rect(ctx, 15, 12, 1, 10, darken('#F0C030', 0.15));
    c.refresh();
  }

  // npc-suitcase (48×48): traveler NPC holding a suitcase
  {
    const c = scene.textures.createCanvas('npc-suitcase', 48, 48);
    if (!c) return;
    const ctx = c.context;
    const skin = '#e0b080';
    const shirt = '#4488AA';
    const pants = '#334455';

    // Shadow
    rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

    // Shoes
    rect(ctx, 16, 40, 6, 3, '#443322');
    rect(ctx, 26, 40, 6, 3, '#443322');

    // Legs
    rect(ctx, 17, 34, 5, 7, pants);
    rect(ctx, 26, 34, 5, 7, pants);

    // Torso
    rect(ctx, 16, 22, 16, 13, shirt);
    rect(ctx, 16, 22, 16, 2, lighten(shirt, 0.15));

    // Arms
    rect(ctx, 12, 23, 4, 12, shirt);
    rect(ctx, 32, 23, 4, 10, shirt);
    // Hands
    rect(ctx, 12, 35, 4, 2, skin);
    rect(ctx, 32, 33, 4, 2, skin);

    // Head
    rect(ctx, 18, 10, 12, 12, skin);
    // Hair
    rect(ctx, 17, 8, 14, 5, '#554433');
    // Eyes
    px(ctx, 21, 15, '#333333');
    px(ctx, 27, 15, '#333333');

    // Suitcase (held by right hand)
    rect(ctx, 33, 34, 8, 10, '#AA4444');
    rect(ctx, 33, 34, 8, 1, lighten('#AA4444', 0.2));
    rect(ctx, 36, 32, 2, 3, '#888888'); // handle

    c.refresh();
  }
}

// ── Check-in prop textures ───────────────────────────────────────────────

function generateCheckinPropTextures(scene: Phaser.Scene): void {
  // prop-boarding-pass (48x24) — white card with barcode lines
  {
    const c = scene.textures.createCanvas('prop-boarding-pass', 48, 24);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 48, 24, '#FFFFFF');
    rect(ctx, 0, 0, 48, 1, '#CCCCCC');
    rect(ctx, 0, 23, 48, 1, '#CCCCCC');
    rect(ctx, 0, 0, 1, 24, '#CCCCCC');
    rect(ctx, 47, 0, 1, 24, '#CCCCCC');
    // Header bar
    rect(ctx, 2, 2, 44, 5, '#2255AA');
    // "BOARDING PASS" text (tiny dots)
    for (let x = 6; x < 42; x += 3) {
      rect(ctx, x, 3, 2, 3, '#FFFFFF');
    }
    // Destination text line
    rect(ctx, 4, 9, 20, 2, '#333333');
    // Seat text line
    rect(ctx, 4, 13, 12, 2, '#333333');
    // Barcode
    for (let x = 28; x < 46; x += 2) {
      rect(ctx, x, 9, 1, 12, '#000000');
    }
    // Dashed tear line
    for (let x = 25; x < 26; x++) {
      for (let y = 2; y < 22; y += 3) {
        px(ctx, x, y, '#AAAAAA');
      }
    }
    c.refresh();
  }

  // prop-passport (24x32) — dark blue booklet with gold emblem
  {
    const c = scene.textures.createCanvas('prop-passport', 24, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 24, 32, '#1A3A6A');
    rect(ctx, 0, 0, 24, 1, lighten('#1A3A6A'));
    rect(ctx, 0, 31, 24, 1, darken('#1A3A6A'));
    // Gold emblem (circle)
    rect(ctx, 9, 10, 6, 6, '#C8A84E');
    rect(ctx, 10, 9, 4, 8, '#C8A84E');
    // Text lines
    rect(ctx, 6, 20, 12, 1, '#C8A84E');
    rect(ctx, 8, 23, 8, 1, '#C8A84E');
    // Spine
    rect(ctx, 0, 0, 2, 32, darken('#1A3A6A', 0.15));
    c.refresh();
  }

  // prop-stamp (24x24) — red circular stamp
  {
    const c = scene.textures.createCanvas('prop-stamp', 24, 24);
    if (!c) return;
    const ctx = c.context;
    ctx.strokeStyle = '#CC3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Inner text lines
    rect(ctx, 7, 9, 10, 1, '#CC3333');
    rect(ctx, 8, 12, 8, 1, '#CC3333');
    rect(ctx, 7, 15, 10, 1, '#CC3333');
    c.refresh();
  }

  // prop-suitcase (24x20) — small suitcase for luggage animation
  {
    const c = scene.textures.createCanvas('prop-suitcase', 24, 20);
    if (!c) return;
    const ctx = c.context;
    // Body
    rect(ctx, 2, 4, 20, 14, '#8B4513');
    rect(ctx, 2, 4, 20, 2, lighten('#8B4513', 0.2));
    // Handle
    rect(ctx, 9, 1, 6, 4, '#555555');
    rect(ctx, 10, 0, 4, 2, '#555555');
    // Clasp
    rect(ctx, 10, 10, 4, 2, '#C8A84E');
    // Wheels
    rect(ctx, 5, 18, 3, 2, '#333333');
    rect(ctx, 16, 18, 3, 2, '#333333');
    c.refresh();
  }

  // prop-luggage-tag (16x10) — small white tag with barcode
  {
    const c = scene.textures.createCanvas('prop-luggage-tag', 16, 10);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 16, 10, '#FFFFFF');
    rect(ctx, 0, 0, 16, 1, '#DDDDDD');
    rect(ctx, 0, 9, 16, 1, '#DDDDDD');
    // Barcode
    for (let x = 2; x < 14; x += 2) {
      rect(ctx, x, 3, 1, 5, '#000000');
    }
    // String hole
    rect(ctx, 1, 1, 2, 2, '#AAAAAA');
    c.refresh();
  }

  // prop-scale-display (32x16) — digital weight readout
  {
    const c = scene.textures.createCanvas('prop-scale-display', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#222222');
    rect(ctx, 1, 1, 30, 14, '#111111');
    // Green digits "18.5"
    rect(ctx, 4, 4, 4, 8, '#00FF66');
    rect(ctx, 10, 4, 4, 8, '#00FF66');
    rect(ctx, 15, 10, 2, 2, '#00FF66'); // decimal
    rect(ctx, 18, 4, 4, 8, '#00FF66');
    // "kg" text
    rect(ctx, 24, 6, 3, 1, '#00FF66');
    rect(ctx, 24, 9, 3, 1, '#00FF66');
    c.refresh();
  }

  // prop-security-bin (32x12) — grey tray
  {
    const c = scene.textures.createCanvas('prop-security-bin', 32, 12);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 2, 32, 10, '#888888');
    rect(ctx, 1, 0, 30, 3, '#999999');
    rect(ctx, 2, 3, 28, 8, '#777777');
    rect(ctx, 1, 0, 30, 1, lighten('#999999'));
    c.refresh();
  }

  // prop-small-items (24x8) — phone + keys + wallet cluster
  {
    const c = scene.textures.createCanvas('prop-small-items', 24, 8);
    if (!c) return;
    const ctx = c.context;
    // Phone
    rect(ctx, 1, 1, 5, 7, '#222222');
    rect(ctx, 2, 2, 3, 4, '#4488CC');
    // Keys
    rect(ctx, 9, 2, 3, 3, '#CCAA44');
    rect(ctx, 10, 5, 1, 2, '#CCAA44');
    rect(ctx, 12, 4, 2, 1, '#CCAA44');
    // Wallet
    rect(ctx, 16, 1, 7, 6, '#664422');
    rect(ctx, 16, 1, 7, 1, lighten('#664422'));
    c.refresh();
  }

  // prop-scanner-line (32x2) — thin red scanning line
  {
    const c = scene.textures.createCanvas('prop-scanner-line', 32, 2);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 2, '#FF3333');
    rect(ctx, 0, 0, 32, 1, '#FF6666');
    c.refresh();
  }

  // prop-checkmark (16x16) — green checkmark
  {
    const c = scene.textures.createCanvas('prop-checkmark', 16, 16);
    if (!c) return;
    const ctx = c.context;
    ctx.strokeStyle = '#33CC33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(6, 13);
    ctx.lineTo(14, 3);
    ctx.stroke();
    c.refresh();
  }

  // prop-departure-board (128x96) — flip-board overlay with destinations
  {
    const c = scene.textures.createCanvas('prop-departure-board', 128, 96);
    if (!c) return;
    const ctx = c.context;
    // Board background
    rect(ctx, 0, 0, 128, 96, '#1A1A1A');
    rect(ctx, 0, 0, 128, 2, '#444444');
    rect(ctx, 0, 94, 128, 2, '#444444');
    // Title bar
    rect(ctx, 0, 0, 128, 16, '#333333');
    // "DEPARTURES" text dots
    for (let x = 20; x < 108; x += 4) {
      rect(ctx, x, 5, 3, 6, '#FFAA00');
    }
    // Row 1: MAUI — highlighted
    rect(ctx, 4, 20, 120, 18, '#2A3A2A');
    rect(ctx, 8, 24, 40, 2, '#FFAA00'); // destination
    rect(ctx, 60, 24, 20, 2, '#FFAA00'); // time
    rect(ctx, 88, 24, 32, 2, '#33CC33'); // status: ON TIME
    rect(ctx, 8, 29, 30, 2, '#FFAA00'); // flight number
    // Row 2: PARIS — greyed
    rect(ctx, 4, 42, 120, 18, '#222222');
    rect(ctx, 8, 46, 40, 2, '#555555');
    rect(ctx, 60, 46, 20, 2, '#555555');
    rect(ctx, 88, 46, 32, 2, '#555555'); // COMING SOON
    // Row 3: TOKYO — greyed
    rect(ctx, 4, 64, 120, 18, '#222222');
    rect(ctx, 8, 68, 40, 2, '#555555');
    rect(ctx, 60, 68, 20, 2, '#555555');
    rect(ctx, 88, 68, 32, 2, '#555555');
    c.refresh();
  }

  // interior-airport-passport-desk (32x32) — small desk for passport control
  {
    const c = scene.textures.createCanvas('interior-airport-passport-desk', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Desk body
    rect(ctx, 0, 12, 32, 20, '#5C4033');
    rect(ctx, 0, 10, 32, 4, '#6B4F3A');
    rect(ctx, 0, 10, 32, 1, lighten('#6B4F3A', 0.2));
    // Small computer/screen on desk
    rect(ctx, 20, 4, 8, 7, '#333333');
    rect(ctx, 21, 5, 6, 5, '#4488AA');
    rect(ctx, 23, 11, 4, 1, '#333333');
    // Stamp pad
    rect(ctx, 4, 6, 6, 4, '#222222');
    rect(ctx, 5, 7, 4, 2, '#881111');
    c.refresh();
  }

  // interior-airport-luggage-belt (32x32) — check-in luggage conveyor
  {
    const c = scene.textures.createCanvas('interior-airport-luggage-belt', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Belt base
    rect(ctx, 0, 14, 32, 12, '#444444');
    // Silver rails
    rect(ctx, 0, 13, 32, 2, '#AAAAAA');
    rect(ctx, 0, 25, 32, 2, '#AAAAAA');
    // Rollers
    for (let x = 3; x < 30; x += 4) {
      rect(ctx, x, 16, 2, 8, '#555555');
    }
    // Scale platform on top
    rect(ctx, 4, 8, 24, 6, '#666666');
    rect(ctx, 4, 8, 24, 1, lighten('#666666', 0.2));
    // Legs
    rect(ctx, 2, 27, 3, 5, '#777777');
    rect(ctx, 27, 27, 3, 5, '#777777');
    c.refresh();
  }
}

// ── Main export ──────────────────────────────────────────────────────────

function generateStationSignTextures(scene: Phaser.Scene): void {
  const colors = ['#E74C3C', '#E67E22', '#2ECC71', '#3498DB', '#9B59B6'];
  for (let i = 0; i < 5; i++) {
    const key = `interior-airport-sign-${i + 1}`;
    const c = scene.textures.createCanvas(key, 32, 32);
    if (!c) continue;
    const ctx = c.context;

    // Circle background
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(16, 16, 13, 0, Math.PI * 2);
    ctx.fill();

    // Darker border
    ctx.strokeStyle = darken(colors[i], 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 13, 0, Math.PI * 2);
    ctx.stroke();

    // Number text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, 16, 17);

    c.refresh();
  }
}

// ── Ben Gurion airport textures ──────────────────────────────────────────

function generateBenGurionTextures(scene: Phaser.Scene): void {

  // ── Interior Decorations (32×32) ─────────────────────────────────────

  // interior-airport-duty-free-counter: glass-topped display counter
  {
    const c = scene.textures.createCanvas('interior-airport-duty-free-counter', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Wood base
    rect(ctx, 0, 12, 32, 20, '#A0824A');
    rect(ctx, 0, 12, 32, 1, lighten('#A0824A', 0.2));
    // Front panel detail
    rect(ctx, 2, 15, 28, 15, darken('#A0824A', 0.15));
    // Glass top surface
    ctx.fillStyle = 'rgba(135,206,235,0.6)';
    ctx.fillRect(0, 8, 32, 5);
    rect(ctx, 0, 8, 32, 1, lighten('#87CEEB', 0.3));
    // Small colored items visible inside counter
    rect(ctx, 4, 10, 3, 2, '#CC4444');   // red item
    rect(ctx, 10, 10, 3, 2, '#FFD700');  // gold item
    rect(ctx, 17, 10, 3, 2, '#4488CC'); // blue item
    rect(ctx, 24, 10, 3, 2, '#CC4444'); // red item
    c.refresh();
  }

  // interior-airport-duty-free-shelf: tall shelf with bottles/boxes
  {
    const c = scene.textures.createCanvas('interior-airport-duty-free-shelf', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Brown frame
    rect(ctx, 0, 0, 3, 32, '#8B6914');
    rect(ctx, 29, 0, 3, 32, '#8B6914');
    rect(ctx, 0, 0, 32, 2, '#8B6914');
    // Shelf levels
    rect(ctx, 3, 10, 26, 2, darken('#8B6914', 0.1));
    rect(ctx, 3, 20, 26, 2, darken('#8B6914', 0.1));
    rect(ctx, 3, 30, 26, 2, darken('#8B6914', 0.1));
    // Items on top shelf (y=2 to y=10)
    rect(ctx, 5, 3, 4, 7, '#CC2222');   // red box
    rect(ctx, 11, 4, 3, 6, '#FFD700');  // gold bottle
    rect(ctx, 16, 3, 4, 7, '#2244AA'); // blue box
    rect(ctx, 23, 3, 3, 7, '#CC8822'); // amber
    // Items on middle shelf (y=12 to y=20)
    rect(ctx, 5, 13, 3, 7, '#FFD700');
    rect(ctx, 11, 13, 4, 7, '#CC2222');
    rect(ctx, 18, 13, 3, 7, '#2244AA');
    rect(ctx, 24, 14, 3, 6, '#996633');
    // Items on bottom shelf (y=22 to y=30)
    rect(ctx, 5, 23, 4, 7, '#2244AA');
    rect(ctx, 12, 23, 3, 7, '#CC2222');
    rect(ctx, 18, 24, 4, 6, '#FFD700');
    c.refresh();
  }

  // interior-airport-perfume-display: small display stand with bottles
  {
    const c = scene.textures.createCanvas('interior-airport-perfume-display', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // White base/stand
    rect(ctx, 4, 22, 24, 10, '#E8E8E8');
    rect(ctx, 4, 22, 24, 1, lighten('#E8E8E8', 0.2));
    rect(ctx, 8, 18, 16, 5, '#E8E8E8');
    // 3 perfume bottles (circle bodies with tiny necks)
    // Pink bottle
    ctx.fillStyle = '#F080A0';
    ctx.beginPath();
    ctx.arc(9, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 8, 8, 3, 4, '#F080A0');  // neck
    rect(ctx, 7, 7, 5, 2, '#C86080'); // cap
    // Gold bottle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(16, 13, 4, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 15, 7, 3, 4, '#FFD700');
    rect(ctx, 14, 6, 5, 2, '#C8A800');
    // Blue bottle
    ctx.fillStyle = '#4488CC';
    ctx.beginPath();
    ctx.arc(23, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 22, 8, 3, 4, '#4488CC');
    rect(ctx, 21, 7, 5, 2, '#224488');
    c.refresh();
  }

  // interior-airport-liquor-display: shelf with tall bottles
  {
    const c = scene.textures.createCanvas('interior-airport-liquor-display', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Dark wood shelf
    rect(ctx, 0, 0, 32, 32, '#5C3A1E');
    rect(ctx, 0, 28, 32, 4, darken('#5C3A1E', 0.2));
    rect(ctx, 0, 28, 32, 1, lighten('#5C3A1E', 0.1));
    // Back wall slightly lighter
    rect(ctx, 2, 2, 28, 26, '#6B4A2E');
    // Bottle 1: amber/whisky
    rect(ctx, 3, 6, 5, 22, '#C87020');
    rect(ctx, 4, 4, 3, 3, '#C87020');
    rect(ctx, 3, 6, 5, 2, lighten('#C87020', 0.2));
    // Bottle 2: green/gin
    rect(ctx, 10, 8, 5, 20, '#406020');
    rect(ctx, 11, 6, 3, 3, '#406020');
    rect(ctx, 10, 8, 5, 2, lighten('#406020', 0.2));
    // Bottle 3: clear/vodka
    rect(ctx, 17, 6, 5, 22, '#CCDDEE');
    rect(ctx, 18, 4, 3, 3, '#CCDDEE');
    rect(ctx, 17, 6, 5, 1, lighten('#CCDDEE', 0.2));
    // Bottle 4: amber/cognac (slightly taller)
    rect(ctx, 24, 4, 5, 24, '#8B4010');
    rect(ctx, 25, 2, 3, 3, '#8B4010');
    rect(ctx, 24, 4, 5, 2, lighten('#8B4010', 0.2));
    c.refresh();
  }

  // interior-airport-cash-register: small register with screen and keypad
  {
    const c = scene.textures.createCanvas('interior-airport-cash-register', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Gray base body
    rect(ctx, 4, 14, 24, 18, '#888888');
    rect(ctx, 4, 14, 24, 1, lighten('#888888', 0.2));
    // Screen
    rect(ctx, 8, 6, 18, 10, '#333333');
    rect(ctx, 9, 7, 16, 8, '#1A2A1A');
    // Screen text (green digits)
    rect(ctx, 10, 9, 10, 2, '#00CC44');
    // Keypad dots (3×3 grid)
    for (let kx = 0; kx < 3; kx++) {
      for (let ky = 0; ky < 3; ky++) {
        rect(ctx, 8 + kx * 5, 18 + ky * 4, 3, 3, '#555555');
      }
    }
    // Cash drawer
    rect(ctx, 6, 26, 20, 4, '#777777');
    rect(ctx, 6, 26, 20, 1, lighten('#777777', 0.15));
    rect(ctx, 14, 27, 4, 2, darken('#777777', 0.1));
    c.refresh();
  }

  // interior-airport-food-court-table: round table top-down view
  {
    const c = scene.textures.createCanvas('interior-airport-food-court-table', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Shadow beneath
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(16, 18, 12, 0, Math.PI * 2);
    ctx.fill();
    // Table top (brown circle)
    ctx.fillStyle = '#A0824A';
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    // Lighter center
    ctx.fillStyle = lighten('#A0824A', 0.25);
    ctx.beginPath();
    ctx.arc(16, 15, 7, 0, Math.PI * 2);
    ctx.fill();
    // Table edge highlight
    ctx.strokeStyle = lighten('#A0824A', 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 16, 12, Math.PI * 1.3, Math.PI * 1.8);
    ctx.stroke();
    c.refresh();
  }

  // interior-airport-moving-walkway: gray conveyor with directional arrows
  {
    const c = scene.textures.createCanvas('interior-airport-moving-walkway', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Gray conveyor body
    rect(ctx, 0, 8, 32, 16, '#888888');
    // Side rails
    rect(ctx, 0, 7, 32, 2, '#AAAAAA');
    rect(ctx, 0, 23, 32, 2, '#AAAAAA');
    // Belt segments
    for (let x = 0; x < 32; x += 6) {
      rect(ctx, x, 10, 4, 12, '#7A7A7A');
    }
    // White directional arrow (pointing right) — x=10, y=12
    // Arrow shaft
    rect(ctx, 8, 15, 10, 2, '#FFFFFF');
    // Arrow head (triangle pointing right)
    px(ctx, 18, 13, '#FFFFFF');
    px(ctx, 19, 14, '#FFFFFF');
    px(ctx, 20, 15, '#FFFFFF');
    px(ctx, 20, 16, '#FFFFFF');
    px(ctx, 19, 17, '#FFFFFF');
    px(ctx, 18, 18, '#FFFFFF');
    c.refresh();
  }

  // interior-airport-doorway-barrier: retractable red belt barrier
  {
    const c = scene.textures.createCanvas('interior-airport-doorway-barrier', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Left silver post
    rect(ctx, 3, 6, 4, 26, '#AAAAAA');
    rect(ctx, 2, 4, 6, 4, '#BBBBBB');
    rect(ctx, 2, 4, 6, 1, lighten('#BBBBBB', 0.2));
    // Right silver post
    rect(ctx, 25, 6, 4, 26, '#AAAAAA');
    rect(ctx, 24, 4, 6, 4, '#BBBBBB');
    rect(ctx, 24, 4, 6, 1, lighten('#BBBBBB', 0.2));
    // Red retractable belt
    rect(ctx, 7, 14, 18, 3, '#CC3333');
    rect(ctx, 7, 14, 18, 1, lighten('#CC3333', 0.2));
    // Belt sag at center
    px(ctx, 15, 16, '#AA2222');
    px(ctx, 16, 16, '#AA2222');
    px(ctx, 15, 17, '#AA2222');
    px(ctx, 16, 17, '#AA2222');
    // Belt attachment hooks
    rect(ctx, 6, 14, 2, 3, '#888888');
    rect(ctx, 24, 14, 2, 3, '#888888');
    c.refresh();
  }

  // ── Tarmac Elements ──────────────────────────────────────────────────

  // tarmac-plane-parked (64×32): side-view pixel-art parked plane
  {
    const c = scene.textures.createCanvas('tarmac-plane-parked', 64, 32);
    if (!c) return;
    const ctx = c.context;
    // White fuselage (main body)
    rect(ctx, 8, 10, 48, 12, '#F0F0F2');
    // Nose cone
    rect(ctx, 56, 11, 6, 10, '#E8E8EA');
    px(ctx, 62, 12, '#DDDDDF'); px(ctx, 62, 19, '#DDDDDF');
    px(ctx, 63, 13, '#CCCCCE'); px(ctx, 63, 14, '#CCCCCE');
    px(ctx, 63, 17, '#CCCCCE'); px(ctx, 63, 18, '#CCCCCE');
    // Blue tail fin
    ctx.fillStyle = '#2244AA';
    ctx.beginPath();
    ctx.moveTo(8, 10);
    ctx.lineTo(2, 2);
    ctx.lineTo(16, 2);
    ctx.lineTo(16, 10);
    ctx.closePath();
    ctx.fill();
    // Tail highlight
    rect(ctx, 6, 4, 6, 2, '#3355BB');
    // Gray wings (top-positioned, behind fuselage visually)
    rect(ctx, 22, 18, 20, 6, '#AAAAAA');
    rect(ctx, 22, 22, 22, 2, '#999999');
    // Small horizontal stabilizer at tail
    rect(ctx, 8, 20, 8, 4, '#AAAAAA');
    // Window row
    for (let x = 20; x <= 52; x += 5) {
      rect(ctx, x, 12, 3, 3, '#87CEEB');
    }
    // Blue stripe along fuselage
    rect(ctx, 10, 21, 46, 2, '#2244AA');
    // Wheels
    rect(ctx, 20, 28, 5, 4, '#555555');
    rect(ctx, 36, 28, 5, 4, '#555555');
    c.refresh();
  }

  // tarmac-tow-vehicle (32×16): yellow ground vehicle
  {
    const c = scene.textures.createCanvas('tarmac-tow-vehicle', 32, 16);
    if (!c) return;
    const ctx = c.context;
    // Yellow vehicle body
    rect(ctx, 2, 3, 26, 9, '#FFD700');
    rect(ctx, 2, 3, 26, 1, lighten('#FFD700', 0.2));
    // Cab section
    rect(ctx, 18, 1, 10, 6, '#E8C000');
    // Windshield
    rect(ctx, 19, 2, 8, 4, '#AADDFF');
    // Wheels
    rect(ctx, 4, 12, 5, 4, '#333333');
    rect(ctx, 22, 12, 5, 4, '#333333');
    // Wheel highlights
    px(ctx, 6, 13, '#555555');
    px(ctx, 24, 13, '#555555');
    // Tow arm
    rect(ctx, 0, 7, 4, 3, '#CCAA00');
    // Safety stripes on body
    for (let x = 4; x < 18; x += 4) {
      rect(ctx, x, 4, 2, 8, darken('#FFD700', 0.1));
    }
    c.refresh();
  }

  // tarmac-plane-takeoff (48×24): plane angled upward ~20°
  {
    const c = scene.textures.createCanvas('tarmac-plane-takeoff', 48, 24);
    if (!c) return;
    const ctx = c.context;
    // Draw angled plane using transform
    ctx.save();
    ctx.translate(4, 20);
    ctx.rotate(-0.35); // ~20 degrees up
    // White fuselage
    rect(ctx, 0, -4, 38, 9, '#F0F0F2');
    // Nose
    rect(ctx, 38, -3, 5, 7, '#E8E8EA');
    px(ctx, 43, -2, '#DDDDDF'); px(ctx, 43, 4, '#DDDDDF');
    // Blue tail fin
    ctx.fillStyle = '#2244AA';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-4, -12);
    ctx.lineTo(8, -12);
    ctx.lineTo(8, -4);
    ctx.closePath();
    ctx.fill();
    // Wings
    rect(ctx, 14, 2, 14, 4, '#AAAAAA');
    // Windows
    for (let x = 12; x <= 34; x += 5) {
      rect(ctx, x, -2, 3, 2, '#87CEEB');
    }
    // Blue stripe
    rect(ctx, 2, 3, 36, 2, '#2244AA');
    ctx.restore();
    c.refresh();
  }

  // ── Signs (32×16) ────────────────────────────────────────────────────

  // sign-duty-free: blue bg with simplified "DF" text
  {
    const c = scene.textures.createCanvas('sign-duty-free', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#2C3E50');
    rect(ctx, 0, 0, 32, 1, lighten('#2C3E50', 0.15));
    // "D" letter (left)
    rect(ctx, 3, 3, 1, 10, '#FFFFFF');
    rect(ctx, 3, 3, 4, 1, '#FFFFFF');
    rect(ctx, 3, 12, 4, 1, '#FFFFFF');
    rect(ctx, 7, 5, 1, 6, '#FFFFFF');
    // "F" letter (right)
    rect(ctx, 11, 3, 1, 10, '#FFFFFF');
    rect(ctx, 11, 3, 5, 1, '#FFFFFF');
    rect(ctx, 11, 7, 4, 1, '#FFFFFF');
    // "FREE" abbreviated — short lines
    rect(ctx, 19, 5, 10, 1, '#FFFFFF');
    rect(ctx, 19, 8, 8, 1, '#FFFFFF');
    rect(ctx, 19, 11, 10, 1, '#FFFFFF');
    c.refresh();
  }

  // sign-passport: dark blue with "P" passport icon
  {
    const c = scene.textures.createCanvas('sign-passport', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#1A237E');
    rect(ctx, 0, 0, 32, 1, lighten('#1A237E', 0.15));
    // Passport book icon (simplified rectangle)
    rect(ctx, 8, 3, 10, 10, '#FFFFFF');
    rect(ctx, 9, 4, 8, 8, '#1A237E');
    // Gold emblem dot on passport
    rect(ctx, 11, 6, 4, 4, '#C8A84E');
    rect(ctx, 12, 5, 2, 6, '#C8A84E');
    // "PASSPORT" abbreviated text lines
    rect(ctx, 21, 5, 9, 1, '#FFFFFF');
    rect(ctx, 21, 8, 7, 1, '#FFFFFF');
    rect(ctx, 21, 11, 9, 1, '#FFFFFF');
    c.refresh();
  }

  // sign-food-court: orange-brown with utensil icon
  {
    const c = scene.textures.createCanvas('sign-food-court', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#8B4513');
    rect(ctx, 0, 0, 32, 1, lighten('#8B4513', 0.15));
    // Fork icon (left)
    rect(ctx, 6, 2, 1, 12, '#FFFFFF');
    px(ctx, 5, 3, '#FFFFFF'); px(ctx, 5, 4, '#FFFFFF');
    px(ctx, 7, 3, '#FFFFFF'); px(ctx, 7, 4, '#FFFFFF');
    px(ctx, 5, 6, '#FFFFFF'); px(ctx, 7, 6, '#FFFFFF');
    // Knife icon (right of fork)
    rect(ctx, 10, 2, 1, 12, '#FFFFFF');
    rect(ctx, 11, 2, 1, 5, '#FFFFFF');
    // "FOOD" abbreviated
    rect(ctx, 15, 4, 14, 1, '#FFFFFF');
    rect(ctx, 15, 7, 12, 1, '#FFFFFF');
    rect(ctx, 15, 10, 14, 1, '#FFFFFF');
    c.refresh();
  }

  // sign-gates: blue with "GATES" text and arrow
  {
    const c = scene.textures.createCanvas('sign-gates', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#2C3E50');
    rect(ctx, 0, 0, 32, 1, lighten('#2C3E50', 0.15));
    // "G" letter
    rect(ctx, 2, 4, 1, 8, '#FFFFFF');
    rect(ctx, 2, 4, 4, 1, '#FFFFFF');
    rect(ctx, 2, 11, 4, 1, '#FFFFFF');
    rect(ctx, 5, 8, 1, 4, '#FFFFFF');
    rect(ctx, 3, 8, 3, 1, '#FFFFFF');
    // "T" letter
    rect(ctx, 8, 4, 5, 1, '#FFFFFF');
    rect(ctx, 10, 5, 1, 7, '#FFFFFF');
    // Arrow pointing right
    rect(ctx, 16, 7, 10, 2, '#FFFFFF');
    px(ctx, 26, 5, '#FFFFFF');
    px(ctx, 27, 6, '#FFFFFF');
    px(ctx, 28, 7, '#FFFFFF');
    px(ctx, 28, 8, '#FFFFFF');
    px(ctx, 27, 9, '#FFFFFF');
    px(ctx, 26, 10, '#FFFFFF');
    c.refresh();
  }

  // ── NPC: duty-free clerk (48×48) ─────────────────────────────────────

  // npc-duty-free-clerk: clerk with blue vest, white shirt, dark pants, name badge
  {
    const c = scene.textures.createCanvas('npc-duty-free-clerk', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D2A679',
      hair: '#3B2314',
      top: '#FFFFFF',   // white shirt base
      pants: '#333333',
      shoes: '#222222',
      detail: (dCtx) => {
        // Blue vest panels over white shirt
        rect(dCtx, 14, 19, 6, 16, '#2C3E50');
        rect(dCtx, 28, 19, 6, 16, '#2C3E50');
        rect(dCtx, 14, 19, 20, 2, '#2C3E50');
        // Vest collar
        rect(dCtx, 20, 18, 8, 2, '#2C3E50');
        // Vest buttons
        px(dCtx, 24, 23, darken('#2C3E50', 0.3));
        px(dCtx, 24, 27, darken('#2C3E50', 0.3));
        px(dCtx, 24, 31, darken('#2C3E50', 0.3));
        // White name badge on chest (left vest panel area)
        rect(dCtx, 22, 22, 5, 3, '#FFFFFF');
        // Badge text line
        rect(dCtx, 23, 23, 3, 1, '#333333');
      },
    });
    c.refresh();
  }
}

export function generateAirportTextures(scene: Phaser.Scene): void {
  generateNPCTextures(scene);
  generateBuildingTexture(scene);
  generateInteriorTextures(scene);
  generateSignTextures(scene);
  generateAirplaneTextures(scene);
  generateBoardingTextures(scene);
  generateAirplaneTaxiingTexture(scene);
  generateExteriorDecoTextures(scene);
  generateCheckinPropTextures(scene);
  generateStationSignTextures(scene);
  generateBenGurionTextures(scene);
}
