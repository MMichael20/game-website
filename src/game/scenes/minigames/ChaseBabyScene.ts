// src/game/scenes/minigames/ChaseBabyScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

const CHASE_DURATION = 45;
const BABY_BASE_SPEED = 80;
const BABY_MAX_SPEED = 140;
const PLAYER_SPEED = 100;
const CATCH_RADIUS = 24;
const DODGE_RADIUS = 60;
const CATCHES_NEEDED = 3;
const SOOTHE_BEATS = 8;
const SOOTHE_INTERVAL = 800;
const GOOD_WINDOW = 300;
const PERFECT_WINDOW = 100;

interface ReturnData {
  returnScene?: string;
  returnX?: number;
  returnY?: number;
}

export class ChaseBabyScene extends Phaser.Scene {
  private phase: 'chase' | 'soothe' = 'chase';
  private score = 0;
  private catches = 0;
  private timeLeft = CHASE_DURATION;
  private gameOver = false;
  private returnData: ReturnData = {};

  // Chase phase
  private playerSprite!: Phaser.GameObjects.Arc;
  private babySprite!: Phaser.GameObjects.Sprite;
  private babyVelX = 0;
  private babyVelY = 0;
  private babySpeed = BABY_BASE_SPEED;
  private directionTimer = 0;
  private nextDirectionChange = 1000;
  private catching = false;
  private catchTimer = 0;
  private speedUpTimer = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private dustParticles: Phaser.GameObjects.Arc[] = [];
  private tearParticles: Phaser.GameObjects.Arc[] = [];

  // Soothe phase
  private sootheCircle!: Phaser.GameObjects.Sprite;
  private sootheBeat = 0;
  private sootheHits = 0;
  private soothePerfects = 0;
  private sootheActive = false;
  private soothePulseTime = 0;
  private sootheTimer!: Phaser.Time.TimerEvent;
  private babySleepSprite!: Phaser.GameObjects.Sprite;

  // Arena bounds
  private arenaLeft = 40;
  private arenaRight = 760;
  private arenaTop = 60;
  private arenaBottom = 560;

