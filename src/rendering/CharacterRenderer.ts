import Phaser from 'phaser';
import { AvatarConfig } from '../utils/storage';
import { darken, lighten, hexToNum } from './colorUtils';

const SKIN_TONES = [0xFFDBB4, 0xE8B88A, 0xC68642, 0x8D5524, 0x6B3E26, 0x3B2219];
const OUTFIT_COLORS = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
const FRAME_W = 48;
const FRAME_H = 48;
const FRAMES = 4;

/**
 * Generate a 4-frame spritesheet texture for a character config.
 * Frames: 0=neutral, 1=left-step, 2=neutral, 3=right-step
 */
export function generateCharacterSpritesheet(
  scene: Phaser.Scene,
  config: AvatarConfig,
  textureKey: string
): void {
  // Remove existing texture and animation
  if (scene.textures.exists(textureKey)) {
    scene.textures.remove(textureKey);
  }
  const animKey = `${textureKey}-walk`;
  if (scene.anims.exists(animKey)) {
    scene.anims.remove(animKey);
  }

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const totalW = FRAME_W * FRAMES;

  // Draw 4 frames side by side
  for (let frame = 0; frame < FRAMES; frame++) {
    const ox = frame * FRAME_W; // x offset for this frame
    drawCharacterFrame(g, ox, 0, config, frame);
  }

  g.generateTexture(textureKey, totalW, FRAME_H);
  g.destroy();

  // Add frame data
  const tex = scene.textures.get(textureKey);
  for (let i = 0; i < FRAMES; i++) {
    tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  }

  // Create walk animation
  scene.anims.create({
    key: animKey,
    frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });
}

/**
 * Draw a single character frame at the given offset.
 * frame: 0=neutral, 1=left-step, 2=neutral, 3=right-step
 */
function drawCharacterFrame(
  g: Phaser.GameObjects.Graphics,
  ox: number, oy: number,
  config: AvatarConfig,
  frame: number
): void {
  const skinColor = SKIN_TONES[config.skin] ?? SKIN_TONES[0];
  const skinDark = darken(skinColor, 0.15);
  const skinLight = lighten(skinColor, 0.15);
  const outfitColor = OUTFIT_COLORS[config.outfit] ?? OUTFIT_COLORS[0];
  const outfitDark = darken(outfitColor, 0.25);
  const outfitLight = lighten(outfitColor, 0.2);
  const hairColor = hexToNum(config.hairColor);
  const hairDark = darken(hairColor, 0.2);

  // --- Shadow ---
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(ox + 24, oy + 46, 20, 6);

  // --- Legs (frame-dependent) ---
  const legW = 7;
  const legH = 8;
  const legY = oy + 36;
  let leftLegX = ox + 14;
  let rightLegX = ox + 27;

  if (frame === 1) {
    // Left step forward
    leftLegX -= 2;
    rightLegX += 1;
  } else if (frame === 3) {
    // Right step forward
    leftLegX += 1;
    rightLegX -= 2;
  }

  // Leg outlines
  g.fillStyle(darken(0x334466, 0.3));
  g.fillRect(leftLegX - 1, legY - 1, legW + 2, legH + 2);
  g.fillRect(rightLegX - 1, legY - 1, legW + 2, legH + 2);

  // Leg fills (dark pants)
  g.fillStyle(0x334466);
  g.fillRect(leftLegX, legY, legW, legH);
  g.fillRect(rightLegX, legY, legW, legH);

  // Shoes
  g.fillStyle(0x553322);
  g.fillRect(leftLegX, legY + legH - 3, legW, 3);
  g.fillRect(rightLegX, legY + legH - 3, legW, 3);

  // --- Body / Torso ---
  const bodyX = ox + 12;
  const bodyY = oy + 20;
  const bodyW = 24;
  const bodyH = 17;

  // Body outline
  g.fillStyle(outfitDark);
  g.fillRect(bodyX - 1, bodyY - 1, bodyW + 2, bodyH + 2);

  // Body fill
  g.fillStyle(outfitColor);
  g.fillRect(bodyX, bodyY, bodyW, bodyH);

  // Body highlight (top strip)
  g.fillStyle(outfitLight);
  g.fillRect(bodyX + 1, bodyY + 1, bodyW - 2, 3);

  // Collar detail
  g.fillStyle(outfitDark);
  g.fillRect(ox + 20, bodyY, 8, 3);

  // Belt line
  g.fillStyle(outfitDark);
  g.fillRect(bodyX + 1, bodyY + bodyH - 3, bodyW - 2, 2);

  // --- Arms ---
  const armW = 5;
  const armH = 12;
  const armY = bodyY + 2;

  // Left arm
  g.fillStyle(outfitDark);
  g.fillRect(bodyX - armW - 1, armY - 1, armW + 1, armH + 1);
  g.fillStyle(outfitColor);
  g.fillRect(bodyX - armW, armY, armW, armH);
  // Left hand
  g.fillStyle(skinColor);
  g.fillRect(bodyX - armW + 1, armY + armH - 3, armW - 2, 3);

  // Right arm
  g.fillStyle(outfitDark);
  g.fillRect(bodyX + bodyW, armY - 1, armW + 1, armH + 1);
  g.fillStyle(outfitColor);
  g.fillRect(bodyX + bodyW, armY, armW, armH);
  // Right hand
  g.fillStyle(skinColor);
  g.fillRect(bodyX + bodyW + 1, armY + armH - 3, armW - 2, 3);

  // --- Neck ---
  g.fillStyle(skinColor);
  g.fillRect(ox + 20, oy + 17, 8, 4);

  // --- Head ---
  const headCX = ox + 24;
  const headCY = oy + 11;
  const headR = 10;

  // Head outline
  g.fillStyle(skinDark);
  g.fillCircle(headCX, headCY, headR + 1);

  // Head fill
  g.fillStyle(skinColor);
  g.fillCircle(headCX, headCY, headR);

  // Head highlight
  g.fillStyle(skinLight);
  g.fillCircle(headCX - 2, headCY - 3, 5);

  // --- Eyes ---
  // Eye whites
  g.fillStyle(0xffffff);
  g.fillRect(ox + 19, oy + 9, 4, 3);
  g.fillRect(ox + 25, oy + 9, 4, 3);

  // Pupils
  g.fillStyle(0x222222);
  g.fillRect(ox + 20, oy + 10, 2, 2);
  g.fillRect(ox + 26, oy + 10, 2, 2);

  // Eye shine
  g.fillStyle(0xffffff);
  g.fillRect(ox + 21, oy + 9, 1, 1);
  g.fillRect(ox + 27, oy + 9, 1, 1);

  // --- Mouth ---
  g.fillStyle(darken(skinColor, 0.3));
  g.fillRect(ox + 22, oy + 15, 4, 1);

  // --- Hair ---
  drawHair(g, ox, oy, config.hair, hairColor, hairDark, headCX, headCY, headR);

  // --- Accessory ---
  if (config.accessory === 'hat') {
    drawHat(g, ox, oy, headCX);
  } else if (config.accessory === 'glasses') {
    drawGlasses(g, ox, oy);
  }
}

