// src/game/scenes/BootScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import { hasSavedGame } from '../systems/SaveSystem';
import { generateAllTextures } from '../rendering/PixelArtGenerator';
import { audioManager } from '../../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // DOM-based loading bar
    const bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 200px; height: 20px; background: #333; border-radius: 10px;
      overflow: hidden; z-index: 100;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%; height: 100%; background: #d4a574;
      border-radius: 10px; transition: width 0.2s;
    `;
    bar.appendChild(fill);
    document.body.appendChild(bar);

    this.load.on('progress', (value: number) => {
      fill.style.width = `${value * 100}%`;
    });

    this.load.on('complete', () => {
      bar.remove();
    });

    // Pixel art textures are generated programmatically in create()
    // via PixelArtGenerator — swap to real PNGs here when available
  }

  create(): void {
    generateAllTextures(this);

    // Initialize audio system (AudioContext created in suspended state)
    audioManager.init(this.game);

    // Show main menu
    const canContinue = hasSavedGame();
    uiManager.showMainMenu(
      () => {
        // Unlock audio on user gesture (New Game)
        audioManager.unlock();
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: true });
      },
      canContinue ? () => {
        // Unlock audio on user gesture (Continue)
        audioManager.unlock();
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: false });
      } : () => {},
    );
  }

}
