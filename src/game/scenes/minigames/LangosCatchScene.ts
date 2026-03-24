// src/game/scenes/minigames/LangosCatchScene.ts
// Catch falling toppings (sour cream, cheese, garlic) onto a lángos

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const TOPPING_TYPES = ['sour-cream', 'cheese', 'garlic', 'ketchup'];
const BAD_ITEMS = ['rock', 'shoe'];

export class LangosCatchScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private items: Phaser.GameObjects.Sprite[] = [];
  private langos!: Phaser.GameObjects.Sprite;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;

  constructor() {
    super({ key: 'LangosCatchScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.items = [];
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // Warm kitchen background
    this.add.rectangle(width / 2, height / 2, width, height, 0x8B6914);
    // Counter at bottom
    this.add.rectangle(width / 2, height - 20, width, 40, 0x5C3A1E);

    // Lángos (plate/basket) at bottom
    this.langos = this.add.sprite(width / 2, height - 50, 'langos-plate');
    this.langos.setDisplaySize(72, 48);

    // Pointer control
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.langos.x = Phaser.Math.Clamp(pointer.x, 36, width - 36);
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Lángos Catch!',
      score: 0,
      timer: GAME_DURATION,
      onExit: () => this.endGame(),
    });

    // Spawn toppings
    this.spawnTimer = this.time.addEvent({
      delay: 700,
      callback: () => this.spawnItem(),
      loop: true,
    });

    // Countdown
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft === 5) audioManager.playSFX('mg_timer_warning');
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  private spawnItem(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;

    // 20% chance of bad item
    const isBad = Math.random() < 0.2;
    const type = isBad
      ? Phaser.Utils.Array.GetRandom(BAD_ITEMS)
      : Phaser.Utils.Array.GetRandom(TOPPING_TYPES);

    const x = Phaser.Math.Between(32, width - 32);
    const item = this.add.sprite(x, -20, `langos-${type}`) as any;
    item.setDisplaySize(28, 28);
    item.isBad = isBad;
    this.items.push(item);

    this.tweens.add({
      targets: item,
      y: height + 20,
      duration: 1500 + Math.random() * 500,
      onComplete: () => this.removeItem(item),
    });
  }

  private removeItem(item: Phaser.GameObjects.Sprite): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) this.items.splice(idx, 1);
    item.destroy();
  }

  update(): void {
    if (this.gameOver) return;
    const { width } = this.scale;

    if (this.cursors) {
      if (this.cursors.left.isDown) this.langos.x = Phaser.Math.Clamp(this.langos.x - 5, 36, width - 36);
      if (this.cursors.right.isDown) this.langos.x = Phaser.Math.Clamp(this.langos.x + 5, 36, width - 36);
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i] as any;
      const dx = Math.abs(item.x - this.langos.x);
      const dy = Math.abs(item.y - this.langos.y);
      if (dx < 40 && dy < 24) {
        if (item.isBad) {
          this.score = Math.max(0, this.score - 20);
          audioManager.playSFX('mg_miss');
          // Red flash
          const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xFF0000, 0.15).setDepth(10);
          this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        } else {
          this.score += 10;
          audioManager.playSFX('mg_catch');
        }
        uiManager.updateMinigameOverlay({ score: this.score });
        this.removeItem(item);
      }
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.spawnTimer.destroy();
    this.countdownTimer.destroy();
    for (const item of [...this.items]) item.destroy();
    this.items = [];
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Lángos Ready!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
