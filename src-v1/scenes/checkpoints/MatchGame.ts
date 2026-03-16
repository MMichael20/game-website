import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';
import { createPanel, createStyledButton, createStyledText, createCloseButton, createPillContainer, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface MatchConfig {
  pairs: Array<{ a: string; b: string }>;
}

interface MatchData {
  checkpointId: string;
  config: MatchConfig;
}

export class MatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private cards: Array<{ text: string; pairIndex: number; revealed: boolean; matched: boolean; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hitArea: Phaser.GameObjects.Rectangle }> = [];
  private flipped: number[] = [];
  private moves = 0;
  private movesPill!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text };
  private canFlip = true;
  private cardW = 140;
  private cardH = 60;

  constructor() {
    super({ key: 'MatchGame' });
  }

  init(data: MatchData): void {
    this.checkpointId = data.checkpointId;
    this.cards = [];
    this.flipped = [];
    this.moves = 0;
    this.canFlip = true;

    // Build card deck from pairs
    const items: Array<{ text: string; pairIndex: number }> = [];
    const pairs = data.config.pairs || [
      { a: 'Movie 1', b: 'Quote 1' },
      { a: 'Movie 2', b: 'Quote 2' },
      { a: 'Movie 3', b: 'Quote 3' },
      { a: 'Movie 4', b: 'Quote 4' },
    ];
    pairs.forEach((pair, i) => {
      items.push({ text: pair.a, pairIndex: i });
      items.push({ text: pair.b, pairIndex: i });
    });
    Phaser.Utils.Array.Shuffle(items);

    // Store for create
    (this as any).__items = items;
  }

  create(): void {
    // Reset camera for mini-game (clear WorldScene's zoom/bounds)
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.removeBounds();

    const { width, height } = this.cameras.main;
    const items = (this as any).__items as Array<{ text: string; pairIndex: number }>;

    // Background gradient
    const bgGfx = this.add.graphics();
    bgGfx.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2e1a2e, 0x2e1a2e, 1);
    bgGfx.fillRect(0, 0, width, height);

    createStyledText(this, width / 2, 20, 'Match the Pairs!', {
      fontSize: '22px',
      color: UI_COLORS.goldHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Moves pill
    this.movesPill = createPillContainer(this, width / 2, 50, 'Moves: 0', {
      color: UI_COLORS.purple,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });

    // Quit button
    createCloseButton(this, width - 24, 24, () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    }).setDepth(999);

    // Grid layout
    const gap = 10;
    const availW = width - 20;
    const cols = availW >= 580 ? 4 : availW >= 340 ? 3 : 2;
    const cardW = Math.floor((availW - (cols - 1) * gap) / cols);
    const cardH = Math.min(60, Math.round(cardW * 0.43));
    this.cardW = cardW;
    this.cardH = cardH;
    const startX = width / 2 - ((cols * (cardW + gap)) - gap) / 2 + cardW / 2;
    const startY = 90 + cardH / 2;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      // Rounded rectangle card via Graphics
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x2a2a4a, 1);
      cardBg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
      cardBg.lineStyle(1, 0x444466, 1);
      cardBg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);

      // Invisible hit area for interaction
      const hitArea = this.add.rectangle(x, y, cardW, cardH).setAlpha(0.001)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, '?', {
        fontSize: '14px', color: '#666',
        fontFamily: 'Georgia, serif',
        wordWrap: { width: cardW - 10 },
        align: 'center',
      }).setOrigin(0.5);

      const cardData = {
        text: item.text,
        pairIndex: item.pairIndex,
        revealed: false,
        matched: false,
        bg: cardBg,
        label,
        hitArea,
      };
      this.cards.push(cardData);

      hitArea.on('pointerdown', () => this.flipCard(i));
    });

    addFadeTransition(this);
  }

  private flipCard(index: number): void {
    if (!this.canFlip) return;
    const card = this.cards[index];
    if (card.revealed || card.matched) return;

    const cardW = this.cardW; const cardH = this.cardH;
    const x = card.hitArea.x;
    const y = card.hitArea.y;

    // Flip animation: scale X 1 -> 0, swap content, 0 -> 1
    card.revealed = true;
    this.flipped.push(index);

    this.tweens.add({
      targets: [card.bg, card.label, card.hitArea],
      scaleX: 0,
      duration: 120,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Redraw card face-up
        card.bg.clear();
        card.bg.fillStyle(0x3a3a5a, 1);
        card.bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
        card.bg.lineStyle(1, 0x666688, 1);
        card.bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
        card.label.setText(card.text).setColor('#ffffff');

        this.tweens.add({
          targets: [card.bg, card.label, card.hitArea],
          scaleX: 1,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (this.flipped.length === 2) {
              this.checkMatch();
            }
          },
        });
      },
    });
  }

  private checkMatch(): void {
    this.moves++;
    this.updateMovesPill();
    this.canFlip = false;

    const [i1, i2] = this.flipped;
    const cardW = this.cardW;
    const cardH = this.cardH;

    if (this.cards[i1].pairIndex === this.cards[i2].pairIndex) {
      // Match! Green tint with glow
      [i1, i2].forEach((idx) => {
        const c = this.cards[idx];
        const x = c.hitArea.x;
        const y = c.hitArea.y;
        c.matched = true;
        c.bg.clear();
        // Glow
        c.bg.fillStyle(UI_COLORS.success, 0.2);
        c.bg.fillRoundedRect(x - cardW / 2 - 3, y - cardH / 2 - 3, cardW + 6, cardH + 6, 10);
        // Card
        c.bg.fillStyle(UI_COLORS.success, 1);
        c.bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
      });
      this.flipped = [];
      this.canFlip = true;

      // Check win
      if (this.cards.every((c) => c.matched)) {
        this.time.delayedCall(500, () => this.showResults());
      }
    } else {
      // No match — flip back
      this.time.delayedCall(800, () => {
        [i1, i2].forEach((idx) => {
          const c = this.cards[idx];
          const x = c.hitArea.x;
          const y = c.hitArea.y;
          c.revealed = false;

          this.tweens.add({
            targets: [c.bg, c.label, c.hitArea],
            scaleX: 0,
            duration: 120,
            ease: 'Sine.easeIn',
            onComplete: () => {
              c.bg.clear();
              c.bg.fillStyle(0x2a2a4a, 1);
              c.bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
              c.bg.lineStyle(1, 0x444466, 1);
              c.bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 8);
              c.label.setText('?').setColor('#666');

              this.tweens.add({
                targets: [c.bg, c.label, c.hitArea],
                scaleX: 1,
                duration: 120,
                ease: 'Sine.easeOut',
              });
            },
          });
        });
        this.flipped = [];
        this.canFlip = true;
      });
    }
  }

  private updateMovesPill(): void {
    this.movesPill.bg.destroy();
    this.movesPill.label.destroy();
    this.movesPill = createPillContainer(this, this.cameras.main.width / 2, 50, `Moves: ${this.moves}`, {
      color: UI_COLORS.purple,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
  }

  private showResults(): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, this.moves, true); // lower moves = better

    // Results panel
    const panelW = Math.min(320, width * 0.9);
    const panelH = Math.min(220, height * 0.4);
    createPanel(this, width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, {
      color: UI_COLORS.darkPanel,
      radius: 16,
      shadow: true,
      strokeColor: UI_COLORS.gold,
      strokeWidth: 2,
    }).setDepth(200);

    createStyledText(this, width / 2, height / 2 - 40, `Done in ${this.moves} moves!`, {
      fontSize: '24px',
      color: UI_COLORS.goldHex,
    }).setOrigin(0.5).setDepth(201);

    const { container: backBtn } = createStyledButton(this, width / 2, height / 2 + 30, 'Back to Map', {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '18px',
    });
    backBtn.setDepth(201);
    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
