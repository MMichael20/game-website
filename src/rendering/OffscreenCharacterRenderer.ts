import Phaser from 'phaser';
import { OUTFITS } from './OutfitRenderer';

/**
 * Body metrics exported for use by OutfitRenderer.
 * Describes key anatomical positions and widths on the canvas.
 */
export interface BodyMetrics {
  /** Center X of the character on canvas */
  centerX: number;
  /** Y positions */
  shoulderY: number;
  waistY: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  /** Widths at key points */
  shoulderWidth: number;
  waistWidth: number;
  hipWidth: number;
  /** Arm positions */
  leftArmX: number;
  rightArmX: number;
  armTopY: number;
  armBottomY: number;
  /** Scale factor (1.0 for game textures, ~1.875 for 300px preview) */
  scale: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_W = 160;
const CANVAS_H = 200;

const SKIN_TONE = '#ffe0c0';
const SKIN_SHADOW = '#eec8a0';
const SKIN_HIGHLIGHT = '#fff0d8';

// Her hair
const HER_HAIR_DARK = '#1a0a00';
const HER_HAIR_LIGHT = '#2c1810';

// Him hair
const HIM_HAIR_DARK = '#e8c830';
const HIM_HAIR_LIGHT = '#f0d860';

// Eye colors
const HER_EYE_COLOR = '#553311';
const HIM_EYE_COLOR = '#3377dd';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToComponents(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `rgb(${dr},${dg},${db})`;
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr},${lg},${lb})`;
}

/**
 * Compute body metrics for a given character and scale.
 */
function computeMetrics(character: 'her' | 'him', scale: number): BodyMetrics {
  const isHer = character === 'her';
  const charHeight = isHer ? 140 : 160;
  const centerX = (CANVAS_W / 2) * scale;

  // All Y values relative to top of character, offset so feet land near bottom of canvas
  const topOffset = ((CANVAS_H - charHeight) * scale) / 2 + 10 * scale;

  const shoulderY = topOffset + (isHer ? 42 : 38) * scale;
  const waistY = topOffset + (isHer ? 68 : 70) * scale;
  const hipY = topOffset + (isHer ? 80 : 82) * scale;
  const kneeY = topOffset + (isHer ? 108 : 115) * scale;
  const ankleY = topOffset + (isHer ? 128 : 140) * scale;

  const shoulderWidth = (isHer ? 40 : 50) * scale;
  const waistWidth = (isHer ? 28 : 38) * scale;
  const hipWidth = (isHer ? 42 : 40) * scale;

  const leftArmX = centerX - shoulderWidth / 2 - 6 * scale;
  const rightArmX = centerX + shoulderWidth / 2 + 6 * scale;
  const armTopY = shoulderY + 2 * scale;
  const armBottomY = waistY + 20 * scale;

  return {
    centerX,
    shoulderY,
    waistY,
    hipY,
    kneeY,
    ankleY,
    shoulderWidth,
    waistWidth,
    hipWidth,
    leftArmX,
    rightArmX,
    armTopY,
    armBottomY,
    scale,
  };
}

// ---------------------------------------------------------------------------
// Drawing routines
// ---------------------------------------------------------------------------

/**
 * Frame offsets for walk animation.
 * Frame 0 = neutral, 1 = left step, 2 = right step (mirror of 1).
 */
interface FrameOffsets {
  leftLegDx: number;
  rightLegDx: number;
  leftLegDy: number;
  rightLegDy: number;
  leftArmDy: number;
  rightArmDy: number;
}

function getFrameOffsets(frameIndex: number, scale: number): FrameOffsets {
  switch (frameIndex) {
    case 1: // left step
      return {
        leftLegDx: -5 * scale,
        rightLegDx: 3 * scale,
        leftLegDy: 0,
        rightLegDy: -4 * scale,
        leftArmDy: 0,
        rightArmDy: -4 * scale,
      };
    case 2: // right step (mirror)
      return {
        leftLegDx: 3 * scale,
        rightLegDx: -5 * scale,
        leftLegDy: -4 * scale,
        rightLegDy: 0,
        leftArmDy: -4 * scale,
        rightArmDy: 0,
      };
    default: // neutral
      return { leftLegDx: 0, rightLegDx: 0, leftLegDy: 0, rightLegDy: 0, leftArmDy: 0, rightArmDy: 0 };
  }
}

/**
 * Main drawing function — renders a full character frame onto the given context.
 */
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  outfitIndex: number,
  metrics: BodyMetrics,
  frameIndex: number,
  canvasW: number,
  canvasH: number,
): void {
  const s = metrics.scale;
  const isHer = character === 'her';
  const offsets = getFrameOffsets(frameIndex, s);

  const cx = metrics.centerX;
  const hairDark = isHer ? HER_HAIR_DARK : HIM_HAIR_DARK;
  const hairLight = isHer ? HER_HAIR_LIGHT : HIM_HAIR_LIGHT;
  const eyeColor = isHer ? HER_EYE_COLOR : HIM_EYE_COLOR;

  // Clear
  ctx.clearRect(0, 0, canvasW, canvasH);

  // ===== Layer 1: Drop shadow =====
  drawDropShadow(ctx, cx, metrics.ankleY + 8 * s, metrics.hipWidth * 0.7, 6 * s);

  // ===== Layer 2: Back hair (her only — long hair behind body) =====
  if (isHer) {
    drawBackHair(ctx, cx, metrics.shoulderY - 30 * s, hairDark, hairLight, s);
  }

  // ===== Layer 3: Legs =====
  drawLegs(ctx, cx, metrics, offsets, s);

  // ===== Layer 4: Body base =====
  drawBody(ctx, cx, metrics, isHer, s);

  // ===== Layer 5: Outfit =====
  const outfit = OUTFITS[outfitIndex % OUTFITS.length];
  try {
    outfit.draw(ctx, character, frameIndex, metrics);
  } catch (err) {
    console.warn(`Outfit ${outfitIndex} draw failed (frame ${frameIndex}):`, err);
  }

  // ===== Layer 6: Arms =====
  drawArms(ctx, cx, metrics, offsets, isHer, s);

  // ===== Layer 7: Neck + Head =====
  const headCy = metrics.shoulderY - 22 * s;
  drawNeckAndHead(ctx, cx, headCy, metrics.shoulderY, isHer, s);

  // ===== Layer 8: Face =====
  drawFace(ctx, cx, headCy, eyeColor, isHer, s);

  // ===== Layer 9: Front hair =====
  drawFrontHair(ctx, cx, headCy, hairDark, hairLight, isHer, s);

  // ===== Layer 10: Highlights pass =====
  drawHighlights(ctx, cx, headCy, metrics, hairDark, isHer, canvasW, canvasH, s);
}

// --- Individual layer drawing functions ---

function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ctx.restore();
}

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  cx: number, topY: number,
  dark: string, light: string,
  s: number,
): void {
  ctx.save();
  const grad = ctx.createLinearGradient(cx - 20 * s, topY, cx + 20 * s, topY + 90 * s);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.5, light);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;

  ctx.beginPath();
  // Hair flows from top of head down past shoulders
  ctx.moveTo(cx - 18 * s, topY + 10 * s);
  ctx.bezierCurveTo(
    cx - 22 * s, topY + 40 * s,
    cx - 20 * s, topY + 70 * s,
    cx - 14 * s, topY + 90 * s,
  );
  ctx.lineTo(cx + 14 * s, topY + 90 * s);
  ctx.bezierCurveTo(
    cx + 20 * s, topY + 70 * s,
    cx + 22 * s, topY + 40 * s,
    cx + 18 * s, topY + 10 * s,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  offsets: FrameOffsets,
  s: number,
): void {
  const legTopY = metrics.hipY + 4 * s;
  const legWidth = 10 * s;
  const legHeight = metrics.ankleY - legTopY + 6 * s;
  const legSpacing = 6 * s;

  const leftY = legTopY + offsets.leftLegDy;
  const rightY = legTopY + offsets.rightLegDy;

  // Left leg
  ctx.save();
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx - legSpacing - legWidth + offsets.leftLegDx, leftY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Left shoe
  ctx.fillStyle = '#553322';
  ctx.beginPath();
  ctx.ellipse(
    cx - legSpacing - legWidth / 2 + offsets.leftLegDx,
    leftY + legHeight - 1 * s,
    legWidth * 0.7, 4 * s, -0.2, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx + legSpacing + offsets.rightLegDx, rightY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Right shoe
  ctx.fillStyle = '#553322';
  ctx.beginPath();
  ctx.ellipse(
    cx + legSpacing + legWidth / 2 + offsets.rightLegDx,
    rightY + legHeight - 1 * s,
    legWidth * 0.7, 4 * s, 0.2, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  isHer: boolean,
  s: number,
): void {
  ctx.save();

  // Skin-toned body base with gradient shading
  const skinGrad = ctx.createRadialGradient(
    cx, metrics.waistY, 5 * s,
    cx, metrics.waistY, metrics.shoulderWidth * 0.8,
  );
  skinGrad.addColorStop(0, SKIN_HIGHLIGHT);
  skinGrad.addColorStop(0.6, SKIN_TONE);
  skinGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = skinGrad;

  // Draw body contour using bezier curves
  ctx.beginPath();
  if (isHer) {
    // Hourglass shape
    const sw = metrics.shoulderWidth / 2;
    const ww = metrics.waistWidth / 2;
    const hw = metrics.hipWidth / 2;

    ctx.moveTo(cx - sw, metrics.shoulderY);
    // Left shoulder to waist (inward curve)
    ctx.bezierCurveTo(
      cx - sw - 2 * s, metrics.shoulderY + 10 * s,
      cx - ww - 2 * s, metrics.waistY - 8 * s,
      cx - ww, metrics.waistY,
    );
    // Left waist to hip (outward curve)
    ctx.bezierCurveTo(
      cx - ww - 2 * s, metrics.waistY + 8 * s,
      cx - hw - 2 * s, metrics.hipY - 4 * s,
      cx - hw, metrics.hipY,
    );
    // Bottom across
    ctx.lineTo(cx + hw, metrics.hipY);
    // Right hip to waist
    ctx.bezierCurveTo(
      cx + hw + 2 * s, metrics.hipY - 4 * s,
      cx + ww + 2 * s, metrics.waistY + 8 * s,
      cx + ww, metrics.waistY,
    );
    // Right waist to shoulder
    ctx.bezierCurveTo(
      cx + ww + 2 * s, metrics.waistY - 8 * s,
      cx + sw + 2 * s, metrics.shoulderY + 10 * s,
      cx + sw, metrics.shoulderY,
    );
    ctx.closePath();

    // Bust curves (subtle)
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = darkenHex(SKIN_TONE, 0.05);
    ctx.ellipse(cx - 8 * s, metrics.shoulderY + 8 * s, 10 * s, 6 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, metrics.shoulderY + 8 * s, 10 * s, 6 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Athletic build — broad shoulders, straight hips
    const sw = metrics.shoulderWidth / 2;
    const ww = metrics.waistWidth / 2;
    const hw = metrics.hipWidth / 2;

    ctx.moveTo(cx - sw, metrics.shoulderY);
    // Left shoulder down to waist (slight taper)
    ctx.bezierCurveTo(
      cx - sw, metrics.shoulderY + 12 * s,
      cx - ww - 4 * s, metrics.waistY - 6 * s,
      cx - ww, metrics.waistY,
    );
    // Left waist to hip (straight)
    ctx.bezierCurveTo(
      cx - ww, metrics.waistY + 6 * s,
      cx - hw, metrics.hipY - 4 * s,
      cx - hw, metrics.hipY,
    );
    ctx.lineTo(cx + hw, metrics.hipY);
    // Right hip to waist
    ctx.bezierCurveTo(
      cx + hw, metrics.hipY - 4 * s,
      cx + ww, metrics.waistY + 6 * s,
      cx + ww, metrics.waistY,
    );
    // Right waist to shoulder
    ctx.bezierCurveTo(
      cx + ww + 4 * s, metrics.waistY - 6 * s,
      cx + sw, metrics.shoulderY + 12 * s,
      cx + sw, metrics.shoulderY,
    );
    ctx.closePath();

    // Chest/pec definition
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = darkenHex(SKIN_TONE, 0.06);
    ctx.ellipse(cx - 10 * s, metrics.shoulderY + 6 * s, 12 * s, 5 * s, -0.1, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10 * s, metrics.shoulderY + 6 * s, 12 * s, 5 * s, 0.1, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}


function drawArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  offsets: FrameOffsets,
  isHer: boolean,
  s: number,
): void {
  const armWidth = isHer ? 8 * s : 10 * s;
  const armLength = metrics.armBottomY - metrics.armTopY;
  const elbowFrac = 0.5;

  // Left arm
  ctx.save();
  const lx = metrics.leftArmX;
  const ly = metrics.armTopY + offsets.leftArmDy;
  const elbowLx = lx - 2 * s;
  const elbowLy = ly + armLength * elbowFrac;

  const leftArmGrad = ctx.createLinearGradient(lx, ly, lx, ly + armLength);
  leftArmGrad.addColorStop(0, SKIN_TONE);
  leftArmGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = leftArmGrad;

  // Upper arm (shoulder to elbow)
  ctx.beginPath();
  ctx.moveTo(lx - armWidth / 2, ly);
  ctx.bezierCurveTo(
    lx - armWidth / 2 - 1 * s, ly + armLength * 0.2,
    elbowLx - armWidth / 2, elbowLy - 2 * s,
    elbowLx - armWidth / 2 + 1 * s, elbowLy,
  );
  ctx.lineTo(elbowLx + armWidth / 2 - 1 * s, elbowLy);
  ctx.bezierCurveTo(
    lx + armWidth / 2, elbowLy - 2 * s,
    lx + armWidth / 2 + 1 * s, ly + armLength * 0.2,
    lx + armWidth / 2, ly,
  );
  ctx.closePath();
  ctx.fill();

  // Lower arm (elbow to wrist)
  ctx.beginPath();
  ctx.moveTo(elbowLx - armWidth / 2 + 1 * s, elbowLy);
  ctx.bezierCurveTo(
    elbowLx - armWidth / 2, elbowLy + armLength * 0.2,
    lx - armWidth / 2, ly + armLength * 0.9,
    lx - armWidth / 2 + 1 * s, ly + armLength,
  );
  ctx.lineTo(lx + armWidth / 2 - 1 * s, ly + armLength);
  ctx.bezierCurveTo(
    lx + armWidth / 2, ly + armLength * 0.9,
    elbowLx + armWidth / 2, elbowLy + armLength * 0.2,
    elbowLx + armWidth / 2 - 1 * s, elbowLy,
  );
  ctx.closePath();
  ctx.fill();

  // Left hand
  ctx.fillStyle = SKIN_TONE;
  ctx.beginPath();
  ctx.ellipse(lx, ly + armLength + 3 * s, armWidth / 2, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm
  ctx.save();
  const rx = metrics.rightArmX;
  const ry = metrics.armTopY + offsets.rightArmDy;
  const elbowRx = rx + 2 * s;
  const elbowRy = ry + armLength * elbowFrac;

  const rightArmGrad = ctx.createLinearGradient(rx, ry, rx, ry + armLength);
  rightArmGrad.addColorStop(0, SKIN_TONE);
  rightArmGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = rightArmGrad;

  // Upper arm
  ctx.beginPath();
  ctx.moveTo(rx - armWidth / 2, ry);
  ctx.bezierCurveTo(
    rx - armWidth / 2 - 1 * s, ry + armLength * 0.2,
    elbowRx - armWidth / 2, elbowRy - 2 * s,
    elbowRx - armWidth / 2 + 1 * s, elbowRy,
  );
  ctx.lineTo(elbowRx + armWidth / 2 - 1 * s, elbowRy);
  ctx.bezierCurveTo(
    rx + armWidth / 2, elbowRy - 2 * s,
    rx + armWidth / 2 + 1 * s, ry + armLength * 0.2,
    rx + armWidth / 2, ry,
  );
  ctx.closePath();
  ctx.fill();

  // Lower arm
  ctx.beginPath();
  ctx.moveTo(elbowRx - armWidth / 2 + 1 * s, elbowRy);
  ctx.bezierCurveTo(
    elbowRx - armWidth / 2, elbowRy + armLength * 0.2,
    rx - armWidth / 2, ry + armLength * 0.9,
    rx - armWidth / 2 + 1 * s, ry + armLength,
  );
  ctx.lineTo(rx + armWidth / 2 - 1 * s, ry + armLength);
  ctx.bezierCurveTo(
    rx + armWidth / 2, ry + armLength * 0.9,
    elbowRx + armWidth / 2, elbowRy + armLength * 0.2,
    elbowRx + armWidth / 2 - 1 * s, elbowRy,
  );
  ctx.closePath();
  ctx.fill();

  // Right hand
  ctx.fillStyle = SKIN_TONE;
  ctx.beginPath();
  ctx.ellipse(rx, ry + armLength + 3 * s, armWidth / 2, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawNeckAndHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headCy: number,
  shoulderY: number,
  isHer: boolean,
  s: number,
): void {
  const headRadius = isHer ? 14 * s : 15 * s;
  const neckWidth = isHer ? 8 * s : 10 * s;

  // Neck
  ctx.save();
  const neckGrad = ctx.createLinearGradient(cx - neckWidth / 2, shoulderY - 8 * s, cx + neckWidth / 2, shoulderY);
  neckGrad.addColorStop(0, SKIN_TONE);
  neckGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - neckWidth / 2, shoulderY - 10 * s, neckWidth, 12 * s);
  ctx.restore();

  // Head
  ctx.save();
  const headGrad = ctx.createRadialGradient(
    cx - 3 * s, headCy - 3 * s, 2 * s,
    cx, headCy, headRadius,
  );
  headGrad.addColorStop(0, SKIN_HIGHLIGHT);
  headGrad.addColorStop(0.5, SKIN_TONE);
  headGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = headGrad;

  ctx.beginPath();
  if (isHer) {
    // Softer, rounder face
    ctx.ellipse(cx, headCy, headRadius * 0.92, headRadius, 0, 0, Math.PI * 2);
  } else {
    // Slightly squarer jaw — draw as ellipse with a bit more width at bottom
    ctx.ellipse(cx, headCy - 1 * s, headRadius * 0.95, headRadius, 0, 0, Math.PI * 2);
    // Jawline definition
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = darkenHex(SKIN_TONE, 0.04);
    ctx.moveTo(cx - headRadius * 0.8, headCy + 4 * s);
    ctx.bezierCurveTo(
      cx - headRadius * 0.6, headCy + headRadius * 0.95,
      cx + headRadius * 0.6, headCy + headRadius * 0.95,
      cx + headRadius * 0.8, headCy + 4 * s,
    );
    ctx.bezierCurveTo(
      cx + headRadius * 0.7, headCy + headRadius * 0.85,
      cx - headRadius * 0.7, headCy + headRadius * 0.85,
      cx - headRadius * 0.8, headCy + 4 * s,
    );
  }
  ctx.fill();

  // Ear hints
  ctx.fillStyle = SKIN_SHADOW;
  ctx.beginPath();
  ctx.ellipse(cx - headRadius * 0.9, headCy + 1 * s, 3 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + headRadius * 0.9, headCy + 1 * s, 3 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headCy: number,
  eyeColor: string,
  isHer: boolean,
  s: number,
): void {
  const eyeSpacing = 8 * s;
  const eyeY = headCy - 1 * s;
  const eyeW = isHer ? 5 * s : 4.5 * s;
  const eyeH = isHer ? 4 * s : 3.5 * s;

  // Eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSpacing;

    // Eye white
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris with gradient
    const irisR = isHer ? 3 * s : 2.8 * s;
    const irisGrad = ctx.createRadialGradient(
      ex + 0.5 * s * side, eyeY - 0.5 * s, 0.5 * s,
      ex, eyeY, irisR,
    );
    irisGrad.addColorStop(0, lightenHex(eyeColor, 0.3));
    irisGrad.addColorStop(0.5, eyeColor);
    irisGrad.addColorStop(1, darkenHex(eyeColor, 0.3));
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, eyeY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(ex, eyeY, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Shine highlights (two white dots)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 1 * s, eyeY - 1 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 0.8 * s, eyeY + 0.5 * s, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelid line
    ctx.strokeStyle = darkenHex(SKIN_TONE, 0.3);
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();

    // Eyelashes for her
    if (isHer) {
      ctx.strokeStyle = '#1a0a00';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(ex - eyeW, eyeY);
      ctx.lineTo(ex - eyeW - 1.5 * s, eyeY - 2 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + eyeW, eyeY);
      ctx.lineTo(ex + eyeW + 1.5 * s, eyeY - 2 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Eyebrows
  ctx.save();
  ctx.strokeStyle = isHer ? '#2c1810' : '#c8a828';
  ctx.lineWidth = isHer ? 1.2 * s : 1.5 * s;
  for (const side of [-1, 1]) {
    const bx = cx + side * eyeSpacing;
    ctx.beginPath();
    ctx.moveTo(bx - 4 * s * side, eyeY - 6 * s);
    ctx.bezierCurveTo(
      bx - 2 * s * side, eyeY - 8 * s,
      bx + 2 * s * side, eyeY - 8 * s,
      bx + 4 * s * side, eyeY - 6.5 * s,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Nose
  ctx.save();
  const noseY = headCy + 4 * s;
  ctx.strokeStyle = darkenHex(SKIN_TONE, 0.2);
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  if (isHer) {
    // Small delicate nose
    ctx.moveTo(cx, headCy);
    ctx.bezierCurveTo(cx + 1.5 * s, headCy + 2 * s, cx + 2 * s, noseY, cx, noseY + 1 * s);
  } else {
    // Slightly stronger nose
    ctx.moveTo(cx, headCy - 1 * s);
    ctx.bezierCurveTo(cx + 2 * s, headCy + 2 * s, cx + 3 * s, noseY, cx, noseY + 2 * s);
  }
  ctx.stroke();

  // Nostrils hint
  ctx.fillStyle = darkenHex(SKIN_TONE, 0.15);
  ctx.beginPath();
  ctx.ellipse(cx - 1.5 * s, noseY + (isHer ? 1 : 2) * s, 1 * s, 0.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 1.5 * s, noseY + (isHer ? 1 : 2) * s, 1 * s, 0.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Mouth
  ctx.save();
  const mouthY = headCy + 8 * s;
  if (isHer) {
    // Subtle pink lips
    ctx.fillStyle = '#dd8888';
    ctx.beginPath();
    // Upper lip (cupid's bow)
    ctx.moveTo(cx - 4 * s, mouthY);
    ctx.bezierCurveTo(cx - 2 * s, mouthY - 1.5 * s, cx - 0.5 * s, mouthY - 0.5 * s, cx, mouthY - 1 * s);
    ctx.bezierCurveTo(cx + 0.5 * s, mouthY - 0.5 * s, cx + 2 * s, mouthY - 1.5 * s, cx + 4 * s, mouthY);
    // Lower lip
    ctx.bezierCurveTo(cx + 2 * s, mouthY + 2.5 * s, cx - 2 * s, mouthY + 2.5 * s, cx - 4 * s, mouthY);
    ctx.fill();

    // Lip shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 1 * s, mouthY + 0.8 * s, 1.5 * s, 0.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Simple mouth line
    ctx.strokeStyle = darkenHex(SKIN_TONE, 0.3);
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * s, mouthY);
    ctx.bezierCurveTo(cx - 2 * s, mouthY + 1 * s, cx + 2 * s, mouthY + 1 * s, cx + 4 * s, mouthY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headCy: number,
  dark: string, light: string,
  isHer: boolean,
  s: number,
): void {
  ctx.save();

  const headRadius = isHer ? 14 * s : 15 * s;
  const hairTop = headCy - headRadius - 2 * s;

  const hairGrad = ctx.createLinearGradient(cx - headRadius, hairTop, cx + headRadius, hairTop + headRadius);
  hairGrad.addColorStop(0, light);
  hairGrad.addColorStop(0.4, dark);
  hairGrad.addColorStop(0.8, light);
  hairGrad.addColorStop(1, dark);
  ctx.fillStyle = hairGrad;

  if (isHer) {
    // Bangs — soft curve across forehead
    ctx.beginPath();
    ctx.moveTo(cx - headRadius * 0.95, headCy - headRadius * 0.4);
    ctx.bezierCurveTo(
      cx - headRadius * 0.8, hairTop - 4 * s,
      cx, hairTop - 6 * s,
      cx + headRadius * 0.5, hairTop - 2 * s,
    );
    ctx.bezierCurveTo(
      cx + headRadius * 0.8, hairTop,
      cx + headRadius * 0.95, hairTop + 4 * s,
      cx + headRadius * 0.95, headCy - headRadius * 0.3,
    );
    // Hairline curves back up
    ctx.bezierCurveTo(
      cx + headRadius * 0.7, headCy - headRadius * 0.6,
      cx + headRadius * 0.3, headCy - headRadius * 0.75,
      cx, headCy - headRadius * 0.7,
    );
    ctx.bezierCurveTo(
      cx - headRadius * 0.3, headCy - headRadius * 0.65,
      cx - headRadius * 0.7, headCy - headRadius * 0.5,
      cx - headRadius * 0.95, headCy - headRadius * 0.4,
    );
    ctx.closePath();
    ctx.fill();

    // Side framing strands
    ctx.fillStyle = dark;
    // Left strand
    ctx.beginPath();
    ctx.moveTo(cx - headRadius * 0.9, headCy - headRadius * 0.3);
    ctx.bezierCurveTo(
      cx - headRadius * 1.1, headCy,
      cx - headRadius * 1.05, headCy + headRadius * 0.6,
      cx - headRadius * 0.85, headCy + headRadius * 0.8,
    );
    ctx.lineTo(cx - headRadius * 0.65, headCy + headRadius * 0.6);
    ctx.bezierCurveTo(
      cx - headRadius * 0.75, headCy + headRadius * 0.2,
      cx - headRadius * 0.8, headCy - headRadius * 0.1,
      cx - headRadius * 0.9, headCy - headRadius * 0.3,
    );
    ctx.closePath();
    ctx.fill();

    // Right strand
    ctx.beginPath();
    ctx.moveTo(cx + headRadius * 0.9, headCy - headRadius * 0.2);
    ctx.bezierCurveTo(
      cx + headRadius * 1.05, headCy + headRadius * 0.1,
      cx + headRadius * 1.0, headCy + headRadius * 0.5,
      cx + headRadius * 0.8, headCy + headRadius * 0.7,
    );
    ctx.lineTo(cx + headRadius * 0.6, headCy + headRadius * 0.5);
    ctx.bezierCurveTo(
      cx + headRadius * 0.75, headCy + headRadius * 0.2,
      cx + headRadius * 0.8, headCy - headRadius * 0.05,
      cx + headRadius * 0.9, headCy - headRadius * 0.2,
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // Short-medium tousled hair
    ctx.beginPath();
    ctx.moveTo(cx - headRadius * 0.85, headCy - headRadius * 0.35);
    // Top of hair - slightly tousled with bumps
    ctx.bezierCurveTo(
      cx - headRadius * 0.7, hairTop - 5 * s,
      cx - headRadius * 0.2, hairTop - 8 * s,
      cx, hairTop - 6 * s,
    );
    ctx.bezierCurveTo(
      cx + headRadius * 0.3, hairTop - 9 * s,
      cx + headRadius * 0.7, hairTop - 4 * s,
      cx + headRadius * 0.9, headCy - headRadius * 0.3,
    );
    // Hairline
    ctx.bezierCurveTo(
      cx + headRadius * 0.7, headCy - headRadius * 0.55,
      cx + headRadius * 0.3, headCy - headRadius * 0.65,
      cx, headCy - headRadius * 0.6,
    );
    ctx.bezierCurveTo(
      cx - headRadius * 0.3, headCy - headRadius * 0.55,
      cx - headRadius * 0.65, headCy - headRadius * 0.45,
      cx - headRadius * 0.85, headCy - headRadius * 0.35,
    );
    ctx.closePath();
    ctx.fill();

    // Tousled strands on top
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * s, hairTop - 4 * s);
    ctx.bezierCurveTo(cx, hairTop - 10 * s, cx + 4 * s, hairTop - 8 * s, cx + 6 * s, hairTop - 3 * s);
    ctx.bezierCurveTo(cx + 4 * s, hairTop - 5 * s, cx + 1 * s, hairTop - 7 * s, cx - 2 * s, hairTop - 4 * s);
    ctx.closePath();
    ctx.fill();
  }

  // Hair sheen — specular highlight
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(
    cx + headRadius * 0.2,
    hairTop + headRadius * 0.4,
    headRadius * 0.3,
    headRadius * 0.8,
    -0.4, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}

function drawHighlights(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headCy: number,
  metrics: BodyMetrics,
  _hairDark: string,
  isHer: boolean,
  canvasW: number,
  canvasH: number,
  s: number,
): void {
  // Rim lighting pass using 'screen' composite
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const headRadius = isHer ? 14 * s : 15 * s;

  // Hair rim light (right side)
  ctx.fillStyle = 'rgba(80,60,40,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx + headRadius * 0.7, headCy - headRadius * 0.5, 4 * s, headRadius * 0.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Body rim light
  ctx.fillStyle = 'rgba(60,50,40,0.1)';
  ctx.beginPath();
  ctx.ellipse(
    cx + metrics.shoulderWidth / 2 - 2 * s,
    (metrics.shoulderY + metrics.hipY) / 2,
    3 * s,
    (metrics.hipY - metrics.shoulderY) / 2,
    0, 0, Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();

  // Subtle shading pass using 'multiply'
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  // Under-chin shadow — wider and more opaque
  ctx.fillStyle = 'rgba(200,180,160,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headRadius + 2 * s, 10 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Under-nose shadow
  ctx.fillStyle = 'rgba(200,180,160,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, headCy + 6 * s, 4 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// --- Utility ---

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------

class OffscreenCharacterRenderer {
  /**
   * Generate walk animation textures for a character.
   * Creates 3 unique frames (neutral, left-step, right-step) and registers
   * a 4-frame walk animation (frame 2 reuses frame 0).
   */
  async generateCharacterTextures(
    scene: Phaser.Scene,
    character: 'her' | 'him',
    outfitIndex: number,
    textureKey: string,
  ): Promise<void> {
    const metrics = computeMetrics(character, 1.0);

    // Remove existing textures and animation
    for (let i = 0; i < 3; i++) {
      const key = `${textureKey}-frame-${i}`;
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
    }
    const animKey = `${textureKey}-walk`;
    if (scene.anims.exists(animKey)) {
      scene.anims.remove(animKey);
    }

    // Draw 3 unique frames
    const framePromises: Promise<void>[] = [];
    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      drawCharacter(ctx, character, outfitIndex, metrics, i, CANVAS_W, CANVAS_H);

      const frameKey = `${textureKey}-frame-${i}`;
      framePromises.push(this.canvasToTexture(scene, canvas, frameKey));
    }

    await Promise.all(framePromises);

    // Create walk animation: frame 0, 1, 0 (reuse), 2
    scene.anims.create({
      key: animKey,
      frames: [
        { key: `${textureKey}-frame-0` },
        { key: `${textureKey}-frame-1` },
        { key: `${textureKey}-frame-0` }, // frame 2 = frame 0
        { key: `${textureKey}-frame-2` },
      ],
      frameRate: 8,
      repeat: -1,
    });
  }

  /**
   * Generate a single preview texture at larger size (300px height)
   * for the dressing room screen.
   */
  async generatePreviewTexture(
    scene: Phaser.Scene,
    character: 'her' | 'him',
    outfitIndex: number,
    textureKey: string,
  ): Promise<void> {
    const previewScale = 300 / CANVAS_H; // ~1.5
    const previewW = Math.round(CANVAS_W * previewScale);
    const previewH = 300;

    const metrics = computeMetrics(character, previewScale);

    // Remove existing texture
    if (scene.textures.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = previewW;
    canvas.height = previewH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    // Draw neutral frame at preview scale
    drawCharacter(ctx, character, outfitIndex, metrics, 0, previewW, previewH);

    await this.canvasToTexture(scene, canvas, textureKey);
  }

  /**
   * Get body metrics for a character at a given scale.
   * Useful for OutfitRenderer to know where to draw clothing.
   */
  getBodyMetrics(character: 'her' | 'him', scale = 1.0): BodyMetrics {
    return computeMetrics(character, scale);
  }

  /**
   * Convert an offscreen canvas to a Phaser texture via toDataURL -> Image -> addImage.
   */
  private canvasToTexture(
    scene: Phaser.Scene,
    canvas: HTMLCanvasElement,
    key: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        try {
          scene.textures.addImage(key, img);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image for texture "${key}"`));
      img.src = dataUrl;
    });
  }
}

export default OffscreenCharacterRenderer;
