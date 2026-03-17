// src/game/rendering/SunBeachTextures.ts
// Generates Sun Beach area textures: decorations, turtle NPCs, minigame sprites, and human NPCs

import Phaser from 'phaser';

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

// ── Beach Decorations ────────────────────────────────────────────────────

function generateBeachDecorations(scene: Phaser.Scene): void {
  // deco-turtle-nest — 32×32: sandy mound with eggs on top
  {
    const c = scene.textures.createCanvas('deco-turtle-nest', 32, 32);
    if (!c) return;
    const ctx = c.context;

    // Sandy mound — beige oval
    const moundColor = '#d2b48c';
    circle(ctx, 16, 20, 10, darken(moundColor, 0.1));
    circle(ctx, 16, 19, 9, moundColor);
    circle(ctx, 13, 18, 7, moundColor);
    circle(ctx, 19, 18, 7, moundColor);
    circle(ctx, 16, 16, 6, lighten(moundColor, 0.15));

    // Slight highlight on top
    rect(ctx, 12, 13, 8, 2, lighten(moundColor, 0.2));

    // Eggs — small white circles on top of mound
    circle(ctx, 13, 13, 2, '#f5f5f0');
    circle(ctx, 19, 12, 2, '#f5f5f0');
    circle(ctx, 16, 10, 2, '#f0f0eb');
    circle(ctx, 16, 15, 2, '#f5f5f0');

    c.refresh();
  }

  // deco-beach-grass — 32×32: tufts of dune grass
  {
    const c = scene.textures.createCanvas('deco-beach-grass', 32, 32);
    if (!c) return;
    const ctx = c.context;

    const grassColor = '#6b8e3e';
    const darkGrass = darken(grassColor, 0.2);
    const lightGrass = lighten(grassColor, 0.2);

    // 6 angled grass blades (thin rects, slightly varied)
    // Blade 1 — left, lean left
    rect(ctx, 6, 18, 1, 10, darkGrass);
    rect(ctx, 5, 12, 1, 8, grassColor);
    rect(ctx, 4, 8, 1, 6, lightGrass);

    // Blade 2 — slight right lean
    rect(ctx, 9, 20, 1, 8, darkGrass);
    rect(ctx, 10, 13, 1, 9, grassColor);
    rect(ctx, 11, 9, 1, 6, lightGrass);

    // Blade 3 — center, upright
    rect(ctx, 15, 22, 1, 6, darkGrass);
    rect(ctx, 15, 15, 1, 8, grassColor);
    rect(ctx, 15, 10, 1, 7, lightGrass);

    // Blade 4 — center-right lean
    rect(ctx, 18, 21, 1, 7, darkGrass);
    rect(ctx, 19, 14, 1, 9, grassColor);
    rect(ctx, 20, 9, 1, 7, lightGrass);

    // Blade 5 — right lean
    rect(ctx, 23, 19, 1, 9, darkGrass);
    rect(ctx, 24, 13, 1, 8, grassColor);
    rect(ctx, 25, 8, 1, 7, lightGrass);

    // Blade 6 — far right upright
    rect(ctx, 27, 22, 1, 6, darkGrass);
    rect(ctx, 27, 15, 1, 8, grassColor);
    rect(ctx, 28, 11, 1, 6, lightGrass);

    // Sandy base hints
    rect(ctx, 4, 26, 24, 4, '#d2b48c');
    rect(ctx, 5, 27, 22, 2, lighten('#d2b48c', 0.15));

    c.refresh();
  }

  // deco-driftwood — 48×16: weathered brown wood piece
  {
    const c = scene.textures.createCanvas('deco-driftwood', 48, 16);
    if (!c) return;
    const ctx = c.context;

    const wood = '#a07850';
    const woodLight = '#b8956a';

    // Base shape
    rect(ctx, 0, 4, 48, 8, wood);
    rect(ctx, 2, 3, 44, 10, wood);
    rect(ctx, 4, 2, 40, 12, woodLight);

    // Rounded ends
    rect(ctx, 0, 5, 2, 6, darken(wood, 0.15));
    rect(ctx, 46, 5, 2, 6, darken(wood, 0.15));

    // Grain lines (horizontal)
    rect(ctx, 4, 4, 40, 1, darken(woodLight, 0.15));
    rect(ctx, 4, 6, 40, 1, darken(woodLight, 0.12));
    rect(ctx, 4, 8, 40, 1, darken(woodLight, 0.18));
    rect(ctx, 4, 10, 40, 1, darken(woodLight, 0.10));
    rect(ctx, 4, 12, 40, 1, darken(woodLight, 0.14));

    // Lighter highlight top edge
    rect(ctx, 4, 3, 40, 1, lighten(woodLight, 0.2));

    // Knot details
    circle(ctx, 14, 8, 2, darken(woodLight, 0.28));
    circle(ctx, 34, 7, 2, darken(woodLight, 0.22));
    circle(ctx, 24, 9, 1, darken(woodLight, 0.25));

    c.refresh();
  }

  // deco-sun-beach-sign — 32×48: wooden post with sign and turtle silhouette
  {
    const c = scene.textures.createCanvas('deco-sun-beach-sign', 32, 48);
    if (!c) return;
    const ctx = c.context;

    const post = '#6b4e35';
    const postDark = darken(post, 0.15);
    const board = '#c8a96e';
    const boardInner = '#d4b878';

    // Wooden post
    rect(ctx, 14, 20, 4, 28, post);
    rect(ctx, 15, 20, 2, 28, postDark);
    // Post grain
    rect(ctx, 14, 24, 4, 1, darken(post, 0.1));
    rect(ctx, 14, 30, 4, 1, darken(post, 0.1));
    rect(ctx, 14, 36, 4, 1, darken(post, 0.1));
    rect(ctx, 14, 42, 4, 1, darken(post, 0.1));

    // Sign board
    rect(ctx, 4, 4, 24, 18, board);
    rect(ctx, 4, 4, 24, 1, darken(board, 0.2));
    rect(ctx, 4, 21, 24, 1, darken(board, 0.2));
    rect(ctx, 4, 4, 1, 18, darken(board, 0.2));
    rect(ctx, 27, 4, 1, 18, darken(board, 0.2));
    rect(ctx, 6, 6, 20, 14, boardInner);

    // Wood grain on sign
    rect(ctx, 6, 9, 20, 1, darken(boardInner, 0.1));
    rect(ctx, 6, 13, 20, 1, darken(boardInner, 0.1));
    rect(ctx, 6, 17, 20, 1, darken(boardInner, 0.1));

    // Turtle silhouette on sign (small, dark, top-down)
    const turtleSil = '#5c3a1e';
    // Shell oval
    circle(ctx, 16, 12, 4, turtleSil);
    // Head
    circle(ctx, 16, 7, 2, turtleSil);
    // Flippers
    rect(ctx, 10, 10, 3, 2, turtleSil);
    rect(ctx, 19, 10, 3, 2, turtleSil);
    rect(ctx, 12, 14, 2, 2, turtleSil);
    rect(ctx, 18, 14, 2, 2, turtleSil);

    c.refresh();
  }
}

