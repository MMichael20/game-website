// src/game/rendering/DrivingTextures.ts
import Phaser from 'phaser';
import { px, rect, circle, darken, lighten, Ctx } from './pixelHelpers';

function generatePlayerCar(scene: Phaser.Scene): void {
  // car-player — 48×32, top-down teal/green car
  const c = scene.textures.createCanvas('car-player', 48, 32);
  if (!c) return;
  const ctx = c.context;

  // Car body
  rect(ctx, 2, 4, 44, 24, '#2E8B7A');
  // Darker sides/outline
  rect(ctx, 0, 6, 2, 20, darken('#2E8B7A', 0.3));
  rect(ctx, 46, 6, 2, 20, darken('#2E8B7A', 0.3));
  rect(ctx, 2, 2, 44, 2, darken('#2E8B7A', 0.2));
  rect(ctx, 2, 28, 44, 2, darken('#2E8B7A', 0.2));

  // Roof (darker center rectangle)
  rect(ctx, 10, 8, 28, 16, darken('#2E8B7A', 0.25));

  // Windshield (front, lighter blue)
  rect(ctx, 10, 5, 28, 6, lighten('#87CEEB', 0.1));
  // Rear windshield
  rect(ctx, 10, 21, 28, 6, lighten('#87CEEB', 0.1));

  // Wheels — 4 small black rects at corners
  rect(ctx, 2, 4, 5, 7, '#1A1A1A');
  rect(ctx, 41, 4, 5, 7, '#1A1A1A');
  rect(ctx, 2, 21, 5, 7, '#1A1A1A');
  rect(ctx, 41, 21, 5, 7, '#1A1A1A');

  // Headlights (front)
  rect(ctx, 12, 3, 6, 2, '#FFFACD');
  rect(ctx, 30, 3, 6, 2, '#FFFACD');
  // Tail lights (rear)
  rect(ctx, 12, 27, 6, 2, '#CC2200');
  rect(ctx, 30, 27, 6, 2, '#CC2200');

  c.refresh();
}

