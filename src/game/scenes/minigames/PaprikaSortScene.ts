// src/game/scenes/minigames/PaprikaSortScene.ts
// Match pairs of Hungarian spices — memory card game with spice theme

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';

const SPICE_PAIRS = [
  { name: 'Paprika', color: 0xCC2222 },
  { name: 'Saffron', color: 0xFFCC00 },
  { name: 'Cumin', color: 0xBB8844 },
  { name: 'Pepper', color: 0x222222 },
  { name: 'Caraway', color: 0x886633 },
  { name: 'Garlic', color: 0xEEEEDD },
];

interface SpiceCard extends Phaser.GameObjects.Rectangle {
  pairIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
  label: Phaser.GameObjects.Text;
}

export class PaprikaSortScene extends Phaser.Scene {
  private checkpointId!: string;
  private cards: SpiceCard[] = [];
  private flippedCards: SpiceCard[] = [];
  private moves = 0;
  private matchedPairs = 0;
  private canFlip = true;

  constructor() {
    super({ key: 'PaprikaSortScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.cards = [];
    this.flippedCards = [];
    this.moves = 0;
    this.matchedPairs = 0;
    this.canFlip = true;
  }

  create(): void {
    const { width, height } = this.scale;

    // Warm market background
    this.add.rectangle(width / 2, height / 2, width, height, 0x3A2A1A);

    uiManager.showMinigameOverlay({
      title: 'Paprika Sort!',
      score: 0,
      progress: `0/${SPICE_PAIRS.length}`,
      onExit: () => this.endGame(),
    });

    // Build deck: 2 cards per spice
    const deck: Array<{ pairIndex: number }> = [];
    SPICE_PAIRS.forEach((_, i) => {
      deck.push({ pairIndex: i });
      deck.push({ pairIndex: i });
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Grid layout
    const cols = 4;
    const rows = Math.ceil(deck.length / cols);
    const cardW = Math.min((width - 60) / cols - 8, 70);
    const cardH = Math.min((height - 120) / rows - 8, 70);
    const spacingX = cardW + 8;
    const spacingY = cardH + 8;
    const gridW = cols * spacingX - 8;
    const gridH = rows * spacingY - 8;
    const startX = (width - gridW) / 2 + cardW / 2;
    const startY = (height - gridH) / 2 + cardH / 2 + 15;

    deck.forEach((entry, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      // Card back — dark brown with "?"
      const card = this.add.rectangle(x, y, cardW, cardH, 0x5C3A1E) as unknown as SpiceCard;
      card.setStrokeStyle(2, 0x8B6914);
      card.setInteractive();
      card.pairIndex = entry.pairIndex;
      card.isFlipped = false;
      card.isMatched = false;

      // Label (hidden initially)
      const label = this.add.text(x, y, '?', {
        fontSize: '11px',
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setDepth(1);
      card.label = label;

      card.on('pointerdown', () => this.flipCard(card));
      this.cards.push(card);
    });
  }

  private flipCard(card: SpiceCard): void {
    if (!this.canFlip || card.isFlipped || card.isMatched) return;

    // Show spice
    const spice = SPICE_PAIRS[card.pairIndex];
    card.fillColor = spice.color;
    card.label.setText(spice.name);
    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.canFlip = false;

      const [first, second] = this.flippedCards;

      if (first.pairIndex === second.pairIndex) {
        // Match!
        first.isMatched = true;
        second.isMatched = true;
        this.matchedPairs++;
        this.flippedCards = [];
        this.canFlip = true;

        // Pulse matched cards
        this.tweens.add({ targets: [first, second], scaleX: 1.1, scaleY: 1.1, duration: 200, yoyo: true });

        uiManager.updateMinigameOverlay({
          score: this.matchedPairs * 100,
          progress: `${this.matchedPairs}/${SPICE_PAIRS.length}`,
        });

        if (this.matchedPairs >= SPICE_PAIRS.length) {
          this.time.delayedCall(500, () => this.endGame());
        }
      } else {
        // No match — flip back
        this.time.delayedCall(800, () => {
          first.fillColor = 0x5C3A1E;
          first.label.setText('?');
          first.isFlipped = false;
          second.fillColor = 0x5C3A1E;
          second.label.setText('?');
          second.isFlipped = false;
          this.flippedCards = [];
          this.canFlip = true;
        });
      }
    }
  }

  private endGame(): void {
    const score = Math.max(0, 1000 - (this.moves - SPICE_PAIRS.length) * 40);

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, score);
    uiManager.hideMinigameOverlay();

    uiManager.showMinigameResult('Spices Sorted!', score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
