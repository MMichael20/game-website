// src/game/scenes/BootScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import { hasSavedGame } from '../systems/SaveSystem';
import { generateAllTexturesChunked } from '../rendering/PixelArtGenerator';
import { audioManager } from '../../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  private loadingBar: HTMLDivElement | null = null;
  private loadingFill: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // DOM-based loading bar — driven by chunked texture generation in create().
    // (preload itself loads zero assets; Phaser's load.on('progress') is a no-op
    // here, which is why we drive the bar ourselves.)
    const bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 220px; height: 20px; background: #333; border-radius: 10px;
      overflow: hidden; z-index: 100;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%; height: 100%; background: #d4a574;
      border-radius: 10px; transition: width 0.15s ease-out;
    `;
    bar.appendChild(fill);
    document.body.appendChild(bar);
    this.loadingBar = bar;
    this.loadingFill = fill;
  }

  async create(): Promise<void> {
    // Generate textures across rAF ticks so the browser paints the loading bar
    // between heavy generators instead of freezing the tab for 1-2 seconds.
    await generateAllTexturesChunked(this, (done, total) => {
      if (this.loadingFill) {
        this.loadingFill.style.width = `${(done / total) * 100}%`;
      }
    });

    this.loadingBar?.remove();
    this.loadingBar = null;
    this.loadingFill = null;

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
