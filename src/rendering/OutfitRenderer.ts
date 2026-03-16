/**
 * OutfitRenderer.ts
 *
 * Draws clothing onto characters using the Canvas 2D API.
 * Each outfit's `draw` function paints on top of the character body layer.
 */

import type { BodyMetrics } from './OffscreenCharacterRenderer';

export interface OutfitDefinition {
  name: string;
  /** Draws parts behind the arms: torso, skirts, pants, sleeve caps. */
  drawUnder: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
  /** Optional: draws parts in front of arms (forearm sleeves, cuffs). Called after arms are drawn. */
  drawOver?: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for half-width at a given level. */
function hw(metrics: BodyMetrics, which: 'shoulder' | 'waist' | 'hip'): number {
  if (which === 'shoulder') return metrics.shoulderWidth / 2;
  if (which === 'waist') return metrics.waistWidth / 2;
  return metrics.hipWidth / 2;
}

/** Create a vertical linear gradient between two y-values. */
function vGrad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  c1: string,
  c2: string,
): CanvasGradient {
  const g = ctx.createLinearGradient(x, y1, x, y2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

/** Draw a simple trapezoid between two y-levels with different half-widths. */
function trapezoid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y1: number,
  hw1: number,
  y2: number,
  hw2: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx - hw1, y1);
  ctx.lineTo(cx + hw1, y1);
  ctx.lineTo(cx + hw2, y2);
  ctx.lineTo(cx - hw2, y2);
  ctx.closePath();
}

/** Draw a short sleeve on one side. */
function shortSleeve(
  ctx: CanvasRenderingContext2D,
  armX: number,
  topY: number,
  length: number,
  width: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(armX - width / 2, topY);
  ctx.lineTo(armX + width / 2, topY);
  ctx.lineTo(armX + width / 2, topY + length);
  ctx.lineTo(armX - width / 2, topY + length);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 0 — Casual
// ---------------------------------------------------------------------------

function drawCasual(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Sundress — A-line from shoulders to knee
    const grad = vGrad(ctx, m.centerX, m.shoulderY, m.kneeY, '#87CEEB', '#F08080');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.6, m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.6, m.shoulderY);
    // Bezier A-line flare
    ctx.bezierCurveTo(
      m.centerX + hw(m, 'shoulder') * 0.8, m.waistY,
      m.centerX + hw(m, 'hip') * 1.3, m.hipY,
      m.centerX + hw(m, 'hip') * 1.4, m.kneeY,
    );
    ctx.lineTo(m.centerX - hw(m, 'hip') * 1.4, m.kneeY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'hip') * 1.3, m.hipY,
      m.centerX - hw(m, 'shoulder') * 0.8, m.waistY,
      m.centerX - hw(m, 'shoulder') * 0.6, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Thin straps
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = Math.max(1, 2 * s);
    const strapOff = hw(m, 'shoulder') * 0.35;
    ctx.beginPath();
    ctx.moveTo(m.centerX - strapOff, m.shoulderY - 6 * s);
    ctx.lineTo(m.centerX - strapOff, m.shoulderY);
    ctx.moveTo(m.centerX + strapOff, m.shoulderY - 6 * s);
    ctx.lineTo(m.centerX + strapOff, m.shoulderY);
    ctx.stroke();

    // Subtle dot pattern
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const rows = 5;
    const cols = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const py = m.shoulderY + ((m.kneeY - m.shoulderY) / (rows + 1)) * (r + 1);
        const px = m.centerX + (c - 1) * hw(m, 'waist') * 0.6;
        ctx.beginPath();
        ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Him: T-shirt + jeans
    // T-shirt
    const shirtColor = '#4488CC';
    const shirtGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, shirtColor, '#336699');
    ctx.fillStyle = shirtGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder'), m.waistY + 4 * s, hw(m, 'waist'));
    ctx.fill();

    // Rounded neckline
    ctx.fillStyle = '#336699';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY,
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.35;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);

    // Jeans
    const jeansColor = '#1A3A5C';
    const jeansGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#2A4A6C', jeansColor);
    ctx.fillStyle = jeansGrad;
    // Left leg
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = jeansGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
  }
}

// ---------------------------------------------------------------------------
// 1 — Formal
// ---------------------------------------------------------------------------

