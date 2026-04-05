// src/game/scenes/minigames/MatchScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';
import type { MatchConfig } from '../../data/checkpoints';

interface Card extends Phaser.GameObjects.Sprite {
  cardIndex: number;
  pairIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export class MatchScene extends Phaser.Scene {
  private checkpointId!: string;
  private pairs!: MatchConfig['pairs'];
  private cards: Card[] = [];
  private flippedCards: Card[] = [];
  private moves = 0;
  private matchedPairs = 0;
  private canFlip = true;
  private remainingTime = 60;
  private timerEvent!: Phaser.Time.TimerEvent;
  private gameOver = false;
  private shimmerTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super({ key: 'MatchScene' });
  }

  init(data: { checkpointId: string; config: MatchConfig }): void {
    this.checkpointId = data.checkpointId;
    this.pairs = data.config.pairs;
    this.cards = [];
    this.flippedCards = [];
    this.moves = 0;
    this.matchedPairs = 0;
    this.canFlip = true;
    this.remainingTime = 60;
    this.gameOver = false;
    this.shimmerTweens = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Background grid pattern for depth
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x2a2a4e, 0.3);
    for (let x = 0; x <= width; x += 40) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 40) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(width, y);
    }
    gridGraphics.strokePath();

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Memory Match!',
      score: 0,
      progress: `0/${this.pairs.length} pairs | 0 moves`,
      timer: this.remainingTime,
      onExit: () => {
        this.endGame();
      },
    });

    // Start countdown timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true,
    });

    // Build card deck: each pair gets 2 cards
    const deck: Array<{ pairIndex: number }> = [];
    this.pairs.forEach((_, i) => {
      deck.push({ pairIndex: i });
      deck.push({ pairIndex: i });
    });

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Grid layout
    const cols = width > height ? 4 : 3;
    const rows = Math.ceil(deck.length / cols);
    const cardSize = Math.min(
      (width - 40) / cols - 10,
      (height - 120) / rows - 10,
      80,
    );
    const spacingX = cardSize + 10;
    const spacingY = cardSize + 10;
    const gridWidth = cols * spacingX - 10;
    const gridHeight = rows * spacingY - 10;
    const startX = (width - gridWidth) / 2 + cardSize / 2;
    const startY = (height - gridHeight) / 2 + cardSize / 2 + 20;

    deck.forEach((entry, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const card = this.add.sprite(x, y, 'card-back') as Card;
      card.setDisplaySize(cardSize, cardSize);
      card.setInteractive();
      card.cardIndex = i;
      card.pairIndex = entry.pairIndex;
      card.isFlipped = false;
      card.isMatched = false;

      card.on('pointerdown', () => this.flipCard(card));

      // Card back shimmer — subtle alpha oscillation
      const shimmerTween = this.tweens.add({
        targets: card,
        alpha: { from: 0.88, to: 1.0 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 800),
      });
      this.shimmerTweens.push(shimmerTween);

      this.cards.push(card);
    });
  }

  private tickTimer(): void {
    if (this.gameOver) return;

    this.remainingTime--;

    uiManager.updateMinigameOverlay({
      timer: this.remainingTime,
    });

    if (this.remainingTime === 5) {
      audioManager.playSFX('mg_timer_warning');
    }

    if (this.remainingTime <= 0) {
      this.timerEvent.remove();
      this.endGame();
    }
  }

  private flipCard(card: Card): void {
    if (!this.canFlip || card.isFlipped || card.isMatched || this.gameOver) return;

    // Stop shimmer on this card
    const shimmerIndex = this.cards.indexOf(card);
    if (shimmerIndex >= 0 && this.shimmerTweens[shimmerIndex]) {
      this.shimmerTweens[shimmerIndex].stop();
      card.setAlpha(1);
    }

    // Prevent further flips during animation
    this.canFlip = false;

    // Animated flip: squish to 0, swap texture, expand back
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 120,
      ease: 'Sine.easeIn',
      onComplete: () => {
        card.setTexture(`match-icon-${card.pairIndex % 6}`);
        card.isFlipped = true;

        this.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => {
            // Animation done — now register the flip
            this.flippedCards.push(card);

            if (this.flippedCards.length === 2) {
              this.moves++;
              this.checkMatch();
            } else {
              // Only one card flipped, allow flipping another
              this.canFlip = true;
            }
          },
        });
      },
    });
  }

  private checkMatch(): void {
    const [first, second] = this.flippedCards;

    if (first.pairIndex === second.pairIndex) {
      // Match found
      audioManager.playSFX('mg_correct');
      first.isMatched = true;
      second.isMatched = true;
      this.matchedPairs++;

      // Match celebration — pulse both cards
      [first, second].forEach((c) => {
        this.tweens.add({
          targets: c,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 200,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
      });

      // Sparkle particles at midpoint
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      this.spawnSparkles(midX, midY);

      // Green screen flash
      const flash = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x00ff00,
        0.12,
      );
      flash.setDepth(100);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 250,
        onComplete: () => flash.destroy(),
      });

      // Floating "+100" text
      const scoreText = this.add.text(midX, midY, '+100', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#FFD700',
        fontStyle: 'bold',
      });
      scoreText.setOrigin(0.5);
      scoreText.setDepth(101);
      this.tweens.add({
        targets: scoreText,
        y: midY - 40,
        alpha: 0,
        duration: 600,
        ease: 'Sine.easeOut',
        onComplete: () => scoreText.destroy(),
      });

      this.flippedCards = [];
      this.canFlip = true;

      uiManager.updateMinigameOverlay({
        score: this.matchedPairs * 100,
        progress: `${this.matchedPairs}/${this.pairs.length} pairs | ${this.moves} moves`,
      });

      if (this.matchedPairs >= this.pairs.length) {
        this.time.delayedCall(500, () => this.endGame());
      }
    } else {
      // Mismatch
      audioManager.playSFX('mg_wrong');

      // Tint red briefly
      first.setTint(0xff4444);
      second.setTint(0xff4444);

      // Subtle camera shake
      this.cameras.main.shake(100, 0.004);

      uiManager.updateMinigameOverlay({
        progress: `${this.matchedPairs}/${this.pairs.length} pairs | ${this.moves} moves`,
      });

      // Wait, clear tint, then animated flip back
      this.time.delayedCall(300, () => {
        first.clearTint();
        second.clearTint();

        this.animateFlipBack(first, () => {
          // Restart shimmer on first card
          this.restartShimmer(first);
        });
        this.animateFlipBack(second, () => {
          // Restart shimmer on second card
          this.restartShimmer(second);
          // Re-enable flipping after second card finishes
          this.flippedCards = [];
          this.canFlip = true;
        });
      });
    }
  }

  private animateFlipBack(card: Card, onDone?: () => void): void {
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 120,
      ease: 'Sine.easeIn',
      onComplete: () => {
        card.setTexture('card-back');
        card.isFlipped = false;

        this.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (onDone) onDone();
          },
        });
      },
    });
  }

  private restartShimmer(card: Card): void {
    if (card.isMatched) return;
    const idx = this.cards.indexOf(card);
    if (idx < 0) return;

    const tween = this.tweens.add({
      targets: card,
      alpha: { from: 0.88, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 800),
    });
    this.shimmerTweens[idx] = tween;
  }

  private spawnSparkles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const sparkle = this.add.circle(x, y, 3, 0xffd700, 1);
      sparkle.setDepth(99);

      const targetX = x + Math.cos(angle) * 30;
      const targetY = y + Math.sin(angle) * 30;

      this.tweens.add({
        targets: sparkle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    // Stop all shimmer tweens
    this.shimmerTweens.forEach((t) => {
      if (t && t.isPlaying()) t.stop();
    });

    const timeBonus = Math.max(0, this.remainingTime) * 5;
    const baseScore = Math.max(0, 1000 - (this.moves - this.pairs.length) * 50);
    const score = baseScore + timeBonus;

    // Scoring tiers
    let title: string;
    if (score >= 900) {
      title = 'Perfect Memory!';
    } else if (score >= 600) {
      title = 'Sharp Mind!';
    } else if (score >= 300) {
      title = 'Getting There';
    } else {
      title = 'Keep Practicing';
    }

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult(title, score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