// ── Turtle NPCs ──────────────────────────────────────────────────────────

function generateTurtleNPCs(scene: Phaser.Scene): void {
  // npc-turtle — 32×32: green sea turtle top-down view on sand
  {
    const c = scene.textures.createCanvas('npc-turtle', 32, 32);
    if (!c) return;
    const ctx = c.context;

    const shellDark = '#2d6b2a';
    const shellMid = '#3a8c36';
    const shellLight = lighten(shellMid, 0.15);
    const skinGreen = '#4a9c46';

    // Shadow
    circle(ctx, 16, 26, 5, 'rgba(0,0,0,0.15)');

    // Body base beneath shell
    circle(ctx, 16, 17, 9, skinGreen);

    // Shell — dark green oval (approx 20×16)
    for (let dy = -8; dy <= 8; dy++) {
      const hw = Math.round(10 * Math.sqrt(1 - (dy * dy) / 64));
      rect(ctx, 16 - hw, 16 + dy, hw * 2, 1, shellDark);
    }
    // Shell inner (lighter)
    for (let dy = -6; dy <= 6; dy++) {
      const hw = Math.round(8 * Math.sqrt(1 - (dy * dy) / 36));
      rect(ctx, 16 - hw, 16 + dy, hw * 2, 1, shellMid);
    }

    // Shell pattern lines (lighter)
    rect(ctx, 13, 11, 6, 1, shellLight);
    rect(ctx, 10, 14, 3, 1, shellLight);
    rect(ctx, 19, 14, 3, 1, shellLight);
    rect(ctx, 12, 17, 8, 1, shellLight);
    rect(ctx, 11, 20, 3, 1, shellLight);
    rect(ctx, 18, 20, 3, 1, shellLight);

    // Flippers (small rects)
    rect(ctx, 5, 13, 4, 3, skinGreen);
    rect(ctx, 23, 13, 4, 3, skinGreen);
    rect(ctx, 7, 20, 3, 3, skinGreen);
    rect(ctx, 22, 20, 3, 3, skinGreen);

    // Head circle poking out front
    circle(ctx, 16, 8, 3, skinGreen);
    // Eye dots
    px(ctx, 15, 7, '#1a3a18');
    px(ctx, 17, 7, '#1a3a18');

    c.refresh();
  }

  // npc-turtle-water — 32×32: turtle in swimming pose with blue tint
  {
    const c = scene.textures.createCanvas('npc-turtle-water', 32, 32);
    if (!c) return;
    const ctx = c.context;

    const shellDark = '#1e5c4a';
    const shellMid = '#2a7c66';
    const shellLight = lighten(shellMid, 0.15);
    const skinGreen = '#3a8c7a';

    // Water blue overlay base
    rect(ctx, 0, 0, 32, 32, 'rgba(0,100,180,0.15)');

    // Body base beneath shell
    circle(ctx, 16, 17, 9, skinGreen);

    // Shell — oval with blue-green tint
    for (let dy = -8; dy <= 8; dy++) {
      const hw = Math.round(10 * Math.sqrt(1 - (dy * dy) / 64));
      rect(ctx, 16 - hw, 16 + dy, hw * 2, 1, shellDark);
    }
    for (let dy = -6; dy <= 6; dy++) {
      const hw = Math.round(8 * Math.sqrt(1 - (dy * dy) / 36));
      rect(ctx, 16 - hw, 16 + dy, hw * 2, 1, shellMid);
    }

    // Shell pattern lines
    rect(ctx, 13, 11, 6, 1, shellLight);
    rect(ctx, 10, 14, 3, 1, shellLight);
    rect(ctx, 19, 14, 3, 1, shellLight);
    rect(ctx, 12, 17, 8, 1, shellLight);
    rect(ctx, 11, 20, 3, 1, shellLight);
    rect(ctx, 18, 20, 3, 1, shellLight);

    // Flippers extended wider (swimming pose)
    rect(ctx, 2, 12, 6, 3, skinGreen);
    rect(ctx, 24, 12, 6, 3, skinGreen);
    rect(ctx, 5, 20, 5, 3, skinGreen);
    rect(ctx, 22, 20, 5, 3, skinGreen);

    // Head
    circle(ctx, 16, 8, 3, skinGreen);
    px(ctx, 15, 7, '#0a2a20');
    px(ctx, 17, 7, '#0a2a20');

    c.refresh();
  }
}