function generateRoadSigns(scene: Phaser.Scene): void {
  // Helper: draw wooden post
  function drawPost(ctx: Ctx): void {
    rect(ctx, 14, 20, 4, 26, '#8B5C2A');
    rect(ctx, 14, 20, 1, 26, darken('#8B5C2A', 0.2));
  }

  // Helper: draw sign board
  function drawBoard(ctx: Ctx, bgColor: string): void {
    rect(ctx, 4, 2, 24, 16, darken(bgColor, 0.15));
    rect(ctx, 5, 3, 22, 14, bgColor);
  }

  // Helper: left-pointing arrow (small pixel arrangement)
  function drawArrowLeft(ctx: Ctx, color: string): void {
    // Arrow tip pointing left
    px(ctx, 7, 10, color);
    rect(ctx, 8, 9, 1, 3, color);
    rect(ctx, 9, 8, 1, 5, color);
    rect(ctx, 10, 10, 8, 1, color);
  }

  // Helper: right-pointing arrow
  function drawArrowRight(ctx: Ctx, color: string): void {
    rect(ctx, 13, 10, 8, 1, color);
    rect(ctx, 20, 9, 1, 3, color);
    rect(ctx, 21, 8, 1, 5, color);
    px(ctx, 22, 10, color);
  }

  // Helper: up-pointing arrow
  function drawArrowUp(ctx: Ctx, color: string): void {
    rect(ctx, 15, 5, 1, 8, color);
    rect(ctx, 14, 6, 3, 1, color);
    rect(ctx, 13, 7, 5, 1, color);
    px(ctx, 12, 8, color);
    px(ctx, 18, 8, color);
  }

  // Helper: down-pointing arrow
  function drawArrowDown(ctx: Ctx, color: string): void {
    rect(ctx, 15, 4, 1, 8, color);
    rect(ctx, 14, 11, 3, 1, color);
    rect(ctx, 13, 10, 5, 1, color);
    px(ctx, 12, 9, color);
    px(ctx, 18, 9, color);
  }

  // Pixel-art letters helper: draws a tiny 3×5 or similar letter block
  // We use simple rect patterns for 3-char labels
  function drawTextAIR(ctx: Ctx, color: string): void {
    // "A" at x=7
    rect(ctx, 7, 14, 1, 4, color);
    rect(ctx, 9, 14, 1, 4, color);
    rect(ctx, 7, 14, 3, 1, color);
    rect(ctx, 7, 16, 3, 1, color);
    // "I" at x=12
    rect(ctx, 12, 14, 1, 4, color);
    // "R" at x=15
    rect(ctx, 15, 14, 1, 4, color);
    rect(ctx, 16, 14, 2, 1, color);
    rect(ctx, 18, 15, 1, 1, color);
    rect(ctx, 16, 16, 2, 1, color);
    rect(ctx, 17, 17, 1, 1, color);
    rect(ctx, 18, 18, 1, 1, color);
  }

  function drawTextHANA(ctx: Ctx, color: string): void {
    // "H" at x=5
    rect(ctx, 5, 13, 1, 5, color);
    rect(ctx, 7, 13, 1, 5, color);
    rect(ctx, 5, 15, 3, 1, color);
    // "A" at x=9
    rect(ctx, 9, 13, 1, 5, color);
    rect(ctx, 11, 13, 1, 5, color);
    rect(ctx, 9, 13, 3, 1, color);
    rect(ctx, 9, 15, 3, 1, color);
    // "N" at x=13
    rect(ctx, 13, 13, 1, 5, color);
    rect(ctx, 15, 13, 1, 5, color);
    rect(ctx, 13, 13, 1, 1, color);
    rect(ctx, 14, 14, 1, 1, color);
    rect(ctx, 15, 15, 1, 1, color);
    // "A" at x=17
    rect(ctx, 17, 13, 1, 5, color);
    rect(ctx, 19, 13, 1, 5, color);
    rect(ctx, 17, 13, 3, 1, color);
    rect(ctx, 17, 15, 3, 1, color);
  }

  function drawTextBEACH(ctx: Ctx, color: string): void {
    // "B" at x=4
    rect(ctx, 4, 13, 1, 5, color);
    rect(ctx, 5, 13, 2, 1, color);
    rect(ctx, 7, 14, 1, 1, color);
    rect(ctx, 5, 15, 2, 1, color);
    rect(ctx, 7, 16, 1, 1, color);
    rect(ctx, 5, 17, 2, 1, color);
    // "E" at x=9
    rect(ctx, 9, 13, 1, 5, color);
    rect(ctx, 10, 13, 3, 1, color);
    rect(ctx, 10, 15, 2, 1, color);
    rect(ctx, 10, 17, 3, 1, color);
    // "A" at x=14
    rect(ctx, 14, 13, 1, 5, color);
    rect(ctx, 16, 13, 1, 5, color);
    rect(ctx, 14, 13, 3, 1, color);
    rect(ctx, 14, 15, 3, 1, color);
    // "C" at x=18
    rect(ctx, 18, 13, 1, 5, color);
    rect(ctx, 19, 13, 2, 1, color);
    rect(ctx, 19, 17, 2, 1, color);
    // "H" at x=22
    rect(ctx, 22, 13, 1, 5, color);
    rect(ctx, 24, 13, 1, 5, color);
    rect(ctx, 22, 15, 3, 1, color);
  }

  // deco-road-sign-airport — 32×48, left arrow + "AIR"
  {
    const c = scene.textures.createCanvas('deco-road-sign-airport', 32, 48);
    if (!c) return;
    const ctx = c.context;
    drawPost(ctx);
    drawBoard(ctx, '#FFFFFF');
    drawArrowLeft(ctx, '#333333');
    drawTextAIR(ctx, '#333333');
    c.refresh();
  }

  // deco-road-sign-hana — 32×48, up arrow + "HANA"
  {
    const c = scene.textures.createCanvas('deco-road-sign-hana', 32, 48);
    if (!c) return;
    const ctx = c.context;
    drawPost(ctx);
    drawBoard(ctx, '#FFFFFF');
    drawArrowUp(ctx, '#333333');
    drawTextHANA(ctx, '#333333');
    c.refresh();
  }

  // deco-road-sign-beach — 32×48, right arrow + "BEACH", sun-yellow background
  {
    const c = scene.textures.createCanvas('deco-road-sign-beach', 32, 48);
    if (!c) return;
    const ctx = c.context;
    drawPost(ctx);
    drawBoard(ctx, '#FFD700');
    drawArrowRight(ctx, '#5C3A00');
    drawTextBEACH(ctx, '#5C3A00');
    c.refresh();
  }

  // deco-road-sign-back — 32×48, down arrow
  {
    const c = scene.textures.createCanvas('deco-road-sign-back', 32, 48);
    if (!c) return;
    const ctx = c.context;
    drawPost(ctx);
    drawBoard(ctx, '#FFFFFF');
    drawArrowDown(ctx, '#333333');
    c.refresh();
  }
}

