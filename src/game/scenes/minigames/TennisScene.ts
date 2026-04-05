// src/game/scenes/minigames/TennisScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { audioManager } from '../../../audio/AudioManager';
import { markCheckpointVisited, saveMiniGameScore } from '../../systems/SaveSystem';

export class TennisScene extends Phaser.Scene {
  private score = 0;
  private ballSpeed = 2000;
  private ball!: Phaser.GameObjects.Arc;
  private ballShadow!: Phaser.GameObjects.Arc;
  private sweetSpot!: Phaser.GameObjects.Rectangle;
  private sweetSpotLabel!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private returnScene = 'MauiOverworldScene';
  private returnX?: number;
  private returnY?: number;
  private checkpointId = '';
  private trailDots: Phaser.GameObjects.Arc[] = [];
  private trailTimer = 0;

  constructor() {
    super({ key: 'TennisScene' });
  }

  init(data: { checkpointId?: string; returnScene?: string; returnX?: number; returnY?: number }): void {
    this.checkpointId = data.checkpointId ?? '';
    this.returnScene = data.returnScene ?? 'MauiOverworldScene';
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.score = 0;
    this.ballSpeed = 2000;
    this.gameOver = false;
    this.trailDots = [];
    this.trailTimer = 0;
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

    // Sweet spot zone — pulsing target ring with stroke only
    this.sweetSpot = this.add.rectangle(width * 0.25, height / 2, 80, 120)
      .setStrokeStyle(3, 0xffff00)
      .setFillStyle();

    // Pulsing scale tween on sweet spot
    this.tweens.add({
      targets: this.sweetSpot,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // "HIT!" label inside the sweet spot
    this.sweetSpotLabel = this.add.text(width * 0.25, height / 2, 'HIT!', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pulse the label alpha in sync with the ring
    this.tweens.add({
      targets: this.sweetSpotLabel,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ball shadow (stays at ground level)
    this.ballShadow = this.add.circle(width * 0.75, height * 0.85, 6, 0x000000, 0.2);

    // Ball
    this.ball = this.add.circle(width * 0.75, height / 2, 8, 0xccff00);

    // Speed indicator text (top-right corner)
    this.speedText = this.add.text(width - 10, 10, 'Normal', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

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

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    const { height } = this.scale;

    // Update ball shadow position
    this.ballShadow.setX(this.ball.x);
    this.ballShadow.setY(height * 0.85);

    // Ball trail — throttled to every 50ms
    this.trailTimer += delta;
    if (this.trailTimer >= 50) {
      this.trailTimer = 0;
      const dot = this.add.circle(this.ball.x, this.ball.y, 4, 0xccff00, 0.4);
      this.trailDots.push(dot);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => {
          dot.destroy();
          const idx = this.trailDots.indexOf(dot);
          if (idx !== -1) this.trailDots.splice(idx, 1);
        },
      });
    }

    // Sweet spot color lerp based on ball proximity
    const dist = Phaser.Math.Distance.Between(
      this.ball.x, this.ball.y,
      this.sweetSpot.x, this.sweetSpot.y,
    );
    const maxDist = 300;
    const t = Phaser.Math.Clamp(1 - dist / maxDist, 0, 1);
    // Lerp from yellow (0xffff00) to green (0x00ff00)
    const r = Math.round(Phaser.Math.Linear(0xff, 0x00, t));
    const g = 0xff;
    const b = 0x00;
    const lerpedColor = (r << 16) | (g << 8) | b;
    this.sweetSpot.setStrokeStyle(3, lerpedColor);
    this.sweetSpotLabel.setColor(`#${lerpedColor.toString(16).padStart(6, '0')}`);

    // Update speed indicator
    this.updateSpeedIndicator();
  }

  private updateSpeedIndicator(): void {
    let label: string;
    let color: string;
    if (this.ballSpeed > 1500) {
      label = 'Normal';
      color = '#ffffff';
    } else if (this.ballSpeed > 1000) {
      label = 'Fast';
      color = '#ffff00';
    } else if (this.ballSpeed > 700) {
      label = 'Blazing!';
      color = '#ff8800';
    } else {
      label = 'INSANE!';
      color = '#ff0000';
    }
    this.speedText.setText(label);
    this.speedText.setColor(color);
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
          audioManager.playSFX('mg_miss');
          this.playMissAnimation();
        }
      },
    });
  }

  private playMissAnimation(): void {
    const { width, height } = this.scale;
    const lastY = this.ball.y;

    // Ball bounces off screen
    this.tweens.add({
      targets: this.ball,
      x: -20,
      duration: 200,
      ease: 'Quad.easeIn',
    });

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    // Red flash overlay
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0.3);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // "Miss!" floating text
    const missText = this.add.text(width * 0.15, lastY, 'Miss!', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: missText,
      y: lastY - 60,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => missText.destroy(),
    });

    // Delay before showing result so player sees what happened
    this.time.delayedCall(800, () => {
      this.endGame();
    });
  }

  private tryReturn(): void {
    // Check if ball is within the sweet spot area
    const dx = Math.abs(this.ball.x - this.sweetSpot.x);
    const dy = Math.abs(this.ball.y - this.sweetSpot.y);
    const inZone = dx < 50 && dy < 70;

    if (inZone) {
      // Calculate score
      const isPerfect = dx < 15 && dy < 20;
      const basePoints = 10;
      const speedBonus = Math.floor((2000 - this.ballSpeed) / 100);
      const perfectBonus = isPerfect ? 5 : 0;
      const totalPoints = basePoints + speedBonus + perfectBonus;

      audioManager.playSFX('mg_catch');
      this.score += totalPoints;
      this.ballSpeed = Math.max(600, this.ballSpeed - 60); // Speed up each rally
      uiManager.updateMinigameOverlay({ score: this.score });

      // --- Hit animation ---

      // White camera flash
      const { width, height } = this.scale;
      const flashOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.2);
      this.tweens.add({
        targets: flashOverlay,
        alpha: 0,
        duration: 100,
        onComplete: () => flashOverlay.destroy(),
      });

      // Ball scale punch
      this.tweens.add({
        targets: this.ball,
        scale: 1.5,
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      // Racket swing arc — thin white line at player position
      const racket = this.add.rectangle(
        width * 0.2 + 16, height / 2, 4, 30, 0xffffff,
      ).setRotation(-0.5);
      this.tweens.add({
        targets: racket,
        rotation: 0.8,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => racket.destroy(),
      });

      // Floating score text
      const scoreLabel = isPerfect ? `+${totalPoints} Perfect!` : `+${totalPoints}`;
      const floatText = this.add.text(this.sweetSpot.x, this.sweetSpot.y - 20, scoreLabel, {
        fontSize: isPerfect ? '18px' : '16px',
        fontFamily: 'monospace',
        color: isPerfect ? '#00ffff' : '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: floatText,
        y: floatText.y - 50,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => floatText.destroy(),
      });

      // Stop current tween, send ball back to opponent
      this.tweens.killTweensOf(this.ball);

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

    // Clean up trail dots
    for (const dot of this.trailDots) {
      dot.destroy();
    }
    this.trailDots = [];

    if (this.checkpointId) {
      markCheckpointVisited(this.checkpointId);
      saveMiniGameScore(this.checkpointId, this.score);
    }

    uiManager.hideMinigameOverlay();
    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Game Over!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start(this.returnScene, {
        returnX: this.returnX,
        returnY: this.returnY,
      });
    });
  }
}