function drawHair(
  g: Phaser.GameObjects.Graphics,
  ox: number, oy: number,
  style: number,
  color: number, darkColor: number,
  cx: number, cy: number, r: number
): void {
  g.fillStyle(darkColor);

  switch (style) {
    case 0: // Short
      g.fillStyle(darkColor);
      g.fillEllipse(cx, cy - 6, r * 2 + 2, 12);
      g.fillStyle(color);
      g.fillEllipse(cx, cy - 6, r * 2, 10);
      break;

    case 1: // Long
      g.fillStyle(darkColor);
      g.fillEllipse(cx, cy - 6, r * 2 + 4, 14);
      g.fillStyle(color);
      g.fillEllipse(cx, cy - 6, r * 2 + 2, 12);
      // Hair hanging down sides
      g.fillStyle(color);
      g.fillRect(ox + 12, oy + 5, 5, 18);
      g.fillRect(ox + 31, oy + 5, 5, 18);
      break;

    case 2: // Curly
      g.fillStyle(color);
      g.fillCircle(cx - 7, cy - 7, 6);
      g.fillCircle(cx + 7, cy - 7, 6);
      g.fillCircle(cx, cy - 10, 6);
      g.fillCircle(cx - 4, cy - 9, 5);
      g.fillCircle(cx + 4, cy - 9, 5);
      break;

    case 3: // Ponytail
      g.fillStyle(darkColor);
      g.fillEllipse(cx, cy - 6, r * 2 + 2, 12);
      g.fillStyle(color);
      g.fillEllipse(cx, cy - 6, r * 2, 10);
      // Ponytail extending to the right
      g.fillStyle(color);
      g.fillEllipse(cx + 14, cy - 2, 8, 16);
      // Hair tie
      g.fillStyle(darkColor);
      g.fillRect(cx + 10, cy - 4, 3, 4);
      break;

    case 4: // Buzz
      g.fillStyle(color);
      g.fillEllipse(cx, cy - 5, r * 2 - 2, 8);
      break;
  }
}

