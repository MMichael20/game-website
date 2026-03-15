import Phaser from 'phaser';
import { hasSavedGame } from '../utils/storage';
import { createStyledButton, createStyledText, addFadeTransition, UI_COLORS } from '../rendering/UIRenderer';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d1b4e, 0x1a1a3e);
    bg.fillRect(0, 0, width, height);

    // Floating particles in background
    if (this.textures.exists('particle-sparkle')) {
      this.add.particles(width / 2, height / 2, 'particle-sparkle', {
        speed: { min: 5, max: 20 },
        angle: { min: 0, max: 360 },
        lifespan: 3000,
        frequency: 500,
        alpha: { start: 0.4, end: 0 },
        scale: { start: 0.3, end: 0.6 },
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      });
    }

    // Styled title
    const title = this.add.text(width / 2, height / 3, 'Our Places', {
      fontSize: '56px',
      color: UI_COLORS.goldHex,
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    title.setShadow(2, 2, '#000000', 4);

    // Decorative heart
    const heart = this.add.graphics();
    heart.fillStyle(0xff6b8a, 0.3);
    const hx = width / 2, hy = height / 3 + 70;
    heart.fillCircle(hx - 12, hy, 12);
    heart.fillCircle(hx + 12, hy, 12);
    heart.fillTriangle(hx - 24, hy + 4, hx + 24, hy + 4, hx, hy + 28);

    // Styled subtitle
    createStyledText(this, width / 2, height / 3 + 50, 'A little world of us', {
      fontSize: '18px',
      color: UI_COLORS.mutedHex,
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // New Game button
    const { container: newGameBtn } = createStyledButton(this, width / 2, height / 2 + 50, 'New Game', {
      color: UI_COLORS.purple,
      fontSize: '22px',
      paddingX: 30,
      paddingY: 14,
    });
    newGameBtn.on('pointerdown', () => this.scene.start('DressingRoomScene'));

    // Continue button (only if saved game exists)
    if (hasSavedGame()) {
      const { container: continueBtn } = createStyledButton(this, width / 2, height / 2 + 110, 'Continue', {
        color: UI_COLORS.success,
        fontSize: '22px',
        paddingX: 30,
        paddingY: 14,
      });
      continueBtn.on('pointerdown', () => this.scene.start('WorldScene'));
    }

    // Scene fade-in
    addFadeTransition(this);
  }
}