function drawFormal(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Cocktail dress — fitted hourglass, dark red/burgundy
    const grad = vGrad(ctx, m.centerX, m.shoulderY, m.kneeY + 4 * s, '#8B0000', '#5C0020');
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Off-shoulder start — slightly wider than normal shoulders
    const offW = hw(m, 'shoulder') * 1.05;
    ctx.moveTo(m.centerX - offW, m.shoulderY + 3 * s);
    // Right side down
    ctx.bezierCurveTo(
      m.centerX + hw(m, 'shoulder'), m.shoulderY,
      m.centerX + hw(m, 'waist') * 0.85, m.waistY,
      m.centerX + hw(m, 'waist') * 0.85, m.waistY,
    );
    ctx.bezierCurveTo(
      m.centerX + hw(m, 'hip') * 1.0, m.hipY,
      m.centerX + hw(m, 'hip') * 0.9, m.kneeY,
      m.centerX + hw(m, 'hip') * 0.8, m.kneeY + 4 * s,
    );
    // Bottom
    ctx.lineTo(m.centerX - hw(m, 'hip') * 0.8, m.kneeY + 4 * s);
    // Left side up
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'hip') * 0.9, m.kneeY,
      m.centerX - hw(m, 'hip') * 1.0, m.hipY,
      m.centerX - hw(m, 'waist') * 0.85, m.waistY,
    );
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'waist') * 0.85, m.waistY,
      m.centerX - hw(m, 'shoulder'), m.shoulderY,
      m.centerX - offW, m.shoulderY + 3 * s,
    );
    ctx.closePath();
    ctx.fill();

    // Sheen highlight (linear gradient overlay)
    const sheen = ctx.createLinearGradient(
      m.centerX - hw(m, 'shoulder'), m.shoulderY,
      m.centerX + hw(m, 'shoulder'), m.kneeY,
    );
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    sheen.addColorStop(0.6, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = sheen;
    ctx.fill();

    // Off-shoulder line
    ctx.strokeStyle = '#6B0020';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - offW, m.shoulderY + 3 * s);
    ctx.bezierCurveTo(
      m.centerX - offW * 0.3, m.shoulderY + 5 * s,
      m.centerX + offW * 0.3, m.shoulderY + 5 * s,
      m.centerX + offW, m.shoulderY + 3 * s,
    );
    ctx.stroke();
  } else {
    // Him: Suit
    const jacketColor = '#1B2A4A';
    const jacketGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 4 * s, '#2B3A5A', jacketColor);

    // Suit pants
    const pantsGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#1B2A4A', '#0F1B30');
    ctx.fillStyle = pantsGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = pantsGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Jacket body
    ctx.fillStyle = jacketGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder'), m.hipY + 4 * s, hw(m, 'hip') * 0.95);
    ctx.fill();

    // White shirt collar
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY + 6 * s);
    ctx.lineTo(m.centerX, m.shoulderY + 8 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY + 6 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.closePath();
    ctx.fill();

    // Tie — burgundy rectangle
    ctx.fillStyle = '#800020';
    const tieW = 4 * s;
    const tieTop = m.shoulderY + 6 * s;
    const tieBot = m.waistY + 2 * s;
    ctx.fillRect(m.centerX - tieW / 2, tieTop, tieW, tieBot - tieTop);
    // Tie tip triangle
    ctx.beginPath();
    ctx.moveTo(m.centerX - tieW / 2, tieBot);
    ctx.lineTo(m.centerX, tieBot + 4 * s);
    ctx.lineTo(m.centerX + tieW / 2, tieBot);
    ctx.closePath();
    ctx.fill();

    // Lapel lines (V-shape)
    ctx.strokeStyle = '#0F1B30';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.55, m.shoulderY);
    ctx.lineTo(m.centerX - 3 * s, m.waistY - 2 * s);
    ctx.moveTo(m.centerX + hw(m, 'shoulder') * 0.55, m.shoulderY);
    ctx.lineTo(m.centerX + 3 * s, m.waistY - 2 * s);
    ctx.stroke();

    // Jacket sleeves moved to drawFormalOver (rendered after arms for correct Z-order)
  }
}

function drawFormalOver(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  if (character !== 'him') return; // Her has off-shoulder dress — no sleeves
  // Suit jacket sleeves (drawn over arms)
  const jacketColor = '#1B2A4A';
  const sleeveLen = (m.hipY - m.shoulderY) * 0.75;
  const sleeveW = hw(m, 'shoulder') * 0.55;
  shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
  shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
}

// ---------------------------------------------------------------------------
// 2 — Date Night
// ---------------------------------------------------------------------------

