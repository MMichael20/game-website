import Phaser from 'phaser';
import { AvatarConfig, saveAvatars, loadGameState } from '../utils/storage';
import { drawCharacterPreview } from '../rendering/CharacterRenderer';

const HAIR_STYLES = ['Short', 'Long', 'Curly', 'Ponytail', 'Buzz'];
const HAIR_COLORS = ['#2c1810', '#8B4513', '#DAA520', '#FFD700', '#C41E3A', '#1a1a2e', '#ff69b4', '#ffffff'];
const SKIN_TONES = ['#FFDBB4', '#E8B88A', '#C68642', '#8D5524', '#6B3E26', '#3B2219'];
const OUTFIT_COLORS = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
const ACCESSORIES = [null, 'hat', 'glasses'];

export class AvatarScene extends Phaser.Scene {
  private currentAvatar: 1 | 2 = 1;
  private avatars: [AvatarConfig, AvatarConfig] = [
    { hair: 0, hairColor: '#2c1810', skin: 0, outfit: 0, accessory: null },
    { hair: 0, hairColor: '#C41E3A', skin: 0, outfit: 1, accessory: null },
  ];
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private fromWorld = false;

  constructor() {
    super({ key: 'AvatarScene' });
  }

  init(data?: { fromWorld?: boolean }): void {
    this.fromWorld = data?.fromWorld ?? false;
    // Load existing avatars if re-accessing from world
    if (this.fromWorld) {
      const state = loadGameState();
      if (state.avatar1) this.avatars[0] = { ...state.avatar1 };
      if (state.avatar2) this.avatars[1] = { ...state.avatar2 };
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 30, 'Create Your Characters', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Avatar tab buttons
    const tab1 = this.add.text(width / 2 - 80, 70, '[ Player 1 ]', {
      fontSize: '16px',
      color: '#7c3aed',
      padding: { x: 10, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const tab2 = this.add.text(width / 2 + 80, 70, '[ Player 2 ]', {
      fontSize: '16px',
      color: '#666666',
      padding: { x: 10, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tab1.on('pointerdown', () => {
      this.currentAvatar = 1;
      tab1.setColor('#7c3aed');
      tab2.setColor('#666666');
      this.refreshOptions();
    });

    tab2.on('pointerdown', () => {
      this.currentAvatar = 2;
      tab2.setColor('#7c3aed');
      tab1.setColor('#666666');
      this.refreshOptions();
    });

    // Preview area
    this.previewGraphics = this.add.graphics();
    this.drawPreview();

    // Options
    this.refreshOptions();

    // Confirm button
    const confirmBtn = this.add.text(width / 2, height - 40, '[ Start Adventure! ]', {
      fontSize: '24px',
      color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setColor('#4ade80'));
    confirmBtn.on('pointerout', () => confirmBtn.setColor('#22c55e'));
    confirmBtn.on('pointerdown', () => {
      saveAvatars(this.avatars[0], this.avatars[1]);
      if (this.fromWorld) {
        // Return to existing WorldScene without destroying it
        this.scene.stop();
        this.scene.resume('WorldScene');
        // WorldScene will re-apply avatar tints on resume
        const worldScene = this.scene.get('WorldScene') as any;
        if (worldScene?.applyAvatarTints) worldScene.applyAvatarTints();
      } else {
        this.scene.start('WorldScene');
      }
    });
  }

  private get currentConfig(): AvatarConfig {
    return this.avatars[this.currentAvatar - 1];
  }

  private optionElements: Phaser.GameObjects.GameObject[] = [];

  private refreshOptions(): void {
    // Clear previous option elements
    this.optionElements.forEach((el) => el.destroy());
    this.optionElements = [];

    const startY = 120;
    const { width } = this.cameras.main;

    const addOption = <T extends Phaser.GameObjects.GameObject>(el: T): T => {
      this.optionElements.push(el);
      return el;
    };

    // Hair style
    addOption(this.add.text(60, startY, 'Hair Style:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    HAIR_STYLES.forEach((style, i) => {
      const btn = addOption(this.add.text(60 + i * 80, startY + 25, style, {
        fontSize: '14px',
        color: this.currentConfig.hair === i ? '#ffffff' : '#666666',
        backgroundColor: this.currentConfig.hair === i ? '#7c3aed' : '#2a2a4a',
        padding: { x: 10, y: 8 },
      }).setInteractive({ useHandCursor: true }));

      btn.on('pointerdown', () => {
        this.currentConfig.hair = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Hair color
    addOption(this.add.text(60, startY + 55, 'Hair Color:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    HAIR_COLORS.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 44, startY + 80, 36, 36,
        Phaser.Display.Color.HexStringToColor(color).color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.hairColor === color) {
        addOption(this.add.rectangle(60 + i * 44, startY + 80, 40, 40)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.hairColor = color;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Skin tone
    addOption(this.add.text(60, startY + 105, 'Skin Tone:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    SKIN_TONES.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 44, startY + 130, 36, 36,
        Phaser.Display.Color.HexStringToColor(color).color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.skin === i) {
        addOption(this.add.rectangle(60 + i * 44, startY + 130, 40, 40)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.skin = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Outfit
    addOption(this.add.text(60, startY + 160, 'Outfit:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    OUTFIT_COLORS.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 44, startY + 185, 36, 36, color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.outfit === i) {
        addOption(this.add.rectangle(60 + i * 44, startY + 185, 40, 40)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.outfit = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Accessories
    addOption(this.add.text(60, startY + 215, 'Accessory:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    ACCESSORIES.forEach((acc, i) => {
      const label = acc ? acc.charAt(0).toUpperCase() + acc.slice(1) : 'None';
      const btn = addOption(this.add.text(60 + i * 90, startY + 240, label, {
        fontSize: '14px',
        color: this.currentConfig.accessory === acc ? '#ffffff' : '#666666',
        backgroundColor: this.currentConfig.accessory === acc ? '#7c3aed' : '#2a2a4a',
        padding: { x: 10, y: 8 },
      }).setInteractive({ useHandCursor: true }));

      btn.on('pointerdown', () => {
        this.currentConfig.accessory = acc;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    this.drawPreview();
  }

  private drawPreview(): void {
    this.previewGraphics.clear();
    const { width } = this.cameras.main;
    const cx = width / 2;

    // Draw both avatars side by side using the new renderer
    drawCharacterPreview(this.previewGraphics, cx - 60, 430, this.avatars[0], this.currentAvatar === 1);
    drawCharacterPreview(this.previewGraphics, cx + 60, 430, this.avatars[1], this.currentAvatar === 2);
  }
}
