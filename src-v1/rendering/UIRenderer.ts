import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Color constants – shared palette for the entire UI
// ---------------------------------------------------------------------------

export const UI_COLORS = {
  gold: 0xffd700,
  goldHex: '#ffd700',
  purple: 0x7c3aed,
  purpleHex: '#7c3aed',
  purpleLight: 0xa78bfa,
  cream: 0xfff8f0,
  creamHex: '#fff8f0',
  dark: 0x1a1a2e,
  darkHex: '#1a1a2e',
  darkPanel: 0x1e1b2e,
  text: 0xffffff,
  textHex: '#ffffff',
  muted: 0x94a3b8,
  mutedHex: '#94a3b8',
  success: 0x22c55e,
  successHex: '#22c55e',
  danger: 0xef4444,
  dangerHex: '#ef4444',
} as const;

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------

export interface PanelOptions {
  color?: number;
  alpha?: number;
  radius?: number;
  shadow?: boolean;
  strokeColor?: number;
  strokeWidth?: number;
}

export interface ButtonOptions {
  color?: number;
  textColor?: string;
  fontSize?: string;
  paddingX?: number;
  paddingY?: number;
  width?: number;
  height?: number;
}

export interface PillOptions {
  color?: number;
  textColor?: string;
  fontSize?: string;
  paddingX?: number;
  paddingY?: number;
}

// ---------------------------------------------------------------------------
// Default font family used across all styled text
// ---------------------------------------------------------------------------

const DEFAULT_FONT_FAMILY = 'Georgia, serif';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Draw a rounded rectangle onto a Graphics object. */
function drawRoundedRect(
  gfx: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor: number,
  fillAlpha: number,
  strokeColor?: number,
  strokeWidth?: number,
): void {
  gfx.fillStyle(fillColor, fillAlpha);
  gfx.fillRoundedRect(x, y, w, h, radius);

  if (strokeColor !== undefined && strokeWidth !== undefined && strokeWidth > 0) {
    gfx.lineStyle(strokeWidth, strokeColor, 1);
    gfx.strokeRoundedRect(x, y, w, h, radius);
  }
}

// ---------------------------------------------------------------------------
// createPanel
// ---------------------------------------------------------------------------

/**
 * Draw a rounded-rectangle panel with an optional soft drop shadow.
 * The Graphics object is positioned so that (x, y) is the top-left corner of
 * the visible panel (shadow may extend slightly beyond).
 */
export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: PanelOptions,
): Phaser.GameObjects.Graphics {
  const color = options?.color ?? UI_COLORS.darkPanel;
  const alpha = options?.alpha ?? 0.95;
  const radius = options?.radius ?? 12;
  const shadow = options?.shadow ?? true;
  const strokeColor = options?.strokeColor;
  const strokeWidth = options?.strokeWidth;

  const gfx = scene.add.graphics();

  // Shadow – slightly offset, darker, slightly larger
  if (shadow) {
    const shadowOffset = 4;
    const shadowExpand = 2;
    drawRoundedRect(
      gfx,
      x - shadowExpand + shadowOffset,
      y - shadowExpand + shadowOffset,
      w + shadowExpand * 2,
      h + shadowExpand * 2,
      radius,
      0x000000,
      0.3,
    );
  }

  // Main panel
  drawRoundedRect(gfx, x, y, w, h, radius, color, alpha, strokeColor, strokeWidth);

  return gfx;
}

// ---------------------------------------------------------------------------
// createStyledButton
// ---------------------------------------------------------------------------

/**
 * Create an interactive button consisting of a rounded-rect background and a
 * centred text label, wrapped in a Container. Includes hover and press effects.
 */