function drawDateNight(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Elegant top — burgundy with gold shimmer gradient
    const topGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 2 * s, '#800020', '#6B0020');
    ctx.fillStyle = topGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 0.85, m.waistY + 2 * s, hw(m, 'waist') * 0.9);
    ctx.fill();

    // Gold shimmer overlay
    const shimmer = ctx.createLinearGradient(
      m.centerX - hw(m, 'shoulder'), m.shoulderY,
      m.centerX + hw(m, 'shoulder'), m.waistY,
    );
    shimmer.addColorStop(0, 'rgba(218,165,32,0)');
    shimmer.addColorStop(0.35, 'rgba(218,165,32,0.12)');
    shimmer.addColorStop(0.65, 'rgba(218,165,32,0)');
    shimmer.addColorStop(1, 'rgba(218,165,32,0.08)');
    ctx.fillStyle = shimmer;
    ctx.fill();

    // Skirt — gold tones, flares at knee
    const skirtGrad = vGrad(ctx, m.centerX, m.waistY, m.kneeY + 4 * s, '#B8860B', '#8B6914');
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'waist') * 0.9, m.waistY);
    ctx.lineTo(m.centerX + hw(m, 'waist') * 0.9, m.waistY);
    ctx.bezierCurveTo(
      m.centerX + hw(m, 'hip') * 1.0, m.hipY,
      m.centerX + hw(m, 'hip') * 1.3, m.kneeY,
      m.centerX + hw(m, 'hip') * 1.35, m.kneeY + 4 * s,
    );
    ctx.lineTo(m.centerX - hw(m, 'hip') * 1.35, m.kneeY + 4 * s);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'hip') * 1.3, m.kneeY,
      m.centerX - hw(m, 'hip') * 1.0, m.hipY,
      m.centerX - hw(m, 'waist') * 0.9, m.waistY,
    );
    ctx.closePath();
    ctx.fill();

    // Sleeves (short, elegant)
    const sleeveLen = (m.waistY - m.shoulderY) * 0.3;
    const sleeveW = hw(m, 'shoulder') * 0.45;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, '#800020');
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, '#800020');
  } else {
    // Him: Fitted dark shirt + chinos with burgundy/gold accents
    const shirtColor = '#2C1A1A';
    const shirtGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, '#3C2A2A', shirtColor);
    ctx.fillStyle = shirtGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder'), m.waistY + 4 * s, hw(m, 'waist'));
    ctx.fill();

    // Burgundy accent — collar line
    ctx.strokeStyle = '#800020';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.lineTo(m.centerX, m.shoulderY + 4 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.stroke();

    // Gold button accents
    ctx.fillStyle = '#DAA520';
    for (let i = 0; i < 3; i++) {
      const by = m.shoulderY + 6 * s + i * (m.waistY - m.shoulderY) * 0.25;
      ctx.beginPath();
      ctx.arc(m.centerX, by, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.5;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);

    // Chinos — tan with gold accent
    const chinoColor = '#8B7D6B';
    const chinoGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#9B8D7B', chinoColor);
    ctx.fillStyle = chinoGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = chinoGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
  }
}

// ---------------------------------------------------------------------------
// 3 — Cozy
// ---------------------------------------------------------------------------