// ── Minigame Sprites ─────────────────────────────────────────────────────

function generateMinigameSprites(scene: Phaser.Scene): void {
  // mini-baby-turtle — 16×16: tiny green turtle
  {
    const c = scene.textures.createCanvas('mini-baby-turtle', 16, 16);
    if (!c) return;
    const ctx = c.context;

    const shellDark = '#2d6b2a';
    const shellMid = '#3a8c36';
    const skin = '#4a9c46';

    // Shell oval (8×6) centered
    for (let dy = -3; dy <= 3; dy++) {
      const hw = Math.round(4 * Math.sqrt(1 - (dy * dy) / 9));
      rect(ctx, 8 - hw, 8 + dy, hw * 2, 1, shellDark);
    }
    for (let dy = -2; dy <= 2; dy++) {
      const hw = Math.round(3 * Math.sqrt(1 - (dy * dy) / 4));
      rect(ctx, 8 - hw, 8 + dy, hw * 2, 1, shellMid);
    }

    // 4 tiny flipper rects
    rect(ctx, 2, 6, 2, 2, skin);
    rect(ctx, 12, 6, 2, 2, skin);
    rect(ctx, 3, 10, 2, 2, skin);
    rect(ctx, 11, 10, 2, 2, skin);

    // Tiny head circle
    circle(ctx, 8, 4, 2, skin);
    px(ctx, 7, 3, '#1a3a18');
    px(ctx, 9, 3, '#1a3a18');

    c.refresh();
  }

  // mini-crab — 16×16: red/orange crab
  {
    const c = scene.textures.createCanvas('mini-crab', 16, 16);
    if (!c) return;
    const ctx = c.context;

    const body = '#cc4422';
    const bodyLight = '#e05533';
    const claw = '#dd3311';

    // Red oval body center
    circle(ctx, 8, 9, 4, body);
    circle(ctx, 8, 8, 3, bodyLight);

    // 2 claw rects on sides
    rect(ctx, 1, 6, 4, 3, claw);
    rect(ctx, 11, 6, 4, 3, claw);
    // Claw tips (darker)
    rect(ctx, 1, 6, 2, 1, darken(claw, 0.3));
    rect(ctx, 13, 6, 2, 1, darken(claw, 0.3));

    // 4 tiny leg rects (2 per side)
    rect(ctx, 3, 10, 1, 3, body);
    rect(ctx, 5, 11, 1, 3, body);
    rect(ctx, 10, 11, 1, 3, body);
    rect(ctx, 12, 10, 1, 3, body);

    // 2 eye dots
    px(ctx, 6, 6, '#111');
    px(ctx, 10, 6, '#111');
    px(ctx, 6, 5, '#fff');
    px(ctx, 10, 5, '#fff');

    c.refresh();
  }

  // mini-seagull — 16×16: white/gray bird top-down
  {
    const c = scene.textures.createCanvas('mini-seagull', 16, 16);
    if (!c) return;
    const ctx = c.context;

    const bodyColor = '#f0f0f0';
    const wingColor = '#aaaaaa';
    const beak = '#e8820a';

    // White body oval
    circle(ctx, 8, 8, 4, bodyColor);
    circle(ctx, 8, 9, 3, '#e8e8e8');

    // Gray wing rects on sides
    rect(ctx, 1, 6, 5, 3, wingColor);
    rect(ctx, 10, 6, 5, 3, wingColor);
    // Wing tips darker
    rect(ctx, 1, 6, 2, 2, darken(wingColor, 0.2));
    rect(ctx, 13, 6, 2, 2, darken(wingColor, 0.2));

    // Orange beak (triangle-ish — small rect pointing forward)
    rect(ctx, 7, 4, 2, 1, beak);
    px(ctx, 8, 3, beak);

    // Eye dots
    px(ctx, 6, 7, '#333');
    px(ctx, 10, 7, '#333');

    c.refresh();
  }

  // mini-driftwood-obstacle — 24×8: small brown wood piece
  {
    const c = scene.textures.createCanvas('mini-driftwood-obstacle', 24, 8);
    if (!c) return;
    const ctx = c.context;

    const wood = '#a07850';
    const woodLight = '#b8956a';

    // Brown rect base
    rect(ctx, 0, 1, 24, 6, wood);
    rect(ctx, 1, 0, 22, 8, woodLight);

    // Rounded ends
    rect(ctx, 0, 1, 1, 6, darken(wood, 0.15));
    rect(ctx, 23, 1, 1, 6, darken(wood, 0.15));

    // Darker grain lines
    rect(ctx, 1, 2, 22, 1, darken(woodLight, 0.15));
    rect(ctx, 1, 4, 22, 1, darken(woodLight, 0.18));
    rect(ctx, 1, 6, 22, 1, darken(woodLight, 0.12));

    // Lighter top highlight
    rect(ctx, 1, 1, 22, 1, lighten(woodLight, 0.2));

    // Knot
    circle(ctx, 12, 4, 1, darken(woodLight, 0.3));

    c.refresh();
  }
}