export function createStyledButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options?: ButtonOptions,
): {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
} {
  const color = options?.color ?? UI_COLORS.purple;
  const textColor = options?.textColor ?? UI_COLORS.textHex;
  const fontSize = options?.fontSize ?? '16px';
  const paddingX = options?.paddingX ?? 24;
  const paddingY = options?.paddingY ?? 12;

  // Create the label first so we can measure it for auto-sizing
  const label = scene.add.text(0, 0, text, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize,
    color: textColor,
  }).setOrigin(0.5);

  const btnWidth = options?.width ?? label.width + paddingX * 2;
  const btnHeight = options?.height ?? label.height + paddingY * 2;
  const radius = Math.min(12, btnHeight / 2);

  const bg = scene.add.graphics();
  drawRoundedRect(bg, -btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius, color, 1);

  const container = scene.add.container(x, y, [bg, label]);
  container.setSize(btnWidth, btnHeight);
  container.setInteractive({ useHandCursor: true });

  // Hover effect
  container.on('pointerover', () => {
    container.setScale(1.05);
    label.setAlpha(1);
  });

  container.on('pointerout', () => {
    container.setScale(1.0);
    label.setAlpha(1);
  });

  // Press / release effects
  container.on('pointerdown', () => {
    container.setScale(0.95);
  });

  container.on('pointerup', () => {
    container.setScale(1.0);
  });

  return { container, bg, label };
}

// ---------------------------------------------------------------------------
// createStyledText
// ---------------------------------------------------------------------------

/**
 * Create a Text object with consistent default styling (white, 16px, Georgia).
 */
export function createStyledText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style?: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
): Phaser.GameObjects.Text {
  const merged: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: '16px',
    color: UI_COLORS.textHex,
    ...style,
  };

  return scene.add.text(x, y, text, merged);
}

// ---------------------------------------------------------------------------
// addFadeTransition
// ---------------------------------------------------------------------------

/**
 * Fade the camera in from black when the scene starts.
 */
export function addFadeTransition(scene: Phaser.Scene, duration: number = 500): void {
  scene.cameras.main.fadeIn(duration);
}

// ---------------------------------------------------------------------------
// createPillContainer
// ---------------------------------------------------------------------------

/**
 * Small pill-shaped (very rounded rectangle) badge with text – useful for
 * score displays, counters, and progress indicators.
 */
export function createPillContainer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options?: PillOptions,
): { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text } {
  const color = options?.color ?? UI_COLORS.purple;
  const textColor = options?.textColor ?? UI_COLORS.textHex;
  const fontSize = options?.fontSize ?? '14px';
  const paddingX = options?.paddingX ?? 16;
  const paddingY = options?.paddingY ?? 6;

  const label = scene.add.text(x, y, text, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize,
    color: textColor,
  }).setOrigin(0.5);

  const pillW = label.width + paddingX * 2;
  const pillH = label.height + paddingY * 2;
  const radius = pillH / 2; // fully rounded ends

  const bg = scene.add.graphics();
  drawRoundedRect(bg, x - pillW / 2, y - pillH / 2, pillW, pillH, radius, color, 1);

  // Ensure text renders on top of the background
  scene.children.bringToTop(label);

  return { bg, label };
}

// ---------------------------------------------------------------------------
// createCloseButton
// ---------------------------------------------------------------------------

/**
 * Circular close button (red circle + white "X"). Calls `callback` on press.
 */
export function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  callback: () => void,
): Phaser.GameObjects.Container {
  const radius = 16;

  const bg = scene.add.graphics();
  bg.fillStyle(UI_COLORS.danger, 1);
  bg.fillCircle(0, 0, radius);

  const xLabel = scene.add.text(0, 0, '\u00d7', {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: '22px',
    color: UI_COLORS.textHex,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, xLabel]);
  container.setSize(radius * 2, radius * 2);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    container.setScale(1.1);
  });

  container.on('pointerout', () => {
    container.setScale(1.0);
  });

  container.on('pointerdown', () => {
    container.setScale(0.9);
    callback();
  });

  container.on('pointerup', () => {
    container.setScale(1.0);
  });

  return container;
}
