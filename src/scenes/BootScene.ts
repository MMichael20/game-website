import Phaser from 'phaser';
import { WorldRenderer } from '../rendering/WorldRenderer';
import { buildTileGrid, NPCS } from '../data/mapLayout';
import OffscreenCharacterRenderer from '../rendering/OffscreenCharacterRenderer';
import { generateParticleTextures } from '../rendering/ParticleConfigs';
import { OUTFITS } from '../rendering/OutfitRenderer';

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
    const outfitCount = OUTFITS.length;
    const totalSteps = 5 + outfitCount * 2 * 2; // world + ground + particles + photo + NPCs + outfits
    const updateBar = () => {
      progress++;
      bar.width = 316 * (progress / totalSteps);
    };

    // Generate world textures (synchronous canvas operations)
    WorldRenderer.generateAllTextures(this);
    updateBar();

    // Generate pre-rendered ground canvas
    WorldRenderer.generatePreRenderedGround(this, buildTileGrid());
    updateBar();

    // Generate particle textures
    generateParticleTextures(this);
    updateBar();

    // Generate NPC textures
    for (const npcDef of NPCS) {
      WorldRenderer.generateNPCTexture(this, npcDef.id, npcDef.palette);
    }
    updateBar();

    // Generate placeholder photo
    this.generatePlaceholderPhoto();
    updateBar();

    // Generate character textures in parallel
    const renderer = new OffscreenCharacterRenderer();
    const tasks: Promise<void>[] = [];
    for (const character of ['her', 'him'] as const) {
      for (let outfit = 0; outfit < outfitCount; outfit++) {
        tasks.push(
          renderer.generateCharacterTextures(this, character, outfit, `${character}-outfit-${outfit}`)
            .then(() => updateBar()),
        );
        tasks.push(
          renderer.generatePreviewTexture(this, character, outfit, `${character}-preview-${outfit}`)
            .then(() => updateBar()),
        );
      }
    }
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.error('Boot: some textures failed to generate:', err);
      // Register fallback textures for any missing keys
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 160;
      fallbackCanvas.height = 200;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      if (fallbackCtx) {
        fallbackCtx.fillStyle = import.meta.env.DEV ? '#ff00ff' : '#888888';
        fallbackCtx.fillRect(0, 0, 160, 200);
      }
      for (const character of ['her', 'him'] as const) {
        for (let outfit = 0; outfit < outfitCount; outfit++) {
          const textureKey = `${character}-outfit-${outfit}`;
          for (let frame = 0; frame < 3; frame++) {
            const frameKey = `${textureKey}-frame-${frame}`;
            if (!this.textures.exists(frameKey)) {
              this.textures.addCanvas(frameKey, fallbackCanvas);
            }
          }
          const previewKey = `${character}-preview-${outfit}`;
          if (!this.textures.exists(previewKey)) {
            this.textures.addCanvas(previewKey, fallbackCanvas);
          }
        }
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