  // Touch/click movement target
  private moveTarget: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'ChaseBabyScene' });
  }

  init(data: ReturnData): void {
    this.returnData = data;
    this.phase = 'chase';
    this.score = 0;
    this.catches = 0;
    this.timeLeft = CHASE_DURATION;
    this.gameOver = false;
    this.babySpeed = BABY_BASE_SPEED;
    this.catching = false;
    this.catchTimer = 0;
    this.speedUpTimer = 0;
    this.directionTimer = 0;
    this.dustParticles = [];
    this.tearParticles = [];
    this.sootheBeat = 0;
    this.sootheHits = 0;
    this.soothePerfects = 0;
    this.sootheActive = false;
    this.moveTarget = null;
  }

  create(): void {
    const { width, height } = this.scale;
    this.arenaRight = width - 40;
    this.arenaBottom = height - 40;

    // Wood floor background
    this.add.rectangle(width / 2, height / 2, width, height, 0xc4956a);
    // Floor grain lines
    for (let y = 0; y < height; y += 24) {
      this.add.rectangle(width / 2, y, width, 1, 0xb8875c);
    }

    // Walls
    this.add.rectangle(width / 2, 30, width, 60, 0x8b6914);  // top
    this.add.rectangle(width / 2, height - 20, width, 40, 0x8b6914);  // bottom
    this.add.rectangle(20, height / 2, 40, height, 0x8b6914);  // left
    this.add.rectangle(width - 20, height / 2, 40, height, 0x8b6914);  // right

    // Player circle (blue)
    this.playerSprite = this.add.circle(width / 2, height - 100, 14, 0x3366ff);
    this.playerSprite.setDepth(10);
    // Player head
    this.add.circle(width / 2, height - 100, 8, 0xf5deb3).setDepth(11);

    // Baby sprite
    this.babySprite = this.add.sprite(width / 2, height / 3, 'chase-baby-run');
    this.babySprite.setDisplaySize(36, 36);
    this.babySprite.setDepth(10);

    // Pick random initial direction
    this.pickNewDirection();

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };
    }

    // Click/tap to move (mobile support)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase === 'chase' && !this.gameOver) {
        this.moveTarget = { x: pointer.x, y: pointer.y };
      } else if (this.phase === 'soothe') {
        this.onSootheTap();
      }
    });

    // Keyboard tap for soothe phase
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.phase === 'soothe' && !this.gameOver) {
          this.onSootheTap();
        }
      });
      this.input.keyboard.on('keydown-E', () => {
        if (this.phase === 'soothe' && !this.gameOver) {
          this.onSootheTap();
        }
      });
    }

    // Overlay
    uiManager.showMinigameOverlay({
      title: 'Chase the Baby!',
      score: 0,
      timer: CHASE_DURATION,
      progress: `Catches: 0/${CATCHES_NEEDED}`,
    });

    // Countdown timer
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.phase !== 'chase') return;
        this.timeLeft--;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft <= 0) {
          this.endGame('lose');
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    if (this.phase === 'chase') {
      this.updateChase(delta);
    }
    // Soothe phase is event-driven (timers + taps)
  }

  private updateChase(delta: number): void {
    if (this.catching) {
      this.catchTimer -= delta;
      if (this.catchTimer <= 0) {
        this.catching = false;
        if (this.catches < CATCHES_NEEDED) {
          // Baby wriggles free — speed boost
          this.babySpeed = Math.min(BABY_MAX_SPEED, this.babySpeed + 15);
          this.pickNewDirection();
        }
      }
      return;
    }

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // --- Player movement ---
    let pdx = 0;
    let pdy = 0;

    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) pdx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) pdx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) pdy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) pdy += 1;
    }

    // If keyboard input, cancel touch target
    if (pdx !== 0 || pdy !== 0) {
      this.moveTarget = null;
    }

    // Touch/click movement
    if (this.moveTarget && pdx === 0 && pdy === 0) {
      const tdx = this.moveTarget.x - this.playerSprite.x;
      const tdy = this.moveTarget.y - this.playerSprite.y;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist > 5) {
        pdx = tdx / dist;
        pdy = tdy / dist;
      } else {
        this.moveTarget = null;
      }
    }

    // Normalize diagonal
    if (pdx !== 0 && pdy !== 0) {
      const len = Math.sqrt(pdx * pdx + pdy * pdy);
      pdx /= len;
      pdy /= len;
    }

    this.playerSprite.x = Phaser.Math.Clamp(
      this.playerSprite.x + pdx * PLAYER_SPEED * dt,
      this.arenaLeft, this.arenaRight
    );
    this.playerSprite.y = Phaser.Math.Clamp(
      this.playerSprite.y + pdy * PLAYER_SPEED * dt,
      this.arenaTop, this.arenaBottom
    );

    // Update player head position
    const head = this.children.list.find(
      c => c !== this.playerSprite && c instanceof Phaser.GameObjects.Arc && (c as Phaser.GameObjects.Arc).radius === 8
    ) as Phaser.GameObjects.Arc | undefined;
    if (head) {
      head.x = this.playerSprite.x;
      head.y = this.playerSprite.y;
    }

    // --- Baby AI ---
    this.directionTimer -= delta;
    this.speedUpTimer += delta;

    // Speed up every 8 seconds
    if (this.speedUpTimer >= 8000) {
      this.speedUpTimer -= 8000;
      this.babySpeed = Math.min(BABY_MAX_SPEED, this.babySpeed * 1.1);
    }

    // Change direction periodically
    if (this.directionTimer <= 0) {
      this.pickNewDirection();
    }

    // Dodge behavior: if player gets close, burst away
    const distToPlayer = Phaser.Math.Distance.Between(
      this.babySprite.x, this.babySprite.y,
      this.playerSprite.x, this.playerSprite.y
    );

    if (distToPlayer < DODGE_RADIUS) {
      const awayX = this.babySprite.x - this.playerSprite.x;
      const awayY = this.babySprite.y - this.playerSprite.y;
      const awayLen = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
      this.babyVelX = (awayX / awayLen) * this.babySpeed * 1.4;
      this.babyVelY = (awayY / awayLen) * this.babySpeed * 1.4;
      this.directionTimer = 300; // Short burst before next direction change
      this.spawnDust(this.babySprite.x, this.babySprite.y);
    }

    // Move baby
    let newBabyX = this.babySprite.x + this.babyVelX * dt;
    let newBabyY = this.babySprite.y + this.babyVelY * dt;

    // Bounce off walls
    if (newBabyX < this.arenaLeft || newBabyX > this.arenaRight) {
      this.babyVelX *= -1;
      newBabyX = Phaser.Math.Clamp(newBabyX, this.arenaLeft, this.arenaRight);
      this.spawnDust(newBabyX, newBabyY);
    }
    if (newBabyY < this.arenaTop || newBabyY > this.arenaBottom) {
      this.babyVelY *= -1;
      newBabyY = Phaser.Math.Clamp(newBabyY, this.arenaTop, this.arenaBottom);
      this.spawnDust(newBabyX, newBabyY);
    }

    this.babySprite.x = newBabyX;
    this.babySprite.y = newBabyY;

    // Flip sprite based on horizontal direction
    this.babySprite.setFlipX(this.babyVelX < 0);

    // Spawn tear particles
    this.updateTears(delta);

    // --- Catch check ---
    if (distToPlayer < CATCH_RADIUS) {
      this.onCatch();
    }
  }

  private pickNewDirection(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.babyVelX = Math.cos(angle) * this.babySpeed;
    this.babyVelY = Math.sin(angle) * this.babySpeed;
    this.nextDirectionChange = Phaser.Math.Between(800, 1500);
    this.directionTimer = this.nextDirectionChange;
  }

  private onCatch(): void {
    this.catches++;
    this.catching = true;

    // Score for catching
    const catchPoints = this.catches * 100; // 100, 200, 300
    this.score += catchPoints;
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `Catches: ${this.catches}/${CATCHES_NEEDED}`,
    });

    // Flash effect on catch
    this.cameras.main.flash(200, 255, 255, 100);

    // Shake animation on baby
    this.tweens.add({
      targets: this.babySprite,
      x: this.babySprite.x + 4,
      duration: 50,
      yoyo: true,
      repeat: 5,
    });

    if (this.catches >= CATCHES_NEEDED) {
      // Add time bonus
      this.score += Math.max(0, (CHASE_DURATION - (CHASE_DURATION - this.timeLeft)) * 10);
      this.catchTimer = 600;
      this.time.delayedCall(600, () => {
        this.startSoothePhase();
      });
    } else {
      this.catchTimer = 500; // Baby wriggles free after 0.5s
    }
  }

  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const dust = this.add.circle(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(2, 4),
        0xd2b48c,
        0.6
      );
      dust.setDepth(5);
      this.dustParticles.push(dust);
      this.tweens.add({
        targets: dust,
        alpha: 0,
        scale: 2,
        y: dust.y - 10,
        duration: 400,
        onComplete: () => {
          const idx = this.dustParticles.indexOf(dust);
          if (idx !== -1) this.dustParticles.splice(idx, 1);
          dust.destroy();
        },
      });
    }
  }

  private tearTimer = 0;

  private updateTears(delta: number): void {
    if (this.phase !== 'chase' || this.catching) return;
    this.tearTimer += delta;
    if (this.tearTimer >= 300) {
      this.tearTimer -= 300;
      // Spawn a tear drop
      const tear = this.add.circle(
        this.babySprite.x + Phaser.Math.Between(-6, 6),
        this.babySprite.y - 8,
        2,
        0x66ccff,
        0.8
      );
      tear.setDepth(15);
      this.tearParticles.push(tear);
      this.tweens.add({
        targets: tear,
        y: tear.y + 12,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          const idx = this.tearParticles.indexOf(tear);
          if (idx !== -1) this.tearParticles.splice(idx, 1);
          tear.destroy();
        },
      });
    }
  }

  // --- Soothe Phase ---

  private startSoothePhase(): void {
    this.phase = 'soothe';
    this.sootheBeat = 0;
    this.sootheHits = 0;
    this.soothePerfects = 0;

    // Stop chase timer
    this.countdownTimer.destroy();

    // Clear move target
    this.moveTarget = null;

    // Clean up tears and dust
    for (const t of [...this.tearParticles]) t.destroy();
    this.tearParticles = [];
    for (const d of [...this.dustParticles]) d.destroy();
    this.dustParticles = [];

    // Hide player head
    const head = this.children.list.find(
      c => c !== this.playerSprite && c instanceof Phaser.GameObjects.Arc && (c as Phaser.GameObjects.Arc).radius === 8
    ) as Phaser.GameObjects.Arc | undefined;
    if (head) head.setVisible(false);
    this.playerSprite.setVisible(false);

    const { width, height } = this.scale;

    // Center baby
    this.babySprite.x = width / 2;
    this.babySprite.y = height / 2 - 20;

    // Soothe circle (rhythm target)
    this.sootheCircle = this.add.sprite(width / 2, height / 2 + 60, 'chase-soothe-circle');
    this.sootheCircle.setDisplaySize(64, 64);
    this.sootheCircle.setAlpha(0);
    this.sootheCircle.setDepth(20);

    // Instructions text
    const instrText = this.add.text(width / 2, height - 60,
      'Tap/click or press SPACE when the circle pulses!',
      { fontSize: '14px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(20);

    // Update overlay
    uiManager.updateMinigameOverlay({
      title: 'Soothe the Baby!',
      progress: `Beats: 0/${SOOTHE_BEATS}`,
    });
    uiManager.updateMinigameOverlay({ timer: undefined });

    // Start beat timer after brief delay
    this.time.delayedCall(1000, () => {
      instrText.destroy();
      this.sootheTimer = this.time.addEvent({
        delay: SOOTHE_INTERVAL,
        callback: () => this.onSootheBeat(),
        callbackScope: this,
        loop: true,
      });
    });
  }

  private onSootheBeat(): void {
    if (this.gameOver) return;
    this.sootheBeat++;

    // Show pulse
    this.sootheActive = true;
    this.soothePulseTime = 0;
    this.sootheCircle.setAlpha(1);
    this.sootheCircle.setScale(0.5);

    this.tweens.add({
      targets: this.sootheCircle,
      scale: 1.2,
      alpha: 0,
      duration: GOOD_WINDOW + 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.sootheActive = false;
      },
    });

    // Track pulse timing
    this.soothePulseTime = this.time.now;

    // Check if all beats done
    if (this.sootheBeat >= SOOTHE_BEATS) {
      this.sootheTimer.destroy();
      this.time.delayedCall(GOOD_WINDOW + 300, () => {
        this.endSoothe();
      });
    }

    uiManager.updateMinigameOverlay({
      progress: `Beats: ${this.sootheBeat}/${SOOTHE_BEATS}`,
    });
  }

  private onSootheTap(): void {
    if (!this.sootheActive || this.gameOver) return;

    const elapsed = this.time.now - this.soothePulseTime;
    this.sootheActive = false; // Consume this beat

    if (elapsed <= PERFECT_WINDOW) {
      // Perfect!
      this.soothePerfects++;
      this.sootheHits++;
      this.score += 100;
      this.cameras.main.flash(100, 100, 255, 100);
    } else if (elapsed <= GOOD_WINDOW) {
      // Good
      this.sootheHits++;
      this.score += 50;
    }
    // Miss (too late) — no points

    uiManager.updateMinigameOverlay({ score: this.score });

    // Visual feedback: shrink circle
    this.tweens.killTweensOf(this.sootheCircle);
    this.sootheCircle.setAlpha(0);
  }

  private endSoothe(): void {
    const success = this.sootheHits >= 5;
    if (success) {
      this.score += 500; // Baby falls asleep bonus
    }
    this.endGame(success ? 'win' : 'partial');
  }

  // --- End Game ---

  private endGame(result: 'win' | 'partial' | 'lose'): void {
    if (this.gameOver) return;
    this.gameOver = true;

    this.tweens.killAll();
    this.countdownTimer?.destroy();
    this.sootheTimer?.destroy();
    uiManager.hideMinigameOverlay();

    let title: string;
    let message: string;
    switch (result) {
      case 'win':
        title = 'Sweet Dreams!';
        message = `The baby is sleeping peacefully.\nScore: ${this.score}`;
        // Show sleeping baby
        this.showSleepingBaby();
        break;
      case 'partial':
        title = 'Good Effort!';
        message = `The baby woke up again... but good effort!\nScore: ${this.score}`;
        break;
      case 'lose':
        title = 'Too Fast!';
        message = `The baby is too fast!\nScore: ${this.score}`;
        break;
    }

    this.time.delayedCall(result === 'win' ? 1000 : 500, () => {
      uiManager.showMinigameResult(title, this.score, () => {
        uiManager.hideDialog();
        const returnScene = this.returnData.returnScene ?? 'MichaelsHouseScene';
        this.scene.start(returnScene, {
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      });
    });
  }

  private showSleepingBaby(): void {
    const { width, height } = this.scale;
    this.babySprite.setTexture('chase-baby-sleep');
    this.babySprite.setDisplaySize(36, 36);
    this.babySprite.x = width / 2;
    this.babySprite.y = height / 2 - 20;

    // Zzz text
    const zzz = this.add.text(width / 2 + 20, height / 2 - 50, 'zzZ', {
      fontSize: '18px',
      color: '#aaccff',
    }).setDepth(20);
    this.tweens.add({
      targets: zzz,
      y: zzz.y - 20,
      alpha: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }
}
