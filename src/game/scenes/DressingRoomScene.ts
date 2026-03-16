// src/game/scenes/DressingRoomScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import {
  OUTFIT_COUNT,
  OUTFIT_NAMES,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../../utils/constants';
import {
  loadGameState,
  saveOutfits,
  clearGameState,
} from '../systems/SaveSystem';

export class DressingRoomScene extends Phaser.Scene {
  private playerOutfit = 0;
  private partnerOutfit = 0;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private partnerSprite!: Phaser.GameObjects.Sprite;
  private isNewGame = false;

  constructor() {
    super({ key: 'DressingRoomScene' });
  }

  init(data: { isNewGame: boolean }): void {
    this.isNewGame = data.isNewGame ?? true;

    if (this.isNewGame) {
      clearGameState();
      this.playerOutfit = 0;
      this.partnerOutfit = 0;
    } else {
      const state = loadGameState();
      this.playerOutfit = state.outfits.player;
      this.partnerOutfit = state.outfits.partner;
    }
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Dark background
    this.cameras.main.setBackgroundColor('#2a1a3a');

    // Character preview area — upper 60% of viewport
    const previewY = h * 0.3;
    const spacing = w * 0.25;
    const previewScale = Math.max(2, Math.min(3, Math.floor(w * 0.2 / 64)));

    // Player preview (left)
    this.playerSprite = this.add.sprite(w / 2 - spacing, previewY, `player-outfit-${this.playerOutfit}`, 1)
      .setScale(previewScale)
      .setDepth(5);

    // Partner preview (right)
    this.partnerSprite = this.add.sprite(w / 2 + spacing, previewY, `partner-outfit-${this.partnerOutfit}`, 1)
      .setScale(previewScale)
      .setDepth(5);

    // Labels
    const labelOffset = previewScale * 36 + 10;
    this.add.text(w / 2 - spacing, previewY - labelOffset, 'Hadar', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: '#d4a574',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(w / 2 + spacing, previewY - labelOffset, 'Michael', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: '#7b5ea7',
    }).setOrigin(0.5).setDepth(5);

    // Show DOM dressing room UI
    uiManager.showDressingRoom({
      playerOutfitName: OUTFIT_NAMES[this.playerOutfit],
      partnerOutfitName: OUTFIT_NAMES[this.partnerOutfit],
      onPrevPlayer: () => this.cycleOutfit('player', -1),
      onNextPlayer: () => this.cycleOutfit('player', 1),
      onPrevPartner: () => this.cycleOutfit('partner', -1),
      onNextPartner: () => this.cycleOutfit('partner', 1),
      onStart: () => this.startGame(),
    });
  }

  private cycleOutfit(who: 'player' | 'partner', dir: number): void {
    if (who === 'player') {
      this.playerOutfit = (this.playerOutfit + dir + OUTFIT_COUNT) % OUTFIT_COUNT;
      this.playerSprite.setTexture(`player-outfit-${this.playerOutfit}`, 1);
    } else {
      this.partnerOutfit = (this.partnerOutfit + dir + OUTFIT_COUNT) % OUTFIT_COUNT;
      this.partnerSprite.setTexture(`partner-outfit-${this.partnerOutfit}`, 1);
    }

    uiManager.updateDressingRoom(
      OUTFIT_NAMES[this.playerOutfit],
      OUTFIT_NAMES[this.partnerOutfit],
    );
  }

  private startGame(): void {
    saveOutfits(this.playerOutfit, this.partnerOutfit);
    uiManager.hideDressingRoom();
    this.scene.start('WorldScene');
  }
}
