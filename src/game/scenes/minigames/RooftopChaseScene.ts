// src/game/scenes/minigames/RooftopChaseScene.ts
// Chase a stray cat across Budapest rooftops — side-scrolling auto-runner

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const GRAVITY = 0.35;
const JUMP_VELOCITY = -8;
const BASE_SCROLL_SPEED = 2.5;

interface Rooftop {
  rect: Phaser.GameObjects.Rectangle;
  obstacles: Phaser.GameObjects.Rectangle[];
  scored: boolean;
}

export class RooftopChaseScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private gameOver = false;

  // Player
  private player!: Phaser.GameObjects.Rectangle;
  private playerVY = 0;
  private grounded = false;

  // Cat
  private cat!: Phaser.GameObjects.Rectangle;
  private catBobTime = 0;

  // Rooftops
  private rooftops: Rooftop[] = [];
  private scrollSpeed = BASE_SCROLL_SPEED;

  // Background layers
  private skylineRects: Phaser.GameObjects.Rectangle[] = [];
  private stars: Phaser.GameObjects.Rectangle[] = [];

  // Rooftops crossed
  private rooftopsCrossed = 0;
  private currentRoofIndex = -1;

  constructor() {
    super({ key: 'RooftopChaseScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.gameOver = false;
    this.rooftops = [];
    this.skylineRects = [];
    this.stars = [];
    this.playerVY = 0;
    this.grounded = false;
    this.scrollSpeed = BASE_SCROLL_SPEED;
    this.rooftopsCrossed = 0;
    this.currentRoofIndex = -1;
    this.catBobTime = 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // Sky gradient — dark blue top, lighter bottom
    const gradientSteps = 8;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / (gradientSteps - 1);
      const r = Phaser.Math.Interpolation.Linear([0x1A, 0x3A], t);
      const g = Phaser.Math.Interpolation.Linear([0x2A, 0x5A], t);
      const b = Phaser.Math.Interpolation.Linear([0x4A, 0x8A], t);
      const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      const sliceH = height / gradientSteps;
      this.add.rectangle(width / 2, sliceH * i + sliceH / 2, width, sliceH + 1, color).setDepth(-3);
    }

    // Moon
    this.add.circle(width - 60, 40, 18, 0xFFFDD0, 0.9).setDepth(-2);
    this.add.circle(width - 52, 36, 14, 0x1A2A4A, 0.9).setDepth(-2); // crescent shadow

    // Stars
    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(5, height * 0.4);
      const size = Math.random() < 0.3 ? 2 : 1;
      const star = this.add.rectangle(sx, sy, size, size, 0xFFFFFF, 0.5 + Math.random() * 0.5).setDepth(-2);
      this.stars.push(star);
    }

    // Far background skyline silhouette
    for (let x = 0; x < width + 80; x += Phaser.Math.Between(25, 50)) {
      const bw = Phaser.Math.Between(20, 45);
      const bh = Phaser.Math.Between(40, 120);
      const rect = this.add.rectangle(x, height - bh / 2, bw, bh, 0x0D1A2D, 0.7).setDepth(-1);
      this.skylineRects.push(rect);
    }

    // Generate initial rooftops
    let nextX = 50;
    for (let i = 0; i < 8; i++) {
      const roofW = Phaser.Math.Between(100, 200);
      const roofTopY = Phaser.Math.Between(height * 0.55, height * 0.7);
      this.createRooftop(nextX, roofTopY, roofW);
      nextX += roofW + Phaser.Math.Between(40, 80);
    }

    // Player — green rectangle
    const firstRoof = this.rooftops[0];
    const startX = firstRoof.rect.x - firstRoof.rect.width / 2 + 40;
    const startY = firstRoof.rect.y - firstRoof.rect.height / 2 - 10;
    this.player = this.add.rectangle(startX, startY, 16, 20, 0x44FF44).setDepth(10);
    this.currentRoofIndex = 0;

    // Cat — small orange square
    this.cat = this.add.rectangle(startX + 80, startY - 2, 10, 10, 0xFF8833).setDepth(10);

    // Controls
    if (this.input.keyboard) {
      const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      spaceKey.on('down', () => this.jump());
      const upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      upKey.on('down', () => this.jump());
    }
    this.input.on('pointerdown', () => this.jump());

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Rooftop Chase!',
      score: 0,
      timer: GAME_DURATION,
      progress: 'Catch the cat!',
      onExit: () => this.endGame(),
    });

    // Countdown 3-2-1-GO then start timer
    this.showCountdown(() => {
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

  private createRooftop(x: number, topY: number, w: number): Rooftop {
    const { height } = this.scale;
    const roofH = height - topY;
    const rect = this.add.rectangle(x + w / 2, topY + roofH / 2, w, roofH, 0x8B5E3C).setDepth(1);

    // Roof edge line (darker)
    this.add.rectangle(x + w / 2, topY, w, 3, 0x6B3E1C).setDepth(2);

    // Roof tiles/texture lines
    for (let ty = topY + 12; ty < topY + 30 && ty < height; ty += 8) {
      this.add.rectangle(x + w / 2, ty, w - 4, 1, 0x7B4E2C, 0.3).setDepth(2);
    }

    // Obstacles
    const obstacles: Phaser.GameObjects.Rectangle[] = [];
    if (w > 120 && Math.random() > 0.3) {
      // Chimney
      const cx = x + Phaser.Math.Between(30, w - 30);
      const chimney = this.add.rectangle(cx, topY - 12.5, 15, 25, 0x666666).setDepth(3);
      // Chimney cap
      this.add.rectangle(cx, topY - 25, 19, 3, 0x555555).setDepth(3);
      obstacles.push(chimney);
    }
    if (w > 150 && Math.random() > 0.5) {
      // Satellite dish — small gray square
      const dx = x + Phaser.Math.Between(20, w - 20);
      const dish = this.add.rectangle(dx, topY - 6, 10, 12, 0x888888).setDepth(3);
      // Antenna rod
      this.add.rectangle(dx, topY - 14, 2, 8, 0xAAAAAA).setDepth(3);
      obstacles.push(dish);
    }

    const rooftop: Rooftop = { rect, obstacles, scored: false };
    this.rooftops.push(rooftop);
    return rooftop;
  }

  private jump(): void {
    if (this.gameOver || !this.grounded) return;
    this.playerVY = JUMP_VELOCITY;
    this.grounded = false;
  }

  update(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;

    // Gradually increase speed
    this.scrollSpeed = BASE_SCROLL_SPEED + this.rooftopsCrossed * 0.12;

    // Scroll everything left
    this.scrollWorld();

    // Apply gravity to player
    this.playerVY += GRAVITY;
    this.player.y += this.playerVY;

    // Collision with rooftops
    this.grounded = false;
    let onRoof = false;
    for (let i = 0; i < this.rooftops.length; i++) {
      const roof = this.rooftops[i];
      const r = roof.rect;
      const roofLeft = r.x - r.width / 2;
      const roofRight = r.x + r.width / 2;
      const roofTop = r.y - r.height / 2;

      // Check if player is above this roof horizontally
      if (this.player.x + 8 > roofLeft && this.player.x - 8 < roofRight) {
        // Landing on roof (feet at player.y + 10)
        if (this.player.y + 10 >= roofTop && this.player.y + 10 <= roofTop + 15 && this.playerVY >= 0) {
          this.player.y = roofTop - 10;
          this.playerVY = 0;
          this.grounded = true;
          onRoof = true;

          // Score for landing on a new roof
          if (!roof.scored && i !== 0) {
            roof.scored = true;
            this.rooftopsCrossed++;
            this.score += 25;
            audioManager.playSFX('mg_catch');
            uiManager.updateMinigameOverlay({
              score: this.score,
              progress: `${this.rooftopsCrossed} roofs crossed!`,
            });

            // Score popup
            const scorePopup = this.add.text(this.player.x, this.player.y - 15, '+25', {
              fontSize: '14px', color: '#FFD700', fontStyle: 'bold', fontFamily: 'monospace',
            }).setDepth(25).setOrigin(0.5);
            this.tweens.add({
              targets: scorePopup, y: this.player.y - 45, alpha: 0, duration: 600,
              onComplete: () => scorePopup.destroy(),
            });

            // Green flash
            const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x00FF00, 0.1).setDepth(20);
            this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
          }
          this.currentRoofIndex = i;
          break;
        }
      }

      // Obstacle collision
      for (const obs of roof.obstacles) {
        if (!obs.active) continue;
        const dx = Math.abs(this.player.x - obs.x);
        const dy = Math.abs(this.player.y - obs.y);
        if (dx < (obs.width / 2 + 6) && dy < (obs.height / 2 + 8)) {
          // Hit obstacle — respawn on current roof, lose points
          audioManager.playSFX('mg_wrong');
          this.cameras.main.shake(150, 0.008);
          this.respawnOnCurrentRoof();
          this.score = Math.max(0, this.score - 15);
          uiManager.updateMinigameOverlay({ score: this.score });

          const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.15).setDepth(20);
          this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
          return;
        }
      }
    }

    // Fell below screen — respawn
    if (this.player.y > height + 20) {
      audioManager.playSFX('mg_wrong');
      this.respawnOnCurrentRoof();
      this.score = Math.max(0, this.score - 15);
      uiManager.updateMinigameOverlay({ score: this.score });

      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.15).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    }

    // Keep player at a fixed horizontal position (auto-run feel)
    this.player.x = Phaser.Math.Clamp(this.player.x, 80, 120);

    // Cat follows ahead of player, bobbing
    this.catBobTime += 0.08;
    this.cat.x = this.player.x + 80;
    const catRoofY = this.player.y - 2;
    this.cat.y = catRoofY + Math.sin(this.catBobTime) * 3;

    // Spawn new rooftops when needed
    this.spawnRooftopsIfNeeded();

    // Clean up off-screen rooftops
    this.cleanupRooftops();

    // Parallax on skyline
    for (const sr of this.skylineRects) {
      sr.x -= this.scrollSpeed * 0.3;
      if (sr.x < -50) sr.x += width + 100;
    }

    // Slow star drift
    for (const star of this.stars) {
      star.x -= this.scrollSpeed * 0.05;
      if (star.x < -5) star.x += width + 10;
    }
  }

  private scrollWorld(): void {
    for (const roof of this.rooftops) {
      roof.rect.x -= this.scrollSpeed;
      for (const obs of roof.obstacles) {
        obs.x -= this.scrollSpeed;
      }
    }
  }

  private respawnOnCurrentRoof(): void {
    // Find a valid roof to respawn on
    let roof = this.rooftops[this.currentRoofIndex];
    if (!roof || roof.rect.x + roof.rect.width / 2 < 0) {
      // Current roof scrolled away, find the first visible one
      for (const r of this.rooftops) {
        if (r.rect.x + r.rect.width / 2 > 50) {
          roof = r;
          break;
        }
      }
    }
    if (roof) {
      const roofTop = roof.rect.y - roof.rect.height / 2;
      this.player.x = Math.max(roof.rect.x - roof.rect.width / 4, 80);
      this.player.y = roofTop - 10;
      this.playerVY = 0;
      this.grounded = true;
    }
  }

  private spawnRooftopsIfNeeded(): void {
    const { width, height } = this.scale;
    if (this.rooftops.length === 0) return;

    const lastRoof = this.rooftops[this.rooftops.length - 1];
    const lastRight = lastRoof.rect.x + lastRoof.rect.width / 2;

    if (lastRight < width + 100) {
      const gap = Phaser.Math.Between(40, 80);
      const newX = lastRight + gap;
      const newW = Phaser.Math.Between(100, 200);
      // Vary height around a baseline
      const lastTop = lastRoof.rect.y - lastRoof.rect.height / 2;
      const newTopY = Phaser.Math.Clamp(
        lastTop + Phaser.Math.Between(-30, 30),
        height * 0.45,
        height * 0.75,
      );
      this.createRooftop(newX, newTopY, newW);
    }
  }

  private cleanupRooftops(): void {
    for (let i = this.rooftops.length - 1; i >= 0; i--) {
      const roof = this.rooftops[i];
      const rightEdge = roof.rect.x + roof.rect.width / 2;
      if (rightEdge < -50) {
        roof.rect.destroy();
        for (const obs of roof.obstacles) obs.destroy();
        this.rooftops.splice(i, 1);
        // Adjust currentRoofIndex
        if (this.currentRoofIndex >= i) {
          this.currentRoofIndex = Math.max(0, this.currentRoofIndex - 1);
        }
      }
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.countdownTimer.destroy();
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Great Chase!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
