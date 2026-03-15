import Phaser from 'phaser';
import { WorldRenderer } from '../rendering/WorldRenderer';
import OffscreenCharacterRenderer from '../rendering/OffscreenCharacterRenderer';
import { generateParticleTextures } from '../rendering/ParticleConfigs';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;

    // Show loading bar
    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 0, 16, 0x7c3aed).setOrigin(0, 0.5);
    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    let progress = 0;
    const totalSteps = 35; // 1 world + 1 particles + 1 photo + 32 character (16 texture + 16 preview)
    const updateBar = () => {
      progress++;
      bar.width = 316 * (progress / totalSteps);
    };

    // Generate world textures (synchronous canvas operations)
    WorldRenderer.generateAllTextures(this);
    updateBar();

    // Generate particle textures
    generateParticleTextures(this);
    updateBar();

    // Generate placeholder photo
    this.generatePlaceholderPhoto();
    updateBar();

    // Generate character textures (async due to image loading)
    const renderer = new OffscreenCharacterRenderer();
    for (const character of ['her', 'him'] as const) {
      for (let outfit = 0; outfit < 8; outfit++) {
        await renderer.generateCharacterTextures(this, character, outfit, `${character}-outfit-${outfit}`);
        updateBar();
        await renderer.generatePreviewTexture(this, character, outfit, `${character}-preview-${outfit}`);
        updateBar();
      }
    }

    // Clean up loading UI
    barBg.destroy();
    bar.destroy();
    loadingText.destroy();

    // Go to menu
    this.scene.start('MenuScene');
  }

  private generatePlaceholderPhoto(): void {
    const photo = this.make.graphics({}, false);
    const gradient = photo;
    gradient.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2);
    gradient.fillRect(0, 0, 600, 400);
    gradient.fillStyle(0xffffff, 0.3);
    gradient.fillCircle(300, 200, 60);
    photo.generateTexture('placeholder-photo', 600, 400);
    photo.destroy();
  }
}