function drawHat(
  g: Phaser.GameObjects.Graphics,
  ox: number, _oy: number,
  cx: number
): void {
  // Hat brim
  g.fillStyle(darken(0x8B4513, 0.1));
  g.fillRect(ox + 10, 2, 28, 5);
  // Hat crown
  g.fillStyle(0x8B4513);
  g.fillRect(ox + 14, -4, 20, 8);
  // Hat band
  g.fillStyle(darken(0x8B4513, 0.3));
  g.fillRect(ox + 14, 0, 20, 2);
  // Hat highlight
  g.fillStyle(lighten(0x8B4513, 0.2));
  g.fillRect(ox + 15, -3, 18, 2);
}

function drawGlasses(
  g: Phaser.GameObjects.Graphics,
  ox: number, oy: number
): void {
  // Frame color
  g.fillStyle(0x333333);
  // Left lens frame
  g.fillRect(ox + 17, oy + 7, 7, 6);
  // Right lens frame
  g.fillRect(ox + 24, oy + 7, 7, 6);
  // Lens fills (slightly transparent blue)
  g.fillStyle(0x6688aa);
  g.fillRect(ox + 18, oy + 8, 5, 4);
  g.fillRect(ox + 25, oy + 8, 5, 4);
  // Bridge
  g.fillStyle(0x333333);
  g.fillRect(ox + 23, oy + 9, 2, 2);
  // Temple arms
  g.fillRect(ox + 15, oy + 9, 3, 1);
  g.fillRect(ox + 30, oy + 9, 3, 1);
}

/**
 * Draw a character preview for AvatarScene at larger scale.
 * Uses the same rendering logic but scaled up.
 */
export function drawCharacterPreview(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  config: AvatarConfig,
  selected: boolean,
  scale = 2.5
): void {
  if (selected) {
    g.lineStyle(2, 0x7c3aed);
    g.strokeRect(
      x - (FRAME_W * scale) / 2,
      y - (FRAME_H * scale) / 2,
      FRAME_W * scale,
      FRAME_H * scale
    );
  }

  // Use save/restore pattern with matrix transform for scaling
  // Since Phaser Graphics doesn't have a direct scale, we'll
  // generate a texture at 1x and draw it as an image instead.
  // For the preview, we'll draw manually at the scaled coordinates.

  const skinColor = SKIN_TONES[config.skin] ?? SKIN_TONES[0];
  const skinDark = darken(skinColor, 0.15);
  const skinLight = lighten(skinColor, 0.15);
  const outfitColor = OUTFIT_COLORS[config.outfit] ?? OUTFIT_COLORS[0];
  const outfitDark = darken(outfitColor, 0.25);
  const outfitLight = lighten(outfitColor, 0.2);
  const hairColor = hexToNum(config.hairColor);
  const hairDark = darken(hairColor, 0.2);

  const s = scale;
  const cx = x;
  const cy = y;

  // Shadow
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(cx, cy + 22 * s, 20 * s, 6 * s);

  // Legs
  g.fillStyle(0x334466);
  g.fillRect(cx - 10 * s, cy + 12 * s, 7 * s, 8 * s);
  g.fillRect(cx + 3 * s, cy + 12 * s, 7 * s, 8 * s);

  // Shoes
  g.fillStyle(0x553322);
  g.fillRect(cx - 10 * s, cy + 17 * s, 7 * s, 3 * s);
  g.fillRect(cx + 3 * s, cy + 17 * s, 7 * s, 3 * s);

  // Body
  g.fillStyle(outfitDark);
  g.fillRect(cx - 12 * s - s, cy - 4 * s - s, 24 * s + 2 * s, 17 * s + 2 * s);
  g.fillStyle(outfitColor);
  g.fillRect(cx - 12 * s, cy - 4 * s, 24 * s, 17 * s);
  g.fillStyle(outfitLight);
  g.fillRect(cx - 11 * s, cy - 3 * s, 22 * s, 3 * s);

  // Collar
  g.fillStyle(outfitDark);
  g.fillRect(cx - 4 * s, cy - 4 * s, 8 * s, 3 * s);

  // Belt
  g.fillStyle(outfitDark);
  g.fillRect(cx - 11 * s, cy + 10 * s, 22 * s, 2 * s);

  // Arms
  g.fillStyle(outfitColor);
  g.fillRect(cx - 17 * s, cy - 2 * s, 5 * s, 12 * s);
  g.fillRect(cx + 12 * s, cy - 2 * s, 5 * s, 12 * s);
  // Hands
  g.fillStyle(skinColor);
  g.fillRect(cx - 16 * s, cy + 7 * s, 3 * s, 3 * s);
  g.fillRect(cx + 13 * s, cy + 7 * s, 3 * s, 3 * s);

  // Neck
  g.fillStyle(skinColor);
  g.fillRect(cx - 4 * s, cy - 7 * s, 8 * s, 4 * s);

  // Head
  g.fillStyle(skinDark);
  g.fillCircle(cx, cy - 13 * s, 11 * s);
  g.fillStyle(skinColor);
  g.fillCircle(cx, cy - 13 * s, 10 * s);
  g.fillStyle(skinLight);
  g.fillCircle(cx - 2 * s, cy - 16 * s, 5 * s);

  // Eyes
  g.fillStyle(0xffffff);
  g.fillRect(cx - 5 * s, cy - 15 * s, 4 * s, 3 * s);
  g.fillRect(cx + 1 * s, cy - 15 * s, 4 * s, 3 * s);
  g.fillStyle(0x222222);
  g.fillRect(cx - 4 * s, cy - 14 * s, 2 * s, 2 * s);
  g.fillRect(cx + 2 * s, cy - 14 * s, 2 * s, 2 * s);
  g.fillStyle(0xffffff);
  g.fillRect(cx - 3 * s, cy - 15 * s, 1 * s, 1 * s);
  g.fillRect(cx + 3 * s, cy - 15 * s, 1 * s, 1 * s);

  // Mouth
  g.fillStyle(darken(skinColor, 0.3));
  g.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, 1 * s);

  // Hair
  drawHairPreview(g, cx, cy, config.hair, hairColor, hairDark, s);

  // Accessory
  if (config.accessory === 'hat') {
    g.fillStyle(darken(0x8B4513, 0.1));
    g.fillRect(cx - 14 * s, cy - 22 * s, 28 * s, 5 * s);
    g.fillStyle(0x8B4513);
    g.fillRect(cx - 10 * s, cy - 28 * s, 20 * s, 8 * s);
    g.fillStyle(darken(0x8B4513, 0.3));
    g.fillRect(cx - 10 * s, cy - 24 * s, 20 * s, 2 * s);
  } else if (config.accessory === 'glasses') {
    g.fillStyle(0x333333);
    g.fillRect(cx - 7 * s, cy - 17 * s, 7 * s, 6 * s);
    g.fillRect(cx, cy - 17 * s, 7 * s, 6 * s);
    g.fillStyle(0x6688aa);
    g.fillRect(cx - 6 * s, cy - 16 * s, 5 * s, 4 * s);
    g.fillRect(cx + 1 * s, cy - 16 * s, 5 * s, 4 * s);
    g.fillStyle(0x333333);
    g.fillRect(cx - 1 * s, cy - 15 * s, 2 * s, 2 * s);
  }
}

