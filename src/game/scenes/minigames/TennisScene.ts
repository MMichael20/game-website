// src/game/scenes/minigames/TennisScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { audioManager } from '../../../audio/AudioManager';

export class TennisScene extends Phaser.Scene {
  private score = 0;
  private ballSpeed = 2000;
  private ball!: Phaser.GameObjects.Arc;
  private sweetSpot!: Phaser.GameObjects.Rectangle;
  private gameOver = false;
  private returnScene = 'MauiOverworldScene';
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'TennisScene' });
  }

  init(data: { returnScene?: string; returnX?: number; returnY?: number }): void {
    this.returnScene = data.returnScene ?? 'MauiOverworldScene';
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.score = 0;
    this.ballSpeed = 2000;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // Court background (green)
    this.add.rectangle(width / 2, height / 2, width, height, 0x2e7d32);

    // Court lines
    const courtLeft = 40;
    const courtRight = width - 40;
    const courtTop = 60;
    const courtBottom = height - 40;

    // Outer boundary
    this.add.rectangle(width / 2, (courtTop + courtBottom) / 2,
      courtRight - courtLeft, courtBottom - courtTop)
      .setStrokeStyle(2, 0xffffff).setFillStyle();

    // Net (center vertical line)
    this.add.rectangle(width / 2, (courtTop + courtBottom) / 2, 4, courtBottom - courtTop, 0xffffff);

    // Player character (left side, blue)
    this.add.rectangle(width * 0.2, height / 2, 24, 40, 0x3366ff);
    this.add.rectangle(width * 0.2, height / 2 - 24, 16, 16, 0xf5deb3); // head

    // Opponent (right side, red)
    this.add.rectangle(width * 0.8, height / 2, 24, 40, 0xff3333);
    this.add.rectangle(width * 0.8, height / 2 - 24, 16, 16, 0xf5deb3); // head

    // Sweet spot zone (where player should tap)
    this.sweetSpot = this.add.rectangle(width * 0.25, height / 2, 80, 120, 0xffff00, 0.15);

    // Ball
    this.ball = this.add.circle(width * 0.75, height / 2, 8, 0xccff00);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    // Score overlay
    uiManager.showMinigameOverlay({
      title: 'Tennis Rally',
      score: 0,
      onExit: () => {
        this.endGame();
      },
    });

    // Start first ball
    this.launchBall();

    // Tap/click to return
    this.input.on('pointerdown', () => {
      if (this.gameOver) return;
      this.tryReturn();
    });

    // Keyboard support (E or Space)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.gameOver) return;
        this.tryReturn();
      });
      this.input.keyboard.on('keydown-E', () => {
        if (this.gameOver) return;
        this.tryReturn();
      });
    }
  }

  private launchBall(): void {
    const { width, height } = this.scale;
    // Ball starts from opponent side, arcs toward player
    this.ball.setPosition(width * 0.75, height / 2 + (Math.random() - 0.5) * 80);

    this.tweens.add({
      targets: this.ball,
      x: width * 0.05,
      y: height / 2 + (Math.random() - 0.5) * 140,
      duration: this.ballSpeed,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!this.gameOver) {
          this.endGame(); // Missed!
        }
      },
    });
  }

  private tryReturn(): void {
    // Check if ball is within the sweet spot area
    const dx = Math.abs(this.ball.x - this.sweetSpot.x);
    const dy = Math.abs(this.ball.y - this.sweetSpot.y);
    const inZone = dx < 50 && dy < 70;

    if (inZone) {
      // Successful return!
      audioManager.playSFX('mg_catch');
      this.score++;
      this.ballSpeed = Math.max(600, this.ballSpeed - 60); // Speed up each rally
      uiManager.updateMinigameOverlay({ score: this.score });

      // Flash sweet spot green briefly
      this.sweetSpot.setFillStyle(0x00ff00, 0.3);
      this.time.delayedCall(150, () => {
        if (!this.gameOver) this.sweetSpot.setFillStyle(0xffff00, 0.15);
      });

      // Stop current tween, send ball back to opponent
      this.tweens.killTweensOf(this.ball);
      const { width, height } = this.scale;

      this.tweens.add({
        targets: this.ball,
        x: width * 0.75,
        y: height / 2 + (Math.random() - 0.5) * 80,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          // Opponent "returns" after a brief delay
          this.time.delayedCall(400, () => {
            if (!this.gameOver) this.launchBall();
          });
        },
      });
    }
    // If not in zone, nothing happens — ball keeps moving
  }

  private endGame(): void {
    this.gameOver = true;
    this.tweens.killAll();
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showDialog({
      title: 'Game Over!',
      message: `Rally score: ${this.score}`,
      buttons: [{
        label: 'Back to Maui',
        onClick: () => {
          uiManager.hideDialog();
          this.scene.start(this.returnScene, {
            returnX: this.returnX,
            returnY: this.returnY,
          });
        },
      }],
    });
  }
}
