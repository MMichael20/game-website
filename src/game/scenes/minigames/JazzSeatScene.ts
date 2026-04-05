// src/game/scenes/minigames/JazzSeatScene.ts
// Navigate a packed Budapest jazz club to find the empty seat before time runs out!

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const TOTAL_ROUNDS = 5;
const ROUND_TIMES = [6, 5.5, 5, 4.5, 4];
const PLAYER_SPEED = 2.5;
const WAITER_COUNT = 4;
const TABLE_COUNT = 12;
const TABLE_RADIUS = 20;
const DANCING_COUPLE_COUNT = 3;

interface Waiter {
  sprite: Phaser.GameObjects.Rectangle;
  pathStart: number;
  pathEnd: number;
  speed: number;
  horizontal: boolean;
  dir: number;
}

interface DancingCouple {
  spriteA: Phaser.GameObjects.Rectangle;
  spriteB: Phaser.GameObjects.Rectangle;
  centerX: number;
  centerY: number;
  angle: number;
  radius: number;
  speed: number;
}

interface Table {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
}

export class JazzSeatScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private round = 0;
  private timeLeft = 0;
  private gameOver = false;

  private player!: Phaser.GameObjects.Rectangle;
  private seatTarget!: Phaser.GameObjects.Rectangle;
  private seatGlow!: Phaser.GameObjects.Rectangle;

  private tables: Table[] = [];
  private waiters: Waiter[] = [];
  private dancingCouples: DancingCouple[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private targetPointer: { x: number; y: number } | null = null;

  private bouncing = false;
  private spotlights: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: 'JazzSeatScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.round = 0;
    this.timeLeft = 0;
    this.gameOver = false;
    this.tables = [];
    this.waiters = [];
    this.dancingCouples = [];
    this.targetPointer = null;
    this.bouncing = false;
    this.spotlights = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // --- Jazz club background ---
    // Dark wooden floor
    this.add.rectangle(width / 2, height / 2, width, height, 0x3A2A1A);

    // Stage area at top
    this.add.rectangle(width / 2, 30, width, 60, 0x2A1A0A);

    // Stage edge accent
    this.add.rectangle(width / 2, 60, width, 3, 0x8B7355, 0.6);

    // Colored spotlights on stage
    const spotColors = [0xFF4466, 0x4488FF, 0xFFAA22, 0x44FF88, 0xFF44FF];
    for (let i = 0; i < spotColors.length; i++) {
      const sx = 50 + i * ((width - 100) / (spotColors.length - 1));
      const spot = this.add.circle(sx, 25, 8, spotColors[i], 0.7).setDepth(1);
      this.spotlights.push(spot);

      // Spotlight cone (subtle glow on floor)
      const cone = this.add.circle(sx, 55, 18, spotColors[i], 0.1).setDepth(0);
      this.tweens.add({
        targets: [spot, cone],
        alpha: { from: 0.4, to: 0.9 },
        duration: 800 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // --- Occupied tables ---
    this.createTables(width, height);

    // --- Wandering waiters ---
    this.createWaiters(width, height);

    // --- Dancing couples ---
    this.createDancingCouples(width, height);

    // --- Player ---
    this.player = this.add.rectangle(width / 2, height - 30, 14, 14, 0x44FF44).setDepth(10);

    // Player glow
    const playerGlow = this.add.rectangle(width / 2, height - 30, 18, 18, 0x44FF44, 0.3).setDepth(9);
    this.tweens.add({
      targets: playerGlow,
      alpha: { from: 0.15, to: 0.4 },
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
    // Keep glow following player
    this.events.on('update', () => {
      playerGlow.x = this.player.x;
      playerGlow.y = this.player.y;
    });

    // --- Seat target (created hidden, positioned each round) ---
    this.seatGlow = this.add.rectangle(0, 0, 22, 22, 0xFFDD44, 0.3).setDepth(4).setVisible(false);
    this.seatTarget = this.add.rectangle(0, 0, 16, 16, 0xFFDD44).setDepth(5).setVisible(false);

    // Pulsing animation on seat
    this.tweens.add({
      targets: this.seatTarget,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.seatGlow,
      scaleX: { from: 1, to: 1.6 },
      scaleY: { from: 1, to: 1.6 },
      alpha: { from: 0.3, to: 0.05 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Controls ---
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.targetPointer = { x: pointer.x, y: pointer.y };
    });

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    // --- UI overlay ---
    uiManager.showMinigameOverlay({
      title: 'Find Your Seat!',
      score: 0,
      timer: ROUND_TIMES[0],
      progress: 'Round 1/5',
      onExit: () => this.endGame(),
    });

    // Start first round
    this.startRound();
  }

  private createTables(width: number, height: number): void {
    // Place tables in a grid-like pattern with some randomness, avoiding stage and bottom row
    const margin = 40;
    const startY = 80;
    const endY = height - 60;
    const cols = 4;
    const rows = 3;
    const cellW = (width - margin * 2) / cols;
    const cellH = (endY - startY) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.tables.length >= TABLE_COUNT) break;
        const baseX = margin + c * cellW + cellW / 2;
        const baseY = startY + r * cellH + cellH / 2;
        // Jitter position slightly
        const tx = baseX + (Math.random() - 0.5) * cellW * 0.4;
        const ty = baseY + (Math.random() - 0.5) * cellH * 0.3;

        const table = this.add.circle(tx, ty, TABLE_RADIUS, 0x6A4A2A).setDepth(2);

        // Table highlight (subtle rim)
        this.add.circle(tx, ty, TABLE_RADIUS + 1, 0x8B6B4A, 0.3).setDepth(1);

        // Small "people" silhouettes at tables (occupied seats)
        const seatAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        for (const angle of seatAngles) {
          if (Math.random() > 0.6) continue; // Not every seat occupied
          const sx = tx + Math.cos(angle) * (TABLE_RADIUS + 8);
          const sy = ty + Math.sin(angle) * (TABLE_RADIUS + 8);
          this.add.rectangle(sx, sy, 8, 8, 0x776655, 0.6).setDepth(2);
        }

        this.tables.push({ sprite: table, x: tx, y: ty });
      }
    }
  }

  private createWaiters(width: number, height: number): void {
    for (let i = 0; i < WAITER_COUNT; i++) {
      const horizontal = i % 2 === 0;
      let startVal: number, endVal: number, fixedVal: number;

      if (horizontal) {
        startVal = 20;
        endVal = width - 20;
        fixedVal = 90 + i * ((height - 140) / WAITER_COUNT);
      } else {
        startVal = 80;
        endVal = height - 40;
        fixedVal = 40 + i * ((width - 80) / WAITER_COUNT);
      }

      const x = horizontal ? startVal : fixedVal;
      const y = horizontal ? fixedVal : startVal;
      const sprite = this.add.rectangle(x, y, 12, 12, 0xFFFFFF).setDepth(8);

      // Small tray detail on waiter
      this.add.rectangle(x, y - 3, 8, 2, 0xCCCCCC).setDepth(8);

      this.waiters.push({
        sprite,
        pathStart: startVal,
        pathEnd: endVal,
        speed: 1.0 + Math.random() * 0.5,
        horizontal,
        dir: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  private createDancingCouples(width: number, height: number): void {
    const positions = [
      { x: width * 0.2, y: height * 0.35 },
      { x: width * 0.75, y: height * 0.5 },
      { x: width * 0.5, y: height * 0.7 },
    ];

    for (let i = 0; i < DANCING_COUPLE_COUNT; i++) {
      const pos = positions[i];
      // Make sure couple isn't overlapping a table
      const cx = pos.x + (Math.random() - 0.5) * 30;
      const cy = pos.y + (Math.random() - 0.5) * 20;

      const spriteA = this.add.rectangle(cx, cy, 10, 10, 0xFF88AA).setDepth(7);
      const spriteB = this.add.rectangle(cx + 12, cy, 10, 10, 0xFF88AA).setDepth(7);

      this.dancingCouples.push({
        spriteA,
        spriteB,
        centerX: cx,
        centerY: cy,
        angle: Math.random() * Math.PI * 2,
        radius: 10 + Math.random() * 6,
        speed: 0.02 + Math.random() * 0.015,
      });
    }
  }

  private startRound(): void {
    if (this.round >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    this.timeLeft = ROUND_TIMES[this.round];

    uiManager.updateMinigameOverlay({
      timer: this.timeLeft,
      progress: `Round ${this.round + 1}/${TOTAL_ROUNDS}`,
    });

    // Place seat at a random clear position
    const pos = this.findClearPosition();
    this.seatTarget.setPosition(pos.x, pos.y).setVisible(true);
    this.seatGlow.setPosition(pos.x, pos.y).setVisible(true);

    // Brief flash to draw attention to the seat
    const arrow = this.add.rectangle(pos.x, pos.y - 25, 4, 16, 0xFFDD44).setDepth(15);
    this.tweens.add({
      targets: arrow,
      alpha: { from: 1, to: 0 },
      y: pos.y - 15,
      duration: 800,
      onComplete: () => arrow.destroy(),
    });

    // Start round countdown (use 0.5s ticks for smoother timer with decimal times)
    if (this.countdownTimer) this.countdownTimer.destroy();
    this.countdownTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.timeLeft -= 0.5;
        uiManager.updateMinigameOverlay({ timer: Math.max(0, Math.ceil(this.timeLeft * 10) / 10) });

        if (this.timeLeft <= 0) {
          this.roundFailed();
        }
      },
      loop: true,
    });
  }

  private findClearPosition(): { x: number; y: number } {
    const { width, height } = this.scale;
    const margin = 30;
    const minY = 75; // Below stage
    const maxY = height - 30;

    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Phaser.Math.Between(margin, width - margin);
      const y = Phaser.Math.Between(minY, maxY);

      // Check against tables
      let clear = true;
      for (const table of this.tables) {
        const dist = Phaser.Math.Distance.Between(x, y, table.x, table.y);
        if (dist < TABLE_RADIUS + 20) {
          clear = false;
          break;
        }
      }

      // Check not too close to player start
      if (clear) {
        const playerDist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (playerDist < 60) clear = false;
      }

      if (clear) return { x, y };
    }

    // Fallback — center area
    return { x: width / 2, y: height / 2 };
  }

  private roundFailed(): void {
    if (this.gameOver) return;

    // Red flash for time out
    const { width, height } = this.scale;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.2).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    this.seatTarget.setVisible(false);
    this.seatGlow.setVisible(false);

    this.round++;
    if (this.round >= TOTAL_ROUNDS) {
      this.time.delayedCall(500, () => this.endGame());
    } else {
      this.time.delayedCall(600, () => this.startRound());
    }
  }

  private seatFound(): void {
    if (this.gameOver) return;
    audioManager.playSFX('mg_correct');

    // Score: base 100 + time bonus
    const timeBonus = Math.floor(this.timeLeft * 20);
    this.score += 100 + timeBonus;

    uiManager.updateMinigameOverlay({ score: this.score });

    // Green flash
    const { width, height } = this.scale;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x00FF00, 0.15).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    // Brief celebration particles around seat
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = this.seatTarget.x + Math.cos(angle) * 5;
      const py = this.seatTarget.y + Math.sin(angle) * 5;
      const particle = this.add.rectangle(px, py, 4, 4, 0xFFDD44).setDepth(20);
      this.tweens.add({
        targets: particle,
        x: px + Math.cos(angle) * 25,
        y: py + Math.sin(angle) * 25,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }

    this.seatTarget.setVisible(false);
    this.seatGlow.setVisible(false);

    if (this.countdownTimer) this.countdownTimer.destroy();

    this.round++;
    if (this.round >= TOTAL_ROUNDS) {
      this.time.delayedCall(600, () => this.endGame());
    } else {
      this.time.delayedCall(600, () => this.startRound());
    }
  }

  update(): void {
    if (this.gameOver) return;

    this.updatePlayer();
    this.updateWaiters();
    this.updateDancingCouples();
    this.checkSeatCollision();
    this.checkWaiterCollision();
  }

  private updatePlayer(): void {
    const { width, height } = this.scale;
    let dx = 0;
    let dy = 0;

    // Keyboard input
    if (this.cursors) {
      if (this.cursors.left.isDown) dx -= PLAYER_SPEED;
      if (this.cursors.right.isDown) dx += PLAYER_SPEED;
      if (this.cursors.up.isDown) dy -= PLAYER_SPEED;
      if (this.cursors.down.isDown) dy += PLAYER_SPEED;
    }

    // Tap/click move toward pointer
    if (this.targetPointer && dx === 0 && dy === 0) {
      const pdx = this.targetPointer.x - this.player.x;
      const pdy = this.targetPointer.y - this.player.y;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (dist > 5) {
        dx = (pdx / dist) * PLAYER_SPEED;
        dy = (pdy / dist) * PLAYER_SPEED;
      } else {
        this.targetPointer = null;
      }
    }

    if (this.bouncing) return;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * PLAYER_SPEED;
      dy = (dy / len) * PLAYER_SPEED;
    }

    // Apply movement
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    // Table collision check — don't walk through tables
    let blocked = false;
    for (const table of this.tables) {
      const dist = Phaser.Math.Distance.Between(newX, newY, table.x, table.y);
      if (dist < TABLE_RADIUS + 8) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      this.player.x = Phaser.Math.Clamp(newX, 10, width - 10);
      this.player.y = Phaser.Math.Clamp(newY, 70, height - 10);
    }
  }

  private updateWaiters(): void {
    for (const waiter of this.waiters) {
      if (waiter.horizontal) {
        waiter.sprite.x += waiter.speed * waiter.dir;
        if (waiter.sprite.x >= waiter.pathEnd || waiter.sprite.x <= waiter.pathStart) {
          waiter.dir *= -1;
        }
      } else {
        waiter.sprite.y += waiter.speed * waiter.dir;
        if (waiter.sprite.y >= waiter.pathEnd || waiter.sprite.y <= waiter.pathStart) {
          waiter.dir *= -1;
        }
      }
    }
  }

  private updateDancingCouples(): void {
    for (const couple of this.dancingCouples) {
      couple.angle += couple.speed;
      couple.spriteA.x = couple.centerX + Math.cos(couple.angle) * couple.radius;
      couple.spriteA.y = couple.centerY + Math.sin(couple.angle) * couple.radius;
      couple.spriteB.x = couple.centerX + Math.cos(couple.angle + Math.PI) * couple.radius;
      couple.spriteB.y = couple.centerY + Math.sin(couple.angle + Math.PI) * couple.radius;
    }
  }

  private checkSeatCollision(): void {
    if (!this.seatTarget.visible) return;

    const dx = Math.abs(this.player.x - this.seatTarget.x);
    const dy = Math.abs(this.player.y - this.seatTarget.y);

    if (dx < 14 && dy < 14) {
      if (this.countdownTimer) this.countdownTimer.destroy();
      this.seatFound();
    }
  }

  private checkWaiterCollision(): void {
    if (this.bouncing) return;

    for (const waiter of this.waiters) {
      const dx = Math.abs(this.player.x - waiter.sprite.x);
      const dy = Math.abs(this.player.y - waiter.sprite.y);

      if (dx < 13 && dy < 13) {
        // Bounce player away from waiter
        this.bouncing = true;
        this.targetPointer = null;

        const angle = Phaser.Math.Angle.Between(waiter.sprite.x, waiter.sprite.y, this.player.x, this.player.y);
        const bounceX = this.player.x + Math.cos(angle) * 30;
        const bounceY = this.player.y + Math.sin(angle) * 30;

        const { width, height } = this.scale;

        this.tweens.add({
          targets: this.player,
          x: Phaser.Math.Clamp(bounceX, 10, width - 10),
          y: Phaser.Math.Clamp(bounceY, 70, height - 10),
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.bouncing = false;
          },
        });

        // Time penalty
        audioManager.playSFX('mg_wrong');
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        uiManager.updateMinigameOverlay({ timer: Math.max(0, Math.ceil(this.timeLeft * 10) / 10) });

        // Red flash
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF4444, 0.15).setDepth(20);
        this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });

        // Brief white flash on player
        this.player.setFillStyle(0xFFFFFF);
        this.time.delayedCall(150, () => {
          if (!this.gameOver) this.player.setFillStyle(0x44FF44);
        });

        break;
      }
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    if (this.countdownTimer) this.countdownTimer.destroy();
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Seated!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