function drawCozy(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Oversized sweater — wider than normal
    const sweaterColor = '#D4A07A';
    const sweaterGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 6 * s, '#E4B08A', sweaterColor);
    ctx.fillStyle = sweaterGrad;
    const oversize = 1.3;
    trapezoid(
      ctx, m.centerX,
      m.shoulderY, hw(m, 'shoulder') * oversize,
      m.hipY + 6 * s, hw(m, 'hip') * oversize,
    );
    ctx.fill();

    // Ribbed bottom edge — horizontal lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = Math.max(1, 1 * s);
    const ribStart = m.hipY;
    const ribEnd = m.hipY + 6 * s;
    const ribCount = 4;
    for (let i = 0; i < ribCount; i++) {
      const ry = ribStart + ((ribEnd - ribStart) / ribCount) * i;
      ctx.beginPath();
      ctx.moveTo(m.centerX - hw(m, 'hip') * oversize, ry);
      ctx.lineTo(m.centerX + hw(m, 'hip') * oversize, ry);
      ctx.stroke();
    }

    // Long sleeves moved to drawCozyOver (rendered after arms for correct Z-order)

    // Leggings — dark fitted
    const legColor = '#2A2A2A';
    ctx.fillStyle = legColor;
    trapezoid(ctx, m.centerX, m.hipY + 4 * s, hw(m, 'hip') * 0.9, m.hipY + 6 * s, hw(m, 'hip') * 0.85);
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip') * 0.85, m.hipY + 6 * s, hw(m, 'hip') * 0.85 - legInset, m.ankleY - m.hipY - 6 * s);
    ctx.fillRect(m.centerX + legInset, m.hipY + 6 * s, hw(m, 'hip') * 0.85 - legInset, m.ankleY - m.hipY - 6 * s);
  } else {
    // Hoodie + joggers
    const hoodieColor = '#5A5A6A';
    const hoodieGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 4 * s, '#6A6A7A', hoodieColor);
    ctx.fillStyle = hoodieGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.1, m.hipY + 4 * s, hw(m, 'hip') * 1.05);
    ctx.fill();

    // Hood — semi-circle behind head
    ctx.fillStyle = '#5A5A6A';
    ctx.beginPath();
    ctx.arc(m.centerX, m.shoulderY - 2 * s, hw(m, 'shoulder') * 0.65, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4A4A5A';
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.stroke();

    // Front pocket rectangle
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = Math.max(1, 1 * s);
    const pockW = hw(m, 'waist') * 1.2;
    const pockH = (m.hipY - m.waistY) * 0.5;
    const pockY = m.waistY + (m.hipY - m.waistY) * 0.15;
    ctx.strokeRect(m.centerX - pockW / 2, pockY, pockW, pockH);

    // Drawstrings
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - 3 * s, m.shoulderY + 2 * s);
    ctx.lineTo(m.centerX - 3 * s, m.shoulderY + 10 * s);
    ctx.moveTo(m.centerX + 3 * s, m.shoulderY + 2 * s);
    ctx.lineTo(m.centerX + 3 * s, m.shoulderY + 10 * s);
    ctx.stroke();

    // Long sleeves moved to drawCozyOver (rendered after arms for correct Z-order)

    // Joggers — relaxed fit with cuffed ankle
    const joggerColor = '#4A4A4A';
    const joggerGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#5A5A5A', joggerColor);
    ctx.fillStyle = joggerGrad;
    trapezoid(ctx, m.centerX, m.hipY + 2 * s, hw(m, 'hip') * 1.05, m.hipY + 4 * s, hw(m, 'hip') * 1.0);
    ctx.fill();
    const legInset = 2 * s;
    const legW = hw(m, 'hip') * 1.0;
    ctx.fillStyle = joggerGrad;
    ctx.fillRect(m.centerX - legW, m.hipY + 4 * s, legW - legInset, m.ankleY - m.hipY - 4 * s);
    ctx.fillRect(m.centerX + legInset, m.hipY + 4 * s, legW - legInset, m.ankleY - m.hipY - 4 * s);

    // Cuffed ankles
    ctx.fillStyle = '#3A3A3A';
    const cuffH = 3 * s;
    ctx.fillRect(m.centerX - legW, m.ankleY - cuffH, legW - legInset, cuffH);
    ctx.fillRect(m.centerX + legInset, m.ankleY - cuffH, legW - legInset, cuffH);
  }
}

function drawCozyOver(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  if (character === 'her') {
    // Long sweater sleeves (drawn over arms)
    const sweaterColor = '#D4A07A';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
  } else {
    // Long hoodie sleeves (drawn over arms)
    const hoodieColor = '#5A5A6A';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
  }
}

// ---------------------------------------------------------------------------
// 4 — Sporty
// ---------------------------------------------------------------------------

