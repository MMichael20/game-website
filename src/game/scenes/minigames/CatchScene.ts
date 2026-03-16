// src/game/scenes/minigames/CatchScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import type { CatchConfig } from '../../data/checkpoints';

const GAME_DURATION = 30;

interface FallingItem extends Phaser.GameObjects.Sprite {
  itemType: string;
}

export class CatchScene extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CatchConfig;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private items: FallingItem[] = [];
  private basket!: Phaser.GameObjects.Sprite;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;

  constructor() {
    super({ key: 'CatchScene' });
  }

  init(data: { checkpointId: string; config: CatchConfig }): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.items = [];
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // Sky blue background
    this.add.rectangle(width / 2, height / 2, width, height, 0x87ceeb);

    // Green ground at bottom
    this.add.rectangle(width / 2, height - 25, width, 50, 0x4caf50);

    // Basket at bottom center
    this.basket = this.add.sprite(width / 2, height - 55, 'catch-basket');
    this.basket.setDisplaySize(64, 48);

    // Pointer control
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.basket.x = Phaser.Math.Clamp(pointer.x, 32, width - 32);
    });

    // Keyboard control
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Show overlay
    uiManager.showMinigameOverlay({
      title: 'Catch!',
      score: 0,
      timer: GAME_DURATION,
    });

    // Spawn timer
    this.spawnTimer = this.time.addEvent({
      delay: this.config.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });

    // Countdown timer
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  private spawnItem(): void {
    if (this.gameOver) return;

    const { width } = this.scale;
    const itemType = Phaser.Utils.Array.GetRandom(this.config.items) as string;
    const x = Phaser.Math.Between(32, width - 32);

    const item = this.add.sprite(x, -20, `catch-${itemType}`) as FallingItem;
    item.setDisplaySize(32, 32);
    item.itemType = itemType;
    this.items.push(item);

    const fallDuration = 2000 / this.config.speed;
    this.tweens.add({
      targets: item,
      y: this.scale.height + 20,
      duration: fallDuration,
      onComplete: () => {
        this.removeItem(item);
      },
    });
  }

  private removeItem(item: FallingItem): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
    item.destroy();
  }

  update(): void {
    if (this.gameOver) return;

    const { width } = this.scale;

    // Keyboard movement
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.basket.x = Phaser.Math.Clamp(this.basket.x - 5, 32, width - 32);
      }
      if (this.cursors.right.isDown) {
        this.basket.x = Phaser.Math.Clamp(this.basket.x + 5, 32, width - 32);
      }
    }

    // Check collisions
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dx = Math.abs(item.x - this.basket.x);
      const dy = Math.abs(item.y - this.basket.y);
      if (dx < 40 && dy < 20) {
        this.score += 10;
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

    // Clean up remaining items
    for (const item of [...this.items]) {
      item.destroy();
    }
    this.items = [];
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    uiManager.showMinigameResult('Time\'s Up!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