function drawHairPreview(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  style: number,
  color: number, darkColor: number,
  s: number
): void {
  const headY = cy - 13 * s;

  switch (style) {
    case 0: // Short
      g.fillStyle(darkColor);
      g.fillEllipse(cx, headY - 6 * s, 22 * s, 12 * s);
      g.fillStyle(color);
      g.fillEllipse(cx, headY - 6 * s, 20 * s, 10 * s);
      break;

    case 1: // Long
      g.fillStyle(darkColor);
      g.fillEllipse(cx, headY - 6 * s, 24 * s, 14 * s);
      g.fillStyle(color);
      g.fillEllipse(cx, headY - 6 * s, 22 * s, 12 * s);
      g.fillStyle(color);
      g.fillRect(cx - 12 * s, headY - 2 * s, 5 * s, 18 * s);
      g.fillRect(cx + 7 * s, headY - 2 * s, 5 * s, 18 * s);
      break;

    case 2: // Curly
      g.fillStyle(color);
      g.fillCircle(cx - 7 * s, headY - 7 * s, 6 * s);
      g.fillCircle(cx + 7 * s, headY - 7 * s, 6 * s);
      g.fillCircle(cx, headY - 10 * s, 6 * s);
      g.fillCircle(cx - 4 * s, headY - 9 * s, 5 * s);
      g.fillCircle(cx + 4 * s, headY - 9 * s, 5 * s);
      break;

    case 3: // Ponytail
      g.fillStyle(darkColor);
      g.fillEllipse(cx, headY - 6 * s, 22 * s, 12 * s);
      g.fillStyle(color);
      g.fillEllipse(cx, headY - 6 * s, 20 * s, 10 * s);
      g.fillStyle(color);
      g.fillEllipse(cx + 14 * s, headY + 1 * s, 8 * s, 16 * s);
      g.fillStyle(darkColor);
      g.fillRect(cx + 10 * s, headY - 2 * s, 3 * s, 4 * s);
      break;

    case 4: // Buzz
      g.fillStyle(color);
      g.fillEllipse(cx, headY - 5 * s, 18 * s, 8 * s);
      break;
  }
}