function drawSporty(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Crop top — teal, ends at waist
    const topColor = '#008B8B';
    const topGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY, '#00AAAA', topColor);
    ctx.fillStyle = topGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 0.9, m.waistY, hw(m, 'waist') * 0.85);
    ctx.fill();

    // Orange stripe across chest
    ctx.fillStyle = '#FF6B35';
    const stripeY = m.shoulderY + (m.waistY - m.shoulderY) * 0.4;
    const stripeH = 3 * s;
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.85, stripeY, hw(m, 'shoulder') * 1.7, stripeH);

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.25;
    const sleeveW = hw(m, 'shoulder') * 0.45;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, topColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, topColor);

    // Joggers — bright
    const joggerColor = '#2A2A2A';
    ctx.fillStyle = joggerColor;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Side stripes on joggers (teal)
    ctx.fillStyle = '#008B8B';
    const strW = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, strW, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + hw(m, 'hip') - strW - legInset, m.hipY, strW, m.ankleY - m.hipY);
  } else {
    // Athletic tee — loose, teal/orange
    const teeColor = '#008B8B';
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 6 * s, '#00AAAA', teeColor);
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 6 * s, hw(m, 'waist') * 1.05);
    ctx.fill();

    // Orange stripe
    ctx.fillStyle = '#FF6B35';
    const stripeY = m.shoulderY + (m.waistY - m.shoulderY) * 0.5;
    ctx.fillRect(m.centerX - hw(m, 'shoulder'), stripeY, hw(m, 'shoulder') * 2, 3 * s);

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.35;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, teeColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, teeColor);

    // Shorts — above knee
    const shortsColor = '#2A2A2A';
    const midThigh = m.hipY + (m.kneeY - m.hipY) * 0.55;
    ctx.fillStyle = shortsColor;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, midThigh - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, midThigh - m.hipY);

    // Side stripes on shorts (orange)
    ctx.fillStyle = '#FF6B35';
    const strW = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, strW, midThigh - m.hipY);
    ctx.fillRect(m.centerX + hw(m, 'hip') - strW - legInset, m.hipY, strW, midThigh - m.hipY);
  }
}

// ---------------------------------------------------------------------------
// 5 — Restaurant
// ---------------------------------------------------------------------------

function drawRestaurant(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Elegant blouse — cream/champagne with ruffle collar
    const blouseColor = '#F5E6C8';
    const blouseGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 2 * s, '#FFF0D6', blouseColor);
    ctx.fillStyle = blouseGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 0.9, m.waistY + 2 * s, hw(m, 'waist') * 0.9);
    ctx.fill();

    // Subtle ruffle at collar — small scalloped line
    ctx.strokeStyle = '#E0D0B0';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    const ruffleW = hw(m, 'shoulder') * 0.55;
    const segments = 5;
    ctx.beginPath();
    for (let i = 0; i < segments; i++) {
      const x1 = m.centerX - ruffleW + (ruffleW * 2 / segments) * i;
      const x2 = m.centerX - ruffleW + (ruffleW * 2 / segments) * (i + 1);
      const cpY = m.shoulderY + (i % 2 === 0 ? 3 : -1) * s;
      if (i === 0) ctx.moveTo(x1, m.shoulderY);
      ctx.quadraticCurveTo((x1 + x2) / 2, cpY, x2, m.shoulderY);
    }
    ctx.stroke();

    // Sleeves (3/4 length)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.6;
    const sleeveW = hw(m, 'shoulder') * 0.45;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);

    // Pencil skirt — fitted, knee-length, champagne
    const skirtColor = '#C4A882';
    const skirtGrad = vGrad(ctx, m.centerX, m.waistY, m.kneeY + 2 * s, '#D4B892', skirtColor);
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'waist') * 0.9, m.waistY);
    ctx.lineTo(m.centerX + hw(m, 'waist') * 0.9, m.waistY);
    ctx.bezierCurveTo(
      m.centerX + hw(m, 'hip') * 1.0, m.hipY,
      m.centerX + hw(m, 'hip') * 0.85, m.kneeY,
      m.centerX + hw(m, 'hip') * 0.75, m.kneeY + 2 * s,
    );
    ctx.lineTo(m.centerX - hw(m, 'hip') * 0.75, m.kneeY + 2 * s);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'hip') * 0.85, m.kneeY,
      m.centerX - hw(m, 'hip') * 1.0, m.hipY,
      m.centerX - hw(m, 'waist') * 0.9, m.waistY,
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // Button-up shirt + chinos
    const shirtColor = '#F0EBE0';
    const shirtGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 6 * s, '#FFF5EA', shirtColor);
    ctx.fillStyle = shirtGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder'), m.waistY + 6 * s, hw(m, 'waist'));
    ctx.fill();

    // Collar
    ctx.fillStyle = '#E8E0D0';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.35, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.2, m.shoulderY - 3 * s);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s);
    ctx.lineTo(m.centerX, m.shoulderY + 3 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.2, m.shoulderY - 3 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.35, m.shoulderY);
    ctx.closePath();
    ctx.fill();

    // Visible buttons
    ctx.fillStyle = '#C0B8A0';
    for (let i = 0; i < 5; i++) {
      const by = m.shoulderY + 5 * s + i * (m.waistY - m.shoulderY) * 0.2;
      ctx.beginPath();
      ctx.arc(m.centerX, by, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rolled sleeves (3/4)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.55;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    // Rolled cuff line
    ctx.strokeStyle = '#D0C8B8';
    ctx.lineWidth = Math.max(1, 1 * s);
    const cuffY = m.armTopY + sleeveLen - 3 * s;
    ctx.beginPath();
    ctx.moveTo(m.leftArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.leftArmX + sleeveW / 2, cuffY);
    ctx.moveTo(m.rightArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.rightArmX + sleeveW / 2, cuffY);
    ctx.stroke();

    // Chinos — tan
    const chinoColor = '#C4A46A';
    const chinoGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#D4B47A', chinoColor);
    ctx.fillStyle = chinoGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = chinoGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
  }
}