function generateJungleFoliage(scene: Phaser.Scene): void {
  // deco-jungle-foliage — 64×32, strip of dark green jungle
  const c = scene.textures.createCanvas('deco-jungle-foliage', 64, 32);
  if (!c) return;
  const ctx = c.context;

  // Base dark green fill
  rect(ctx, 0, 0, 64, 32, '#1B4D1B');

  // Multiple overlapping circles of varying green shades
  // Dark forest green base clusters
  circle(ctx, 8, 20, 10, '#1B4D1B');
  circle(ctx, 22, 22, 11, '#1E5C1E');
  circle(ctx, 36, 20, 10, '#1B4D1B');
  circle(ctx, 50, 22, 11, '#1E5C1E');
  circle(ctx, 64, 20, 10, '#1B4D1B');

  // Medium green mid layer
  circle(ctx, 6, 16, 8, '#2D7A2D');
  circle(ctx, 18, 14, 9, '#2D7A2D');
  circle(ctx, 32, 16, 8, '#2D7A2D');
  circle(ctx, 46, 14, 9, '#2D7A2D');
  circle(ctx, 60, 16, 8, '#2D7A2D');

  // Lime green highlights on top
  circle(ctx, 10, 12, 5, '#4AA83C');
  circle(ctx, 24, 10, 6, '#4AA83C');
  circle(ctx, 38, 12, 5, '#4AA83C');
  circle(ctx, 52, 10, 6, '#4AA83C');

  // Bright highlight pops
  circle(ctx, 8, 9, 3, '#5DC44A');
  circle(ctx, 28, 8, 4, '#5DC44A');
  circle(ctx, 44, 9, 3, '#5DC44A');
  circle(ctx, 58, 8, 3, '#5DC44A');

  c.refresh();
}

function generateRoadTree(scene: Phaser.Scene): void {
  // deco-road-tree — 32×64, tall palm/tropical tree
  const c = scene.textures.createCanvas('deco-road-tree', 32, 64);
  if (!c) return;
  const ctx = c.context;

  // Brown trunk from bottom to middle
  rect(ctx, 14, 30, 4, 34, '#8B5C2A');
  rect(ctx, 14, 30, 1, 34, darken('#8B5C2A', 0.2));
  // Trunk texture lines
  for (let i = 0; i < 8; i++) {
    rect(ctx, 14, 32 + i * 4, 4, 1, darken('#8B5C2A', 0.1));
  }
  // Trunk base
  rect(ctx, 12, 60, 8, 4, darken('#8B5C2A', 0.3));

  // Large green circle canopy at top
  circle(ctx, 16, 18, 14, '#2D7A2D');
  // Darker green depth circles (shadow sides)
  circle(ctx, 12, 20, 10, darken('#2D7A2D', 0.25));
  circle(ctx, 20, 20, 10, darken('#2D7A2D', 0.15));
  // Medium green mid layer
  circle(ctx, 16, 16, 11, '#3A8A3A');
  // Bright highlight top
  circle(ctx, 16, 12, 7, '#4AA83C');
  circle(ctx, 14, 10, 4, '#5DC44A');

  c.refresh();
}

export function generateDrivingTextures(scene: Phaser.Scene): void {
  generatePlayerCar(scene);
  generateRoadSigns(scene);
  generateJungleFoliage(scene);
  generateRoadTree(scene);
}
