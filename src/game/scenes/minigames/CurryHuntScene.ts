// src/game/scenes/minigames/CurryHuntScene.ts
// Shell game: the waiter hides a curry bowl under one of three covers,
// shuffles them, and the player guesses which cover hides it.

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const TOTAL_ROUNDS = 5;
const COVER_Y = 280;
const COVER_SPACING = 140;
const COVER_START_X_OFFSET = -COVER_SPACING; // center cover at 0 offset

interface CoverObj {
  sprite: Phaser.GameObjects.Image;
  index: number;
}

export class CurryHuntScene extends Phaser.Scene {
  private checkpointId!: string;
  private round = 0;
  private score = 0;
  private curryIndex = 0; // which cover (0-2) hides the curry
  private covers: CoverObj[] = [];
  private curryBowl!: Phaser.GameObjects.Image;
  private canGuess = false;
  private centerX = 0;
  private isShuffling = false;

  constructor() {
    super({ key: 'CurryHuntScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.round = 0;
    this.score = 0;
    this.covers = [];
    this.canGuess = false;
    this.isShuffling = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.centerX = width / 2;

    // Background — warm restaurant interior
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a1506);

    // Table surface
    this.add.rectangle(width / 2, COVER_Y + 30, width - 60, 120, 0x5c3a1e)
      .setStrokeStyle(2, 0x3d2510);

    // Table cloth highlight
    this.add.rectangle(width / 2, COVER_Y + 30, width - 80, 110, 0x8B1A1A, 0.3);

    // Title text
    this.add.text(width / 2, 40, 'Find the Curry!', {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waiter sprite (top-right)
    this.add.image(width - 60, 160, 'npc-indian-waiter').setScale(2);

    // Speech bubble
    this.add.text(width - 160, 90, 'I hid the curry\nunder a cover...', {
      fontSize: '12px',
      color: '#fff',
      fontFamily: 'monospace',
      backgroundColor: '#333',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Curry Hunt!',
      score: 0,
      progress: `0/${TOTAL_ROUNDS}`,
      onExit: () => this.endGame(),
    });

    // Create curry bowl (hidden under cover initially)
    this.curryBowl = this.add.image(this.centerX, COVER_Y, 'curry-bowl')
      .setScale(2).setVisible(false).setDepth(1);

    // Create 3 covers
    for (let i = 0; i < 3; i++) {
      const x = this.centerX + (i - 1) * COVER_SPACING;
      const sprite = this.add.image(x, COVER_Y, 'curry-cover')
        .setScale(2).setDepth(2).setInteractive({ useHandCursor: true });

      sprite.on('pointerdown', () => this.onGuess(i));
      this.covers.push({ sprite, index: i });
    }

    // Start first round after a brief delay
    this.time.delayedCall(600, () => this.startRound());
  }

  private startRound(): void {
    this.round++;
    this.canGuess = false;
    this.isShuffling = false;

    if (this.round > TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    uiManager.updateMinigameOverlay({
      progress: `${this.round}/${TOTAL_ROUNDS}`,
    });

    // Reset cover positions
    this.covers.forEach((c, i) => {
      c.sprite.x = this.centerX + (i - 1) * COVER_SPACING;
      c.sprite.y = COVER_Y;
      c.sprite.setAlpha(1);
      c.index = i;
    });

    // Randomly pick which cover hides the curry
    this.curryIndex = Phaser.Math.Between(0, 2);
    this.curryBowl.setPosition(
      this.centerX + (this.curryIndex - 1) * COVER_SPACING,
      COVER_Y,
    );

    // Show the curry briefly, then cover it and shuffle
    this.revealThenShuffle();
  }

  private revealThenShuffle(): void {
    const cover = this.covers[this.curryIndex];

    // Show curry
    this.curryBowl.setVisible(true);

    // Lift cover to reveal
    this.tweens.add({
      targets: cover.sprite,
      y: COVER_Y - 50,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for a moment
        this.time.delayedCall(700, () => {
          // Lower cover back
          this.tweens.add({
            targets: cover.sprite,
            y: COVER_Y,
            duration: 300,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              this.curryBowl.setVisible(false);
              // Start shuffling
              this.time.delayedCall(300, () => this.shuffle());
            },
          });
        });
      },
    });
  }

  private shuffle(): void {
    this.isShuffling = true;

    // Number of swaps increases with rounds
    const swapCount = 2 + this.round * 2;
    // Speed increases with rounds
    const swapDuration = Math.max(150, 400 - this.round * 50);

    let swapsDone = 0;

    const doSwap = () => {
      if (swapsDone >= swapCount) {
        this.isShuffling = false;
        this.canGuess = true;

        // Flash covers to show they're clickable
        this.covers.forEach(c => {
          this.tweens.add({
            targets: c.sprite,
            scaleX: 2.15,
            scaleY: 2.15,
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        });
        return;
      }

      // Pick two different covers to swap
      const a = Phaser.Math.Between(0, 2);
      let b = Phaser.Math.Between(0, 1);
      if (b >= a) b++;

      const coverA = this.covers[a];
      const coverB = this.covers[b];
      const xA = coverA.sprite.x;
      const xB = coverB.sprite.x;

      // Track where the curry is
      if (coverA.index === this.curryIndex) {
        this.curryIndex = b;
      } else if (coverB.index === this.curryIndex) {
        this.curryIndex = a;
      }

      // Swap logical indices
      const tmpIdx = coverA.index;
      coverA.index = coverB.index;
      coverB.index = tmpIdx;

      // Animate swap with arc
      this.tweens.add({
        targets: coverA.sprite,
        x: xB,
        y: COVER_Y - 30,
        duration: swapDuration,
        ease: 'Sine.easeInOut',
        yoyo: false,
        onUpdate: (_tween, target, _key, current) => {
          // Arc up then down
          const progress = (target.x - xA) / (xB - xA);
          target.y = COVER_Y - Math.sin(progress * Math.PI) * 30;
        },
      });

      this.tweens.add({
        targets: coverB.sprite,
        x: xA,
        y: COVER_Y - 30,
        duration: swapDuration,
        ease: 'Sine.easeInOut',
        onUpdate: (_tween, target, _key, current) => {
          const progress = (target.x - xB) / (xA - xB);
          target.y = COVER_Y - Math.sin(progress * Math.PI) * 30;
        },
        onComplete: () => {
          // Ensure Y is reset
          coverA.sprite.y = COVER_Y;
          coverB.sprite.y = COVER_Y;
          swapsDone++;
          this.time.delayedCall(50, doSwap);
        },
      });
    };

    doSwap();
  }

  private onGuess(coverArrayIndex: number): void {
    if (!this.canGuess || this.isShuffling) return;
    this.canGuess = false;

    const cover = this.covers[coverArrayIndex];
    const correct = cover.index === this.curryIndex;

    // Reveal the curry bowl
    // Find which array index actually has the curry
    const curryArrayIdx = this.covers.findIndex(c => c.index === this.curryIndex);
    this.curryBowl.setPosition(this.covers[curryArrayIdx].sprite.x, COVER_Y);
    this.curryBowl.setVisible(true);

    // Lift the chosen cover
    this.tweens.add({
      targets: cover.sprite,
      y: COVER_Y - 50,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Also lift the correct cover if wrong guess
    if (!correct) {
      const correctCover = this.covers[curryArrayIdx];
      this.tweens.add({
        targets: correctCover.sprite,
        y: COVER_Y - 50,
        duration: 300,
        ease: 'Back.easeOut',
        delay: 200,
      });
    }

    if (correct) {
      audioManager.playSFX('mg_correct');
      this.score += 200;
      // Bonus for later rounds
      this.score += this.round * 20;

      uiManager.updateMinigameOverlay({ score: this.score });

      // Green flash
      const flash = this.add.rectangle(
        this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height,
        0x00FF00, 0.2,
      ).setDepth(10);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy(),
      });

      this.add.text(this.scale.width / 2, COVER_Y - 80, 'Correct!', {
        fontSize: '20px',
        color: '#00FF00',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    } else {
      audioManager.playSFX('mg_wrong');
      // Red flash
      const flash = this.add.rectangle(
        this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height,
        0xFF0000, 0.2,
      ).setDepth(10);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy(),
      });

      this.add.text(this.scale.width / 2, COVER_Y - 80, 'Wrong!', {
        fontSize: '20px',
        color: '#FF4444',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    }

    // Next round after delay
    this.time.delayedCall(1500, () => {
      this.curryBowl.setVisible(false);
      this.startRound();
    });
  }

  private endGame(): void {
    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult('Curry Hunt Complete!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