// ---------------------------------------------------------------------------
// 6 — Pizza (casual base + apron overlay)
// ---------------------------------------------------------------------------

function drawPizza(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;

  // Draw casual outfit as base
  drawCasual(ctx, character, frame, m);

  // White apron overlay
  const apronTop = m.shoulderY + (m.waistY - m.shoulderY) * 0.3;
  const apronBot = m.kneeY;
  const apronW = hw(m, 'waist') * 1.4;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(m.centerX - apronW * 0.8, apronTop);
  ctx.lineTo(m.centerX + apronW * 0.8, apronTop);
  ctx.lineTo(m.centerX + apronW, apronBot);
  ctx.lineTo(m.centerX - apronW, apronBot);
  ctx.closePath();
  ctx.fill();

  // Apron border
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = Math.max(1, 1 * s);
  ctx.stroke();

  // Tie strings going behind body (drawn as lines from top corners going outward)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  // Left tie
  ctx.moveTo(m.centerX - apronW * 0.8, apronTop);
  ctx.lineTo(m.centerX - hw(m, 'shoulder') * 1.2, apronTop - 4 * s);
  // Neck strap left
  ctx.moveTo(m.centerX - apronW * 0.4, apronTop);
  ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY - 2 * s);
  // Neck strap right
  ctx.moveTo(m.centerX + apronW * 0.4, apronTop);
  ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY - 2 * s);
  // Right tie
  ctx.moveTo(m.centerX + apronW * 0.8, apronTop);
  ctx.lineTo(m.centerX + hw(m, 'shoulder') * 1.2, apronTop - 4 * s);
  ctx.stroke();

  // Waist tie strings
  const waistTieY = m.waistY + 2 * s;
  ctx.beginPath();
  ctx.moveTo(m.centerX - apronW * 0.9, waistTieY);
  ctx.lineTo(m.centerX - hw(m, 'shoulder') * 1.3, waistTieY + 2 * s);
  ctx.moveTo(m.centerX + apronW * 0.9, waistTieY);
  ctx.lineTo(m.centerX + hw(m, 'shoulder') * 1.3, waistTieY + 2 * s);
  ctx.stroke();

  // Red "Luigi's" text
  ctx.fillStyle = '#CC0000';
  ctx.font = `${Math.max(6, Math.round(8 * s))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textY = apronTop + (m.waistY - apronTop) * 0.5;
  ctx.fillText("Luigi's", m.centerX, textY);
  // Reset text alignment
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

// ---------------------------------------------------------------------------
// 7 — Pajamas
// ---------------------------------------------------------------------------

function drawPajamas(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Matching PJ set — soft pink/lavender, loose top with buttons + pants
    const topColor = '#E8B4C8';
    const topGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, '#F0C4D8', topColor);
    ctx.fillStyle = topGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 4 * s, hw(m, 'waist') * 1.05);
    ctx.fill();

    // Buttons down front
    ctx.fillStyle = '#D0A0B4';
    for (let i = 0; i < 4; i++) {
      const by = m.shoulderY + 5 * s + i * (m.waistY - m.shoulderY) * 0.22;
      ctx.beginPath();
      ctx.arc(m.centerX, by, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Collar notch
    ctx.strokeStyle = '#D0A0B4';
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.lineTo(m.centerX, m.shoulderY + 5 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.stroke();

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.4;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, topColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, topColor);

    // Pants — lavender
    const pantsColor = '#C8A0D8';
    const pantsGrad = vGrad(ctx, m.centerX, m.waistY + 2 * s, m.ankleY, '#D8B0E8', pantsColor);
    ctx.fillStyle = pantsGrad;
    trapezoid(ctx, m.centerX, m.waistY + 2 * s, hw(m, 'waist') * 1.0, m.hipY, hw(m, 'hip') * 1.0);
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = pantsGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Small dot pattern on top
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const py = m.shoulderY + ((m.waistY - m.shoulderY) / 4) * (r + 1);
        const px = m.centerX + (c - 1) * hw(m, 'waist') * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 1 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Small star/dot pattern on pants
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const py = m.hipY + ((m.ankleY - m.hipY) / 5) * (r + 1);
        const px = m.centerX + (c === 0 ? -1 : 1) * hw(m, 'hip') * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, 1 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Matching PJ set — blue/navy, t-shirt top, plaid pants
    const topColor = '#4A6A8A';
    const topGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, '#5A7A9A', topColor);
    ctx.fillStyle = topGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.0, m.waistY + 4 * s, hw(m, 'waist') * 1.0);
    ctx.fill();

    // Rounded neckline
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.35;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, topColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, topColor);

    // Plaid pants — navy base
    const pantsColor = '#1A2A4A';
    const pantsGrad = vGrad(ctx, m.centerX, m.waistY + 2 * s, m.ankleY, '#2A3A5A', pantsColor);
    ctx.fillStyle = pantsGrad;
    trapezoid(ctx, m.centerX, m.waistY + 2 * s, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = pantsGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Plaid pattern — crisscross lines
    ctx.strokeStyle = 'rgba(100,140,180,0.3)';
    ctx.lineWidth = Math.max(1, 1 * s);
    const plaidSpacing = 6 * s;
    const pantsTop = m.waistY + 2 * s;
    // Horizontal lines
    for (let y = pantsTop; y < m.ankleY; y += plaidSpacing) {
      ctx.beginPath();
      ctx.moveTo(m.centerX - hw(m, 'hip'), y);
      ctx.lineTo(m.centerX + hw(m, 'hip'), y);
      ctx.stroke();
    }
    // Vertical lines
    for (let x = m.centerX - hw(m, 'hip'); x <= m.centerX + hw(m, 'hip'); x += plaidSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, pantsTop);
      ctx.lineTo(x, m.ankleY);
      ctx.stroke();
    }

    // Secondary plaid (thinner, lighter)
    ctx.strokeStyle = 'rgba(150,180,210,0.15)';
    ctx.lineWidth = Math.max(1, 0.5 * s);
    for (let y = pantsTop + plaidSpacing / 2; y < m.ankleY; y += plaidSpacing) {
      ctx.beginPath();
      ctx.moveTo(m.centerX - hw(m, 'hip'), y);
      ctx.lineTo(m.centerX + hw(m, 'hip'), y);
      ctx.stroke();
    }
    for (let x = m.centerX - hw(m, 'hip') + plaidSpacing / 2; x <= m.centerX + hw(m, 'hip'); x += plaidSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, pantsTop);
      ctx.lineTo(x, m.ankleY);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// 8 — Graphic Tee
// ---------------------------------------------------------------------------

function drawGraphicTee(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Oversized graphic tee — mid-thigh length, white
    const teeColor = '#F5F0E8';
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.kneeY - 6 * s, '#FFFFFF', teeColor);
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.15, m.kneeY - 6 * s, hw(m, 'hip') * 1.2);
    ctx.fill();

    // Crew neckline
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Graphic — colorful geometric band across chest
    const graphicY = m.shoulderY + (m.waistY - m.shoulderY) * 0.35;
    const graphicH = 10 * s;
    ctx.fillStyle = '#2DD4BF';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY, hw(m, 'shoulder') * 1.8, graphicH * 0.4);
    ctx.fillStyle = '#FB7185';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY + graphicH * 0.4, hw(m, 'shoulder') * 1.8, graphicH * 0.3);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY + graphicH * 0.7, hw(m, 'shoulder') * 1.8, graphicH * 0.3);

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.3;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, teeColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, teeColor);

    // Bike shorts underneath
    ctx.fillStyle = '#1a1a1a';
    const shortsTop = m.hipY;
    const shortsBot = m.kneeY - 8 * s;
    trapezoid(ctx, m.centerX, shortsTop, hw(m, 'hip') * 0.85, shortsBot, hw(m, 'hip') * 0.75);
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip') * 0.75, shortsBot, hw(m, 'hip') * 0.75 - legInset, 4 * s);
    ctx.fillRect(m.centerX + legInset, shortsBot, hw(m, 'hip') * 0.75 - legInset, 4 * s);
  } else {
    // Him: Graphic tee + joggers
    const teeColor = '#E8E4E0';
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 6 * s, '#F5F0EA', teeColor);
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 6 * s, hw(m, 'waist') * 1.05);
    ctx.fill();

    // Rounded neckline
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Diagonal stripe graphic
    const gY = m.shoulderY + (m.waistY - m.shoulderY) * 0.3;
    ctx.save();
    ctx.beginPath();
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 6 * s, hw(m, 'waist') * 1.05);
    ctx.clip();
    ctx.fillStyle = '#2DD4BF';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder'), gY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, gY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder'), gY + 8 * s);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.3, gY + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.6, gY + 8 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.6, gY + 8 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder'), gY + 14 * s);
    ctx.lineTo(m.centerX, gY + 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.35;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, teeColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, teeColor);

    // Joggers
    const joggerColor = '#3A3A3A';
    const joggerGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#4A4A4A', joggerColor);
    ctx.fillStyle = joggerGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = joggerGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Cuffed ankles
    ctx.fillStyle = '#2A2A2A';
    const cuffH = 3 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.ankleY - cuffH, hw(m, 'hip') - legInset, cuffH);
    ctx.fillRect(m.centerX + legInset, m.ankleY - cuffH, hw(m, 'hip') - legInset, cuffH);
  }
}

// ---------------------------------------------------------------------------
// 9 — Smart Casual / Blazer
// ---------------------------------------------------------------------------

function drawSmartCasual(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Fitted blazer + straight-leg trousers
    const blazerColor = '#6B7C93';
    const blazerGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 2 * s, '#7B8CA3', blazerColor);

    // Trousers first (underneath blazer)
    const trouserColor = '#3A3A3A';
    const trouserGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#4A4A4A', trouserColor);
    ctx.fillStyle = trouserGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = trouserGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Blazer body
    ctx.fillStyle = blazerGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.02, m.hipY + 2 * s, hw(m, 'hip') * 0.95);
    ctx.fill();

    // Lapels — V-opening showing blouse
    ctx.fillStyle = '#F5F0E8';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.closePath();
    ctx.fill();

    // Lapel lines
    ctx.strokeStyle = '#5A6B80';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.5, m.shoulderY + 3 * s);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.moveTo(m.centerX + hw(m, 'shoulder') * 0.5, m.shoulderY + 3 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.stroke();

    // Blazer sleeves (3/4 length)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.65;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
  } else {
    // Open blazer over white tee + dark chinos
    const blazerColor = '#5A6B80';

    // White tee underneath
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, '#FFFFFF', '#F0EBE5');
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 0.9, m.waistY + 4 * s, hw(m, 'waist') * 0.9);
    ctx.fill();

    // Neckline
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Chinos
    const chinoColor = '#4A4A4A';
    const chinoGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#5A5A5A', chinoColor);
    ctx.fillStyle = chinoGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = chinoGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Blazer — open, two panels with gap showing tee
    const blazerGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 4 * s, '#6A7B90', blazerColor);
    // Left panel
    ctx.fillStyle = blazerGrad;
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder'), m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.lineTo(m.centerX - hw(m, 'hip') * 0.95, m.hipY + 4 * s);
    ctx.closePath();
    ctx.fill();
    // Right panel
    ctx.beginPath();
    ctx.moveTo(m.centerX + hw(m, 'shoulder'), m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.lineTo(m.centerX + hw(m, 'hip') * 0.95, m.hipY + 4 * s);
    ctx.closePath();
    ctx.fill();

    // Lapel edges
    ctx.strokeStyle = '#4A5B70';
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.moveTo(m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.stroke();

    // Blazer sleeves
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.7;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
  }
}

// ---------------------------------------------------------------------------
// OUTFITS array & OUTFIT_NAMES export
// ---------------------------------------------------------------------------

export const OUTFITS: OutfitDefinition[] = [
  { name: 'Casual', drawUnder: drawCasual },
  { name: 'Formal', drawUnder: drawFormal, drawOver: drawFormalOver },
  { name: 'Date Night', drawUnder: drawDateNight },
  { name: 'Cozy', drawUnder: drawCozy, drawOver: drawCozyOver },
  { name: 'Sporty', drawUnder: drawSporty },
  { name: 'Restaurant', drawUnder: drawRestaurant },
  { name: 'Pizza', drawUnder: drawPizza },
  { name: 'Pajamas', drawUnder: drawPajamas },
  { name: 'Graphic Tee', drawUnder: drawGraphicTee },
  { name: 'Smart Casual', drawUnder: drawSmartCasual },
];

export const OUTFIT_NAMES: string[] = OUTFITS.map((o) => o.name);
