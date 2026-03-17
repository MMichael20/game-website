// src/game/rendering/AirbnbCompoundTextures.ts
import Phaser from 'phaser';

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function darken(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor(((n >> 16) & 0xff) * (1 + amount)));
  const g = Math.min(255, Math.floor(((n >> 8) & 0xff) * (1 + amount)));
  const b = Math.min(255, Math.floor((n & 0xff) * (1 + amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function generateAirbnbBuilding(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('building-airbnb-building', 384, 256);
  if (!c) return;
  const ctx = c.context;

  rect(ctx, 0, 40, 384, 216, '#FFF8DC');
  rect(ctx, 0, 0, 384, 44, '#B74C2C');
  rect(ctx, 0, 40, 384, 6, darken('#B74C2C', 0.15));
  rect(ctx, 0, 46, 384, 4, 'rgba(0,0,0,0.1)');
  rect(ctx, 0, 240, 384, 16, '#8B8378');

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const wx = 30 + col * 72;
      const wy = 60 + row * 80;
      rect(ctx, wx - 2, wy - 2, 40, 48, '#6B4E35');
      rect(ctx, wx, wy, 36, 44, '#87CEEB');
      rect(ctx, wx + 17, wy, 2, 44, '#6B4E35');
      rect(ctx, wx, wy + 21, 36, 2, '#6B4E35');
      rect(ctx, wx + 2, wy + 2, 14, 8, lighten('#87CEEB', 0.2));
    }
  }

  const doorX = 172;
  const doorY = 180;
  rect(ctx, doorX, doorY, 40, 60, '#5C3A1E');
  rect(ctx, doorX + 2, doorY + 2, 36, 56, '#6B4E35');
  circle(ctx, doorX + 34, doorY + 32, 3, '#FFD700');
  rect(ctx, doorX - 8, 240, 56, 6, '#A0A0A0');

  rect(ctx, 100, 115, 184, 4, '#8B7355');
  for (let i = 0; i < 12; i++) {
    rect(ctx, 108 + i * 15, 100, 2, 15, '#8B7355');
  }
  rect(ctx, 100, 100, 184, 2, '#8B7355');

  rect(ctx, 145, 158, 94, 18, '#F5F5DC');
  rect(ctx, 146, 159, 92, 16, '#FFF8E7');
  const textColor = '#5C3A1E';
  rect(ctx, 152, 162, 1, 10, textColor); rect(ctx, 153, 163, 1, 1, textColor);
  rect(ctx, 154, 164, 1, 1, textColor); rect(ctx, 155, 163, 1, 1, textColor);
  rect(ctx, 156, 162, 1, 10, textColor);
  rect(ctx, 159, 164, 1, 8, textColor); rect(ctx, 163, 164, 1, 8, textColor);
  rect(ctx, 160, 163, 3, 1, textColor); rect(ctx, 160, 167, 3, 1, textColor);
  rect(ctx, 159, 162, 5, 1, textColor);
  rect(ctx, 166, 162, 1, 9, textColor); rect(ctx, 170, 162, 1, 9, textColor);
  rect(ctx, 167, 171, 3, 1, textColor);
  rect(ctx, 173, 162, 1, 10, textColor);

  c.refresh();
}

function generateCompoundDecorations(scene: Phaser.Scene): void {
  // Lounge chair — 32×32
  {
    const c = scene.textures.createCanvas('deco-compound-lounge-chair', 32, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 4, 14, 24, 3, '#8B6914');
    rect(ctx, 4, 17, 2, 12, '#8B6914');
    rect(ctx, 26, 17, 2, 12, '#8B6914');
    rect(ctx, 4, 8, 10, 6, '#8B6914');
    rect(ctx, 5, 9, 8, 4, '#FF6B6B');
    rect(ctx, 6, 15, 20, 2, '#FF6B6B');
    c.refresh();
  }

  // Patio table — 64×64
  {
    const c = scene.textures.createCanvas('deco-compound-patio-table', 64, 64);
    if (!c) return;
    const ctx = c.context;
    circle(ctx, 32, 48, 14, 'rgba(0,0,0,0.15)');
    circle(ctx, 32, 44, 12, '#8B6914');
    circle(ctx, 32, 44, 10, '#A0824A');
    rect(ctx, 30, 44, 4, 14, '#6B4E35');
    rect(ctx, 31, 4, 2, 40, '#666');
    circle(ctx, 32, 10, 18, '#E74C3C');
    circle(ctx, 32, 10, 16, '#C0392B');
    rect(ctx, 26, 6, 12, 3, lighten('#E74C3C', 0.15));
    rect(ctx, 10, 42, 8, 8, '#8B6914');
    rect(ctx, 46, 42, 8, 8, '#8B6914');
    c.refresh();
  }

  // Tiki torch — 32×64
  {
    const c = scene.textures.createCanvas('deco-compound-tiki-torch', 32, 64);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 14, 16, 4, 46, '#A0724A');
    rect(ctx, 13, 16, 1, 46, darken('#A0724A', 0.15));
    rect(ctx, 12, 14, 8, 6, darken('#A0724A', 0.1));
    circle(ctx, 16, 10, 5, '#FF8C00');
    circle(ctx, 16, 8, 4, '#FFD700');
    circle(ctx, 16, 6, 2, '#FFFACD');
    rect(ctx, 12, 60, 8, 4, '#6B4E35');
    c.refresh();
  }

  // Flower bed — 64×32
  {
    const c = scene.textures.createCanvas('deco-compound-flower-bed', 64, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 2, 18, 60, 12, '#5C3A1E');
    rect(ctx, 4, 20, 56, 8, '#6B4A2E');
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF78F0'];
    for (let i = 0; i < 8; i++) {
      const fx = 6 + i * 7 + (i % 2 === 0 ? 0 : 3);
      const fy = 14 + (i % 2 === 0 ? 0 : -4);
      rect(ctx, fx + 1, fy + 4, 1, 8, '#2D6B2A');
      circle(ctx, fx + 1, fy + 2, 3, colors[i % colors.length]);
      circle(ctx, fx + 1, fy + 2, 1, '#FFD700');
    }
    rect(ctx, 0, 26, 64, 4, '#8A8A8A');
    c.refresh();
  }

  // Tennis bench — 64×32
  {
    const c = scene.textures.createCanvas('deco-compound-tennis-bench', 64, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 8, 18, 4, 12, '#6B4E35');
    rect(ctx, 52, 18, 4, 12, '#6B4E35');
    rect(ctx, 4, 16, 56, 4, '#A0724A');
    rect(ctx, 4, 15, 56, 1, lighten('#A0724A', 0.15));
    rect(ctx, 4, 8, 56, 3, '#A0724A');
    rect(ctx, 8, 11, 4, 5, '#6B4E35');
    rect(ctx, 52, 11, 4, 5, '#6B4E35');
    c.refresh();
  }

  // Diving board — 32×64
  {
    const c = scene.textures.createCanvas('deco-compound-diving-board', 32, 64);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 10, 40, 12, 20, '#8A8A8A');
    rect(ctx, 8, 38, 16, 4, '#8A8A8A');
    rect(ctx, 8, 32, 18, 4, '#E8E8E8');
    rect(ctx, 8, 30, 18, 2, lighten('#E8E8E8', 0.1));
    rect(ctx, 10, 33, 14, 1, '#CCC');
    rect(ctx, 4, 14, 16, 4, '#E8E8E8');
    rect(ctx, 8, 18, 4, 14, '#B0B0B0');
    c.refresh();
  }

  // Compound sign — 32×32
  {
    const c = scene.textures.createCanvas('deco-compound-sign', 32, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 14, 12, 4, 18, '#6B4E35');
    rect(ctx, 2, 2, 28, 14, '#F5F5DC');
    rect(ctx, 3, 3, 26, 12, '#FFF8E7');
    rect(ctx, 2, 2, 28, 1, '#8B6914');
    rect(ctx, 2, 15, 28, 1, '#8B6914');
    rect(ctx, 2, 2, 1, 14, '#8B6914');
    rect(ctx, 29, 2, 1, 14, '#8B6914');
    rect(ctx, 8, 5, 1, 7, '#5C3A1E');
    rect(ctx, 12, 5, 1, 7, '#5C3A1E');
    rect(ctx, 9, 5, 3, 1, '#5C3A1E');
    rect(ctx, 9, 8, 3, 1, '#5C3A1E');
    rect(ctx, 17, 5, 1, 7, '#5C3A1E');
    rect(ctx, 21, 5, 1, 6, '#5C3A1E');
    rect(ctx, 18, 5, 3, 1, '#5C3A1E');
    rect(ctx, 18, 8, 3, 1, '#5C3A1E');
    rect(ctx, 18, 11, 3, 1, '#5C3A1E');
    c.refresh();
  }
}

function generateCompoundGate(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-compound-gate', 64, 64);
  if (!c) return;
  const ctx = c.context;
  rect(ctx, 4, 8, 12, 52, '#8A8A8A');
  rect(ctx, 48, 8, 12, 52, '#8A8A8A');
  rect(ctx, 2, 4, 16, 6, '#9A9A9A');
  rect(ctx, 46, 4, 16, 6, '#9A9A9A');
  rect(ctx, 4, 4, 56, 10, '#A0724A');
  rect(ctx, 6, 6, 52, 6, '#B8845A');
  rect(ctx, 14, 8, 36, 2, '#FFF8DC');
  rect(ctx, 16, 52, 32, 12, '#C8C8C8');
  c.refresh();
}

export function generateAirbnbCompoundTextures(scene: Phaser.Scene): void {
  generateAirbnbBuilding(scene);
  generateCompoundDecorations(scene);
  generateCompoundGate(scene);
}
