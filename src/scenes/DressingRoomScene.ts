import Phaser from 'phaser';
import { loadOutfitSelection, saveOutfitSelection } from '../utils/storage';
import { OUTFIT_NAMES } from '../rendering/OutfitRenderer';
import { createStyledButton, createStyledText, addFadeTransition, UI_COLORS } from '../rendering/UIRenderer';

export class DressingRoomScene extends Phaser.Scene {
  private currentCharacter: 'her' | 'him' = 'her';
  private herOutfit = 0;
  private hisOutfit = 0;
  private fromWorld = false;

  private previewImage!: Phaser.GameObjects.Image;
  private reflectionImage!: Phaser.GameObjects.Image;
  private characterLabel!: Phaser.GameObjects.Text;
  private outfitLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DressingRoomScene' });
  }

  init(data?: { fromWorld?: boolean }): void {
    this.fromWorld = data?.fromWorld ?? false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    addFadeTransition(this);

    // Gradient backdrop
    const bg = this.add.graphics();
    const gradientSteps = 64;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.round(26 + (20 - 26) * t);
      const g = Math.round(26 + (10 - 26) * t);
      const b = Math.round(46 + (60 - 46) * t);
      const color = (r << 16) | (g << 8) | b;
      const bandHeight = height / gradientSteps;
      bg.fillStyle(color, 1);
      bg.fillRect(0, i * bandHeight, width, bandHeight + 1);
    }

    // Load saved outfit selection
    const saved = loadOutfitSelection();
    this.herOutfit = saved.herOutfit;
    this.hisOutfit = saved.hisOutfit;

    // Character label
    this.characterLabel = createStyledText(this, width / 2, 40, 'Her', {
      fontSize: '28px',
      color: UI_COLORS.goldHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview image
    const previewKey = this.getPreviewKey();
    this.previewImage = this.add.image(width / 2, height / 2 - 40, previewKey);

    // Floor reflection
    this.reflectionImage = this.add.image(width / 2, height / 2 - 40 + this.previewImage.height, previewKey);
    this.reflectionImage.setFlipY(true);
    this.reflectionImage.setAlpha(0.3);

    // Outfit name label
    this.outfitLabel = createStyledText(this, width / 2, height - 150, this.getCurrentOutfitName(), {
      fontSize: '20px',
      color: UI_COLORS.creamHex,
    }).setOrigin(0.5);

    // Left arrow button
    const leftArrow = createStyledButton(this, width / 2 - 120, height - 150, '<', {
      width: 40,
      height: 40,
      fontSize: '20px',
    });
    leftArrow.container.on('pointerdown', () => this.changeOutfit(-1));

    // Right arrow button
    const rightArrow = createStyledButton(this, width / 2 + 120, height - 150, '>', {
      width: 40,
      height: 40,
      fontSize: '20px',
    });
    rightArrow.container.on('pointerdown', () => this.changeOutfit(1));

    // Switch Character button
    const switchBtn = createStyledButton(this, width / 2, height - 100, 'Switch Character', {
      fontSize: '14px',
      color: UI_COLORS.dark,
      textColor: UI_COLORS.goldHex,
    });
    switchBtn.container.on('pointerdown', () => this.switchCharacter());

    // Ready button
    const readyBtn = createStyledButton(this, width / 2, height - 50, 'Ready', {
      fontSize: '18px',
      color: UI_COLORS.gold,
      textColor: UI_COLORS.darkHex,
      width: 160,
      height: 44,
    });
    readyBtn.container.on('pointerdown', () => this.onReady());
  }

  private getPreviewKey(): string {
    const outfit = this.currentCharacter === 'her' ? this.herOutfit : this.hisOutfit;
    return `${this.currentCharacter}-preview-${outfit}`;
  }

  private getCurrentOutfitName(): string {
    const outfit = this.currentCharacter === 'her' ? this.herOutfit : this.hisOutfit;
    return OUTFIT_NAMES[outfit] ?? 'Unknown';
  }

  private changeOutfit(delta: number): void {
    if (this.currentCharacter === 'her') {
      this.herOutfit = (this.herOutfit + delta + 8) % 8;
    } else {
      this.hisOutfit = (this.hisOutfit + delta + 8) % 8;
    }

    this.updatePreview();
  }

  private switchCharacter(): void {
    this.currentCharacter = this.currentCharacter === 'her' ? 'him' : 'her';
    this.characterLabel.setText(this.currentCharacter === 'her' ? 'Her' : 'Him');
    this.updatePreview();
  }

  private updatePreview(): void {
    const key = this.getPreviewKey();

    // Crossfade: set alpha to 0 then tween to 1
    this.previewImage.setTexture(key);
    this.previewImage.setAlpha(0);
    this.tweens.add({
      targets: this.previewImage,
      alpha: 1,
      duration: 200,
      ease: 'Linear',
    });

    this.reflectionImage.setTexture(key);
    this.reflectionImage.setAlpha(0);
    this.tweens.add({
      targets: this.reflectionImage,
      alpha: 0.3,
      duration: 200,
      ease: 'Linear',
    });

    // Update reflection position
    this.reflectionImage.setY(this.previewImage.y + this.previewImage.height);

    this.outfitLabel.setText(this.getCurrentOutfitName());
  }

  private onReady(): void {
    const outfits = { herOutfit: this.herOutfit, hisOutfit: this.hisOutfit };
    saveOutfitSelection(outfits);

    if (this.fromWorld) {
      this.scene.stop('DressingRoomScene');
      this.scene.resume('WorldScene');
      const worldScene = this.scene.get('WorldScene') as Phaser.Scene & { applyOutfitChange?: () => void };
      if (worldScene.applyOutfitChange) {
        worldScene.applyOutfitChange();
      }
    } else {
      this.scene.start('WorldScene');
    }
  }
}