// ── Human NPCs ───────────────────────────────────────────────────────────

function generateSunBeachNPCs(scene: Phaser.Scene): void {
  // npc-nature-guide — 48×48: wide-brim hat, green top, khaki pants
  {
    const c = scene.textures.createCanvas('npc-nature-guide', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const skin = '#f5deb3';
    const hair = '#3a1f0a';
    const top = '#2e7d32';
    const pants = '#c2b280';
    const shoes = '#5c3d1e';

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

    // Wide-brim hat (brown rect above head, wider than head)
    rect(ctx, 14, 3, 20, 4, '#7a5230');
    rect(ctx, 12, 5, 24, 2, '#7a5230');
    rect(ctx, 17, 1, 14, 3, darken('#7a5230', 0.1));

    c.refresh();
  }

  // npc-tourist-camera — 48×48: Hawaiian shirt, camera, blonde hair
  {
    const c = scene.textures.createCanvas('npc-tourist-camera', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const skin = '#f5deb3';
    const hair = '#daa520';
    const top = '#e74c3c';
    const pants = '#c2b280';
    const shoes = '#5c3d1e';

    // Shadow
    rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

    // Shoes
    rect(ctx, 17, 39, 5, 2, shoes);
    rect(ctx, 26, 39, 5, 2, shoes);

    // Legs / shorts (shorter)
    rect(ctx, 15, 33, 8, 6, pants);
    rect(ctx, 25, 33, 8, 6, pants);

    // Body / Hawaiian shirt (bright red with small pattern dots)
    rect(ctx, 14, 19, 20, 16, top);
    // Shirt pattern — small contrasting dots to suggest Hawaiian print
    px(ctx, 17, 21, lighten(top, 0.3));
    px(ctx, 21, 23, lighten(top, 0.3));
    px(ctx, 25, 21, lighten(top, 0.3));
    px(ctx, 29, 23, lighten(top, 0.3));
    px(ctx, 19, 26, lighten(top, 0.3));
    px(ctx, 23, 28, lighten(top, 0.3));
    px(ctx, 27, 26, lighten(top, 0.3));
    px(ctx, 17, 30, lighten(top, 0.3));
    px(ctx, 25, 30, lighten(top, 0.3));

    // Arms
    rect(ctx, 10, 24, 4, 10, top);
    rect(ctx, 34, 24, 4, 10, top);

    // Hands
    rect(ctx, 10, 34, 3, 2, skin);
    rect(ctx, 35, 34, 3, 2, skin);

    // Camera — small gray rect hanging from neck area
    rect(ctx, 20, 33, 8, 5, '#888888');
    rect(ctx, 21, 34, 6, 3, '#aaaaaa');
    circle(ctx, 24, 35, 1, '#555555');
    // Strap
    rect(ctx, 22, 30, 1, 4, '#666666');
    rect(ctx, 25, 30, 1, 4, '#666666');

    // Head
    rect(ctx, 19, 7, 10, 11, skin);
    rect(ctx, 18, 8, 12, 9, skin);

    // Hair (blonde)
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

    // Mouth (smile)
    rect(ctx, 22, 16, 4, 1, '#c88');

    c.refresh();
  }
}

// ── Main export ──────────────────────────────────────────────────────────

export function generateSunBeachTextures(scene: Phaser.Scene): void {
  generateTurtleNPCs(scene);
  generateBeachDecorations(scene);
  generateMinigameSprites(scene);
  generateSunBeachNPCs(scene);
}
