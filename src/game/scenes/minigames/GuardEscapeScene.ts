// src/game/scenes/minigames/GuardEscapeScene.ts
// Dodge parliament guards through a nighttime park for 30 seconds

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const PLAYER_SPEED = 3.0;
const GUARD_SPEED = 1.2;
const MAX_GUARDS = 8;
const GUARD_SPAWN_INTERVAL = 2000;
const SURVIVAL_BONUS_INTERVAL = 5000;
const HIT_PENALTY = 20;
const SURVIVAL_BONUS = 30;
const POWERUP_SLOW_FACTOR = 0.3;
const POWERUP_SLOW_RADIUS = 60;
const POWERUP_DURATION = 3000;
const COLLISION_PADDING = 10;

interface Guard extends Phaser.GameObjects.Rectangle {
  vx: number;
  vy: number;
  slowed: boolean;
}

interface PowerUp extends Phaser.GameObjects.Arc {
  lifetime: number;
  active: boolean;
}

export class GuardEscapeScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private player!: Phaser.GameObjects.Rectangle;
  private guards: Guard[] = [];
  private powerUps: PowerUp[] = [];
  private spawnTimer!: Phaser.Time.TimerEvent;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private survivalTimer!: Phaser.Time.TimerEvent;
  private powerUpTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;
  private timeSinceLastHit = 0;
  private moveTarget: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'GuardEscapeScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.guards = [];
    this.powerUps = [];
    this.gameOver = false;
    this.timeSinceLastHit = 0;
    this.moveTarget = null;
  }

  create(): void {
    const { width, height } = this.scale;

    // --- Park background (dark night scene) ---
    this.add.rectangle(width / 2, height / 2, width, height, 0x2A5A2A);

    // Stone fence border (gray)
    const borderThickness = 8;
    this.add.rectangle(width / 2, borderThickness / 2, width, borderThickness, 0x888888);
    this.add.rectangle(width / 2, height - borderThickness / 2, width, borderThickness, 0x888888);
    this.add.rectangle(borderThickness / 2, height / 2, borderThickness, height, 0x888888);
    this.add.rectangle(width - borderThickness / 2, height / 2, borderThickness, height, 0x888888);

    // Lighter green cross-paths
    const pathWidth = 24;
    this.add.rectangle(width / 2, height / 2, pathWidth, height, 0x3A7A3A); // vertical
    this.add.rectangle(width / 2, height / 2, width, pathWidth, 0x3A7A3A); // horizontal
    // Secondary paths for grid feel
    this.add.rectangle(width * 0.25, height / 2, pathWidth * 0.7, height, 0x3A7A3A, 0.6);
    this.add.rectangle(width * 0.75, height / 2, pathWidth * 0.7, height, 0x3A7A3A, 0.6);
    this.add.rectangle(width / 2, height * 0.3, width, pathWidth * 0.7, 0x3A7A3A, 0.6);
    this.add.rectangle(width / 2, height * 0.7, width, pathWidth * 0.7, 0x3A7A3A, 0.6);

    // Decorative trees (dark green circles)
    const treePositions = [
      { x: width * 0.15, y: height * 0.15 },
      { x: width * 0.85, y: height * 0.15 },
      { x: width * 0.15, y: height * 0.55 },
      { x: width * 0.85, y: height * 0.55 },
      { x: width * 0.4, y: height * 0.42 },
      { x: width * 0.6, y: height * 0.42 },
      { x: width * 0.35, y: height * 0.8 },
      { x: width * 0.65, y: height * 0.2 },
    ];
    for (const t of treePositions) {
      // Tree shadow
      this.add.circle(t.x + 2, t.y + 2, 14, 0x1A3A1A, 0.5);
      // Tree canopy
      this.add.circle(t.x, t.y, 14, 0x1E4D1E).setDepth(1);
      // Slight highlight
      this.add.circle(t.x - 3, t.y - 3, 5, 0x2A6A2A, 0.5).setDepth(1);
    }

    // Subtle lamp posts along the paths (tiny yellow dots for atmosphere)
    const lampPositions = [
      { x: width * 0.5, y: height * 0.15 },
      { x: width * 0.5, y: height * 0.85 },
      { x: width * 0.15, y: height * 0.5 },
      { x: width * 0.85, y: height * 0.5 },
    ];
    for (const l of lampPositions) {
      this.add.circle(l.x, l.y, 3, 0xFFEE88, 0.8).setDepth(1);
      this.add.circle(l.x, l.y, 12, 0xFFFF99, 0.08).setDepth(0); // glow
    }

    // Player — green 16x16 square at center-bottom
    this.player = this.add.rectangle(width / 2, height - 30, 16, 16, 0x44FF44).setDepth(10);

    // Small camera icon on the player (flavor)
    this.add.rectangle(width / 2, height - 30, 6, 4, 0xCCCCCC).setDepth(11);

    // Controls — keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Controls — click/tap to move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveTarget = { x: pointer.x, y: pointer.y };
    });

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    // UI overlay
    uiManager.showMinigameOverlay({
      title: 'Guard Escape!',
      score: 0,
      timer: GAME_DURATION,
      progress: 'Dodge the guards!',
      onExit: () => this.endGame(),
    });

    // Spawn guards every 2 seconds
    this.spawnTimer = this.time.addEvent({
      delay: GUARD_SPAWN_INTERVAL,
      callback: () => this.spawnGuard(),
      loop: true,
    });

    // Countdown timer
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

    // Survival bonus every 5 seconds
    this.survivalTimer = this.time.addEvent({
      delay: SURVIVAL_BONUS_INTERVAL,
      callback: () => this.awardSurvivalBonus(),
      loop: true,
    });

    // Power-up spawner every 6-10 seconds
    this.powerUpTimer = this.time.addEvent({
      delay: 7000,
      callback: () => this.spawnPowerUp(),
      loop: true,
    });

    // Spawn initial guard quickly so it's not boring at start
    this.time.delayedCall(800, () => this.spawnGuard());
  }

  private spawnGuard(): void {
    if (this.gameOver) return;
    if (this.guards.length >= MAX_GUARDS) return;

    const { width, height } = this.scale;
    const edge = Phaser.Math.Between(0, 2); // 0=top, 1=left, 2=right
    let x: number, y: number;

    switch (edge) {
      case 0: // top
        x = Phaser.Math.Between(20, width - 20);
        y = -10;
        break;
      case 1: // left
        x = -10;
        y = Phaser.Math.Between(20, height * 0.6);
        break;
      case 2: // right
        x = width + 10;
        y = Phaser.Math.Between(20, height * 0.6);
        break;
      default:
        x = width / 2;
        y = -10;
    }

    const guard = this.add.rectangle(x, y, 18, 18, 0xDD3333).setDepth(8) as Guard;
    guard.vx = 0;
    guard.vy = 0;
    guard.slowed = false;

    // Add a small dark hat detail on the guard
    const hat = this.add.rectangle(x, y - 6, 10, 4, 0x222222).setDepth(9);
    // Attach hat to guard via update (we'll move it in update loop)
    (guard as any)._hat = hat;

    this.guards.push(guard);
  }

  private spawnPowerUp(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;

    // Don't spawn too many
    const activePowerUps = this.powerUps.filter(p => p.active);
    if (activePowerUps.length >= 2) return;

    const x = Phaser.Math.Between(40, width - 40);
    const y = Phaser.Math.Between(40, height - 60);

    const powerUp = this.add.circle(x, y, 10, 0xFFDD44, 0.8).setDepth(6) as PowerUp;
    powerUp.lifetime = POWERUP_DURATION;
    powerUp.active = true;

    // Pulsing animation
    this.tweens.add({
      targets: powerUp,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Label
    const label = this.add.text(x, y - 16, 'Crowd', {
      fontSize: '8px',
      color: '#FFDD44',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(6);
    (powerUp as any)._label = label;

    this.powerUps.push(powerUp);

    // Auto-remove after duration
    this.time.delayedCall(POWERUP_DURATION, () => {
      if (powerUp.active) {
        powerUp.active = false;
        powerUp.destroy();
        label.destroy();
      }
    });
  }

  private awardSurvivalBonus(): void {
    if (this.gameOver) return;

    this.timeSinceLastHit += SURVIVAL_BONUS_INTERVAL;

    if (this.timeSinceLastHit >= SURVIVAL_BONUS_INTERVAL) {
      this.score += SURVIVAL_BONUS;
      uiManager.updateMinigameOverlay({ score: this.score });

      // "Safe!" flash text
      const safeText = this.add.text(this.player.x, this.player.y - 24, 'Safe! +30', {
        fontSize: '12px',
        color: '#44FF44',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(20);

      this.tweens.add({
        targets: safeText,
        y: safeText.y - 20,
        alpha: 0,
        duration: 800,
        onComplete: () => safeText.destroy(),
      });

      // Brief green border flash
      const flash = this.add.rectangle(
        this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height, 0x00FF00, 0.08
      ).setDepth(19);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        onComplete: () => flash.destroy(),
      });
    }
  }

  private handleHit(): void {
    const { width, height } = this.scale;
    audioManager.playSFX('mg_wrong');
    this.cameras.main.shake(150, 0.008);

    // Penalty
    this.score = Math.max(0, this.score - HIT_PENALTY);
    uiManager.updateMinigameOverlay({ score: this.score, progress: 'Caught! Keep dodging!' });

    // Reset survival timer tracking
    this.timeSinceLastHit = 0;

    // Red flash
    const flash = this.add.rectangle(
      width / 2, height / 2, width, height, 0xFF0000, 0.25
    ).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // "Caught!" text
    const caughtText = this.add.text(this.player.x, this.player.y - 20, 'Caught! -20', {
      fontSize: '11px',
      color: '#FF4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.tweens.add({
      targets: caughtText,
      y: caughtText.y - 18,
      alpha: 0,
      duration: 600,
      onComplete: () => caughtText.destroy(),
    });

    // Respawn player at bottom center
    this.player.x = width / 2;
    this.player.y = height - 30;
    this.moveTarget = null;
  }

  private checkCollision(guard: Guard): boolean {
    const dx = Math.abs(guard.x - this.player.x);
    const dy = Math.abs(guard.y - this.player.y);
    const combinedHalfW = (guard.width / 2 + this.player.width / 2) - COLLISION_PADDING;
    const combinedHalfH = (guard.height / 2 + this.player.height / 2) - COLLISION_PADDING;
    return dx < combinedHalfW && dy < combinedHalfH;
  }

  update(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;

    // --- Player movement via keyboard ---
    if (this.cursors) {
      if (this.cursors.left.isDown) this.player.x -= PLAYER_SPEED;
      if (this.cursors.right.isDown) this.player.x += PLAYER_SPEED;
      if (this.cursors.up.isDown) this.player.y -= PLAYER_SPEED;
      if (this.cursors.down.isDown) this.player.y += PLAYER_SPEED;
    }

    // --- Player movement via click/tap target ---
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x;
      const dy = this.moveTarget.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > PLAYER_SPEED) {
        this.player.x += (dx / dist) * PLAYER_SPEED;
        this.player.y += (dy / dist) * PLAYER_SPEED;
      } else {
        this.player.x = this.moveTarget.x;
        this.player.y = this.moveTarget.y;
        this.moveTarget = null;
      }
    }

    // Clamp player within borders
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, width - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, height - 16);

    // --- Check power-up pickups ---
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      const dx = pu.x - this.player.x;
      const dy = pu.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        // Activate: slow nearby guards
        audioManager.playSFX('mg_catch');
        for (const g of this.guards) {
          const gx = g.x - pu.x;
          const gy = g.y - pu.y;
          if (Math.sqrt(gx * gx + gy * gy) < POWERUP_SLOW_RADIUS) {
            g.slowed = true;
            g.setFillStyle(0xFF8888); // lighter red when slowed
            // Reset after a bit
            this.time.delayedCall(2500, () => {
              if (g && g.active) {
                g.slowed = false;
                g.setFillStyle(0xDD3333);
              }
            });
          }
        }

        // Burst effect
        const burst = this.add.circle(pu.x, pu.y, POWERUP_SLOW_RADIUS, 0xFFFF00, 0.2).setDepth(15);
        this.tweens.add({
          targets: burst,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 500,
          onComplete: () => burst.destroy(),
        });

        // Remove power-up
        pu.active = false;
        const label = (pu as any)._label;
        if (label) label.destroy();
        pu.destroy();
      }
    }

    // --- Move guards toward player ---
    for (let i = this.guards.length - 1; i >= 0; i--) {
      const g = this.guards[i];
      if (!g.active) {
        this.guards.splice(i, 1);
        continue;
      }

      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const speed = g.slowed ? GUARD_SPEED * POWERUP_SLOW_FACTOR : GUARD_SPEED;
        g.vx = (dx / dist) * speed;
        g.vy = (dy / dist) * speed;
      }

      g.x += g.vx;
      g.y += g.vy;

      // Move hat with guard
      const hat = (g as any)._hat as Phaser.GameObjects.Rectangle;
      if (hat && hat.active) {
        hat.x = g.x;
        hat.y = g.y - 6;
      }

      // Remove if way off-screen (shouldn't happen often since they track player)
      if (g.x < -60 || g.x > width + 60 || g.y < -60 || g.y > height + 60) {
        const hat2 = (g as any)._hat;
        if (hat2) hat2.destroy();
        g.destroy();
        this.guards.splice(i, 1);
        continue;
      }

      // Collision check
      if (this.checkCollision(g)) {
        this.handleHit();
        break; // Only one hit per frame
      }
    }

    // Clean up inactive power-ups from array
    this.powerUps = this.powerUps.filter(p => p.active);
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    this.spawnTimer.destroy();
    this.countdownTimer.destroy();
    this.survivalTimer.destroy();
    this.powerUpTimer.destroy();

    // Clean up guards
    for (const g of this.guards) {
      const hat = (g as any)._hat;
      if (hat && hat.active) hat.destroy();
      g.destroy();
    }
    this.guards = [];

    // Clean up power-ups
    for (const pu of this.powerUps) {
      const label = (pu as any)._label;
      if (label && label.active) label.destroy();
      if (pu.active) pu.destroy();
    }
    this.powerUps = [];

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Escaped!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
