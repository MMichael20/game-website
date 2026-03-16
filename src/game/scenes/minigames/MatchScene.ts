// src/game/scenes/minigames/MatchScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
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
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    uiManager.showMinigameOverlay({
      title: 'Memory Match!',
      score: 0,
      progress: `0/${this.pairs.length}`,
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

      this.cards.push(card);
    });
  }

  private flipCard(card: Card): void {
    if (!this.canFlip || card.isFlipped || card.isMatched) return;

    // Flip face up
    card.setTexture(`match-icon-${card.pairIndex % 6}`);
    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.canFlip = false;

      const [first, second] = this.flippedCards;

      if (first.pairIndex === second.pairIndex) {
        // Match found
        first.isMatched = true;
        second.isMatched = true;
        this.matchedPairs++;
        this.flippedCards = [];
        this.canFlip = true;

        uiManager.updateMinigameOverlay({
          score: this.matchedPairs * 100,
          progress: `${this.matchedPairs}/${this.pairs.length}`,
        });

        if (this.matchedPairs >= this.pairs.length) {
          this.time.delayedCall(500, () => this.endGame());
        }
      } else {
        // No match — flip back after delay
        this.time.delayedCall(1000, () => {
          first.setTexture('card-back');
          first.isFlipped = false;
          second.setTexture('card-back');
          second.isFlipped = false;
          this.flippedCards = [];
          this.canFlip = true;
        });
      }
    }
  }

  private endGame(): void {
    const score = Math.max(0, 1000 - (this.moves - this.pairs.length) * 50);

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, score);
    uiManager.hideMinigameOverlay();

    uiManager.showMinigameResult('Match Complete!', score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
