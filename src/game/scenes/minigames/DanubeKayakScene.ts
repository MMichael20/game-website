// src/game/scenes/minigames/DanubeKayakScene.ts
// Race a kayak down the Danube dodging tourist boats and bridge pillars while collecting gold coins

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const PLAYER_SPEED = 3.0;
const BASE_OBSTACLE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const SPEED_INTERVAL = 5;
const BANK_HEIGHT = 25;
const INVINCIBILITY_MS = 1000;

type ObstacleType = 'boat' | 'pillar-top' | 'pillar-bottom' | 'debris';

interface Obstacle extends Phaser.GameObjects.Rectangle {
  obstacleType: ObstacleType;
  speed: number;
}

interface Coin extends Phaser.GameObjects.Arc {
  speed: number;
}

interface Ripple extends Phaser.GameObjects.Rectangle {
  speed: number;
}

export class DanubeKayakScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private player!: Phaser.GameObjects.Rectangle;
  private paddle!: Phaser.GameObjects.Rectangle;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private ripples: Ripple[] = [];
  private boatTimer!: Phaser.Time.TimerEvent;
  private pillarTimer!: Phaser.Time.TimerEvent;
  private debrisTimer!: Phaser.Time.TimerEvent;
  private coinTimer!: Phaser.Time.TimerEvent;
  private rippleTimer!: Phaser.Time.TimerEvent;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;
  private invincible = false;
  private currentSpeed = BASE_OBSTACLE_SPEED;
  private elapsed = 0;
  private bgFar!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: 'DanubeKayakScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.obstacles = [];
    this.coins = [];
    this.ripples = [];
    this.gameOver = false;
    this.invincible = false;
    this.currentSpeed = BASE_OBSTACLE_SPEED;
    this.elapsed = 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // Deep water background
    this.add.rectangle(width / 2, height / 2, width, height, 0x2A5A8A);

    // Wave pattern — horizontal lighter bands
    for (let y = BANK_HEIGHT + 10; y < height - BANK_HEIGHT; y += 18) {
      const waveAlpha = 0.04 + Math.sin(y * 0.1) * 0.02;
      this.add.rectangle(width / 2, y, width, 3, 0x4A8ABF, waveAlpha);
    }

    // Far bank silhouette (parallax background) — buildings along the top
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x1A3A5A, 0.6);
    for (let x = 0; x < width + 40; x += Phaser.Math.Between(18, 35)) {
      const bh = Phaser.Math.Between(10, 28);
      bgGfx.fillRect(x, BANK_HEIGHT - bh + 5, Phaser.Math.Between(12, 25), bh);
    }

    // Create a tileSprite for parallax scrolling of the far bank
    const bgTex = this.textures.createCanvas('farBank', width * 2, 40);
    if (bgTex) {
      const ctx = bgTex.getContext();
      ctx.fillStyle = 'rgba(26,58,90,0.5)';
      for (let x = 0; x < width * 2; x += Phaser.Math.Between(18, 35)) {
        const bh = Phaser.Math.Between(10, 28);
        ctx.fillRect(x, 40 - bh, Phaser.Math.Between(12, 25), bh);
      }
      bgTex.refresh();
      this.bgFar = this.add.tileSprite(width / 2, BANK_HEIGHT + 8, width, 40, 'farBank').setAlpha(0.5);
    }

    // River banks — green strips
    const topBank = this.add.rectangle(width / 2, BANK_HEIGHT / 2, width, BANK_HEIGHT, 0x3A7A3A);
    const bottomBank = this.add.rectangle(width / 2, height - BANK_HEIGHT / 2, width, BANK_HEIGHT, 0x3A7A3A);
    // Grass texture on banks
    for (let x = 0; x < width; x += 6) {
      this.add.rectangle(x, Phaser.Math.Between(2, BANK_HEIGHT - 2), 2, 4, 0x2E6B2E, 0.6);
      this.add.rectangle(x, height - Phaser.Math.Between(2, BANK_HEIGHT - 2), 2, 4, 0x2E6B2E, 0.6);
    }

    // Player kayak — orange body with paddle
    this.player = this.add.rectangle(60, height / 2, 20, 10, 0xFF8C00).setDepth(10);
    // Kayak nose (pointed front)
    const nose = this.add.triangle(
      73, height / 2,
      0, -5, 8, 0, 0, 5,
      0xFF9520
    ).setDepth(10);
    // Paddle
    this.paddle = this.add.rectangle(60, height / 2, 2, 18, 0x8B4513).setDepth(11);

    // Animate paddle stroke
    this.tweens.add({
      targets: this.paddle,
      angle: { from: -25, to: 25 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Keep nose attached to kayak
    this.tweens.add({
      targets: nose,
      y: this.player.y,
      duration: 0,
      repeat: -1,
    });

    // Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      if (pointer.y < this.player.y) this.player.y -= 30;
      else this.player.y += 30;
    });

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Danube Kayak!',
      score: 0,
      timer: GAME_DURATION,
      progress: 'Dodge & collect!',
      onExit: () => this.endGame(),
    });

    // Countdown 3-2-1-GO then start
    this.showCountdown(() => this.startGameTimers());
  }

  private startGameTimers(): void {
    this.boatTimer = this.time.addEvent({
      delay: 1500,
      callback: () => this.spawnObstacle('boat'),
      loop: true,
    });

    this.pillarTimer = this.time.addEvent({
      delay: 4000,
      callback: () => this.spawnObstacle('pillar'),
      loop: true,
    });

    this.debrisTimer = this.time.addEvent({
      delay: 2000,
      callback: () => this.spawnObstacle('debris'),
      loop: true,
    });

    this.coinTimer = this.time.addEvent({
      delay: 800,
      callback: () => this.spawnCoin(),
      loop: true,
    });

    // Water ripples
    this.rippleTimer = this.time.addEvent({
      delay: 300,
      callback: () => this.spawnRipple(),
      loop: true,
    });

    // Countdown
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.elapsed++;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft === 5) audioManager.playSFX('mg_timer_warning');

        // Increase difficulty every SPEED_INTERVAL seconds
        if (this.elapsed % SPEED_INTERVAL === 0) {
          this.currentSpeed += SPEED_INCREMENT;
        }

        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  private showCountdown(onComplete: () => void): void {
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height / 2, '3', {
      fontSize: '48px', color: '#FFFFFF', fontStyle: 'bold', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(800, () => { text.setText('2'); });
    this.time.delayedCall(1600, () => { text.setText('1'); });
    this.time.delayedCall(2400, () => { text.setText('GO!'); text.setColor('#FFD700'); });
    this.time.delayedCall(3000, () => { text.destroy(); onComplete(); });
  }

  private spawnObstacle(type: 'boat' | 'pillar' | 'debris'): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const minY = BANK_HEIGHT + 10;
    const maxY = height - BANK_HEIGHT - 10;

    if (type === 'boat') {
      const y = Phaser.Math.Between(minY + 10, maxY - 10);
      const boat = this.add.rectangle(width + 30, y, 40, 15, 0xFFFFFF).setDepth(5) as unknown as Obstacle;
      boat.obstacleType = 'boat';
      boat.speed = this.currentSpeed + Math.random() * 0.5;
      // Boat cabin detail
      const cabin = this.add.rectangle(width + 25, y - 4, 12, 8, 0xCCCCCC).setDepth(5);
      this.tweens.add({
        targets: cabin,
        x: -50,
        duration: (width + 80) / boat.speed * 16.67,
        onComplete: () => cabin.destroy(),
      });
      this.obstacles.push(boat);
    } else if (type === 'pillar') {
      // Bridge pillars with a gap to pass through
      const gapSize = 50 + Phaser.Math.Between(0, 20);
      const gapCenter = Phaser.Math.Between(minY + gapSize / 2 + 10, maxY - gapSize / 2 - 10);
      const topH = gapCenter - gapSize / 2 - BANK_HEIGHT;
      const bottomH = (height - BANK_HEIGHT) - (gapCenter + gapSize / 2);

      if (topH > 5) {
        const topPillar = this.add.rectangle(
          width + 10, BANK_HEIGHT + topH / 2, 15, topH, 0x888888
        ).setDepth(5) as unknown as Obstacle;
        topPillar.obstacleType = 'pillar-top';
        topPillar.speed = this.currentSpeed;
        this.obstacles.push(topPillar);
      }

      if (bottomH > 5) {
        const bottomPillar = this.add.rectangle(
          width + 10, height - BANK_HEIGHT - bottomH / 2, 15, bottomH, 0x888888
        ).setDepth(5) as unknown as Obstacle;
        bottomPillar.obstacleType = 'pillar-bottom';
        bottomPillar.speed = this.currentSpeed;
        this.obstacles.push(bottomPillar);
      }

      // Bridge top (decorative crossbar)
      const bar = this.add.rectangle(width + 10, BANK_HEIGHT + 2, 18, 4, 0x666666).setDepth(6);
      this.tweens.add({
        targets: bar,
        x: -20,
        duration: (width + 30) / this.currentSpeed * 16.67,
        onComplete: () => bar.destroy(),
      });
    } else {
      // Debris / logs
      const y = Phaser.Math.Between(minY + 5, maxY - 5);
      const log = this.add.rectangle(width + 15, y, 25, 8, 0x6B4226).setDepth(5) as unknown as Obstacle;
      log.obstacleType = 'debris';
      log.speed = this.currentSpeed * 0.8 + Math.random() * 0.4;
      // Wood grain detail
      this.add.rectangle(width + 15, y, 20, 1, 0x5A3620, 0.5).setDepth(5);
      this.obstacles.push(log);
    }
  }

  private spawnCoin(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const minY = BANK_HEIGHT + 12;
    const maxY = height - BANK_HEIGHT - 12;
    const y = Phaser.Math.Between(minY, maxY);

    const coin = this.add.circle(width + 10, y, 5, 0xFFD700).setDepth(7) as unknown as Coin;
    coin.speed = this.currentSpeed * 0.9;

    // Sparkle effect — pulsing glow
    this.tweens.add({
      targets: coin,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      alpha: { from: 1, to: 0.7 },
      duration: 250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.coins.push(coin);
  }

  private spawnRipple(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const minY = BANK_HEIGHT + 5;
    const maxY = height - BANK_HEIGHT - 5;

    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(minY, maxY);
    const ripple = this.add.rectangle(x, y, Phaser.Math.Between(8, 16), 2, 0x4A9AC7, 0.25).setDepth(1) as unknown as Ripple;
    ripple.speed = this.currentSpeed * 0.5;

    // Fade out and remove
    this.tweens.add({
      targets: ripple,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        const idx = this.ripples.indexOf(ripple);
        if (idx !== -1) this.ripples.splice(idx, 1);
        ripple.destroy();
      },
    });

    this.ripples.push(ripple);
  }

  private createSplash(x: number, y: number): void {
    // Splash particles on collision
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const dist = Phaser.Math.Between(5, 15);
      const droplet = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0x6AAFD4, 0.8).setDepth(15);
      this.tweens.add({
        targets: droplet,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 400,
        ease: 'Power2',
        onComplete: () => droplet.destroy(),
      });
    }
    // Central splash ring
    const ring = this.add.circle(x, y, 3, 0xADD8E6, 0.6).setDepth(14);
    this.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  private createCoinSparkle(x: number, y: number): void {
    // Sparkle burst on coin collect
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const spark = this.add.rectangle(
        x, y, 3, 3, 0xFFFF00, 1
      ).setDepth(15).setAngle(45);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * Phaser.Math.Between(8, 18),
        y: y + Math.sin(angle) * Phaser.Math.Between(8, 18),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 350,
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }
    // Score popup
    const popup = this.add.text(x, y - 10, '+10', {
      fontSize: '12px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => popup.destroy(),
    });
  }

  update(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const minY = BANK_HEIGHT + 5;
    const maxY = height - BANK_HEIGHT - 5;

    // Keyboard movement
    if (this.cursors) {
      if (this.cursors.up.isDown) this.player.y -= PLAYER_SPEED;
      if (this.cursors.down.isDown) this.player.y += PLAYER_SPEED;
    }

    // Clamp to river banks
    this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
    this.paddle.y = this.player.y;

    // Parallax far bank scroll
    if (this.bgFar) {
      this.bgFar.tilePositionX += this.currentSpeed * 0.3;
    }

    // Move ripples with current
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.active) {
        this.ripples.splice(i, 1);
        continue;
      }
      r.x -= r.speed;
      if (r.x < -20) {
        r.destroy();
        this.ripples.splice(i, 1);
      }
    }

    // Move obstacles and check collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs.active) {
        this.obstacles.splice(i, 1);
        continue;
      }
      obs.x -= obs.speed;

      // Off screen
      if (obs.x < -60) {
        obs.destroy();
        this.obstacles.splice(i, 1);
        continue;
      }

      // Collision check (only if not invincible)
      if (!this.invincible) {
        const dx = Math.abs(obs.x - this.player.x);
        const dy = Math.abs(obs.y - this.player.y);
        if (dx < (obs.width / 2 + 10) && dy < (obs.height / 2 + 5)) {
          this.handleHit(obs);
        }
      }
    }

    // Move coins and check collection
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (!coin.active) {
        this.coins.splice(i, 1);
        continue;
      }
      coin.x -= coin.speed;

      // Off screen
      if (coin.x < -10) {
        coin.destroy();
        this.coins.splice(i, 1);
        continue;
      }

      // Collect check
      const dx = Math.abs(coin.x - this.player.x);
      const dy = Math.abs(coin.y - this.player.y);
      if (dx < 14 && dy < 12) {
        this.score += 10;
        audioManager.playSFX('mg_catch');
        uiManager.updateMinigameOverlay({ score: this.score });
        this.createCoinSparkle(coin.x, coin.y);
        coin.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  private handleHit(obs: Obstacle): void {
    const { width, height } = this.scale;
    audioManager.playSFX('mg_wrong');
    this.cameras.main.shake(150, 0.008);

    this.score = Math.max(0, this.score - 20);
    uiManager.updateMinigameOverlay({ score: this.score });

    // Splash effect at collision point
    this.createSplash(this.player.x, this.player.y);

    // Red flash
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.2).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Bounce kayak back
    this.tweens.add({
      targets: [this.player, this.paddle],
      x: Math.max(30, this.player.x - 25),
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Red tint on kayak during invincibility
    this.player.fillColor = 0xFF4444;
    this.invincible = true;

    this.time.delayedCall(INVINCIBILITY_MS, () => {
      this.invincible = false;
      if (this.player.active) {
        this.player.fillColor = 0xFF8C00;
      }
    });

    // Blink during invincibility
    this.tweens.add({
      targets: this.player,
      alpha: { from: 0.3, to: 1 },
      duration: 100,
      yoyo: true,
      repeat: 4,
    });
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    this.boatTimer.destroy();
    this.pillarTimer.destroy();
    this.debrisTimer.destroy();
    this.coinTimer.destroy();
    this.rippleTimer.destroy();
    this.countdownTimer.destroy();

    for (const obs of [...this.obstacles]) obs.destroy();
    this.obstacles = [];
    for (const coin of [...this.coins]) coin.destroy();
    this.coins = [];
    for (const r of [...this.ripples]) r.destroy();
    this.ripples = [];
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Great paddle!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
