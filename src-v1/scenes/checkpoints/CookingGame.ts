import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';
import { createPanel, createStyledButton, createStyledText, createCloseButton, createPillContainer, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface CookingConfig {
  orders: Array<{ name: string; items: string[] }>;
  timeLimit: number;
}

interface CookingData {
  checkpointId: string;
  config: CookingConfig;
}

export class CookingGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CookingConfig;
  private currentOrderIndex = 0;
  private selectedItems: string[] = [];
  private score = 0;
  private timeLeft = 30;
  private timerPill!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text };
  private scorePill!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text };
  private orderPanel!: Phaser.GameObjects.Graphics;
  private orderText!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'CookingGame' });
  }

  init(data: CookingData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.currentOrderIndex = 0;
    this.selectedItems = [];
    this.score = 0;
    this.timeLeft = data.config.timeLimit;
    this.gameOver = false;
  }

  create(): void {
    // Reset camera for mini-game (clear WorldScene's zoom/bounds)
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.removeBounds();

    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2e2a1a, 0x2e2a1a, 1);
    bg.fillRect(0, 0, width, height);

    // Styled title
    createStyledText(this, width / 2, 20, 'Fill the Orders!', {
      fontSize: '22px',
      color: UI_COLORS.goldHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Quit button
    createCloseButton(this, width - 24, 24, () => {
      if (!this.gameOver) this.timerEvent.destroy();
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    }).setDepth(999);

    // Timer pill (starts green)
    this.timerPill = createPillContainer(this, width - 80, 56, `Time: ${this.timeLeft}s`, {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });

    // Score pill
    this.scorePill = createPillContainer(this, 70, 56, `Orders: ${this.score}`, {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });

    // Order display panel
    const orderPanelW = Math.min(320, width * 0.9);
    this.orderPanel = createPanel(this, width / 2 - orderPanelW / 2, 75, orderPanelW, 60, {
      color: UI_COLORS.darkPanel,
      radius: 10,
      shadow: false,
      strokeColor: UI_COLORS.gold,
      strokeWidth: 1,
    });

    this.orderText = createStyledText(this, width / 2, 95, '', {
      fontSize: '14px',
      color: UI_COLORS.goldHex,
      align: 'center',
    }).setOrigin(0.5, 0);

    // Selected items display
    this.selectedText = createStyledText(this, width / 2, height - 130, 'Your tray: (empty)', {
      fontSize: '14px',
      color: UI_COLORS.mutedHex,
    }).setOrigin(0.5);

    // Gather all unique items from all orders
    const allItems = new Set<string>();
    this.config.orders.forEach((o) => o.items.forEach((item) => allItems.add(item)));
    const itemList = Array.from(allItems);

    // Item buttons using createStyledButton
    const shelfY = height / 2 + 40;
    const itemSpacing = Math.min(80, (width - 40) / itemList.length);
    itemList.forEach((item, i) => {
      const { container: itemBtn } = createStyledButton(
        this,
        width / 2 - ((itemList.length - 1) * itemSpacing) / 2 + i * itemSpacing,
        shelfY,
        item.replace(/-/g, ' '),
        {
          color: UI_COLORS.purple,
          textColor: UI_COLORS.textHex,
          fontSize: '13px',
          paddingX: 12,
          paddingY: 12,
        },
      );
      itemBtn.on('pointerdown', () => this.selectItem(item));
    });

    // Submit button (styled)
    const { container: submitBtn } = createStyledButton(this, width / 2 - 70, height - 70, 'Submit Order', {
      color: UI_COLORS.purple,
      textColor: UI_COLORS.textHex,
      fontSize: '16px',
      paddingX: 16,
      paddingY: 10,
    });
    submitBtn.on('pointerdown', () => this.submitOrder());

    // Clear button (styled)
    const { container: clearBtn } = createStyledButton(this, width / 2 + 70, height - 70, 'Clear', {
      color: UI_COLORS.danger,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
      paddingX: 16,
      paddingY: 10,
    });
    clearBtn.on('pointerdown', () => {
      this.selectedItems = [];
      this.selectedText.setText('Your tray: (empty)');
    });

    this.showCurrentOrder();

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.updateTimerPill();
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });

    addFadeTransition(this);
  }

  private updateTimerPill(): void {
    const { width } = this.cameras.main;
    const timerColor = this.timeLeft > 20 ? UI_COLORS.success : this.timeLeft > 10 ? 0xeab308 : UI_COLORS.danger;
    this.timerPill.bg.destroy();
    this.timerPill.label.destroy();
    this.timerPill = createPillContainer(this, width - 80, 56, `Time: ${this.timeLeft}s`, {
      color: timerColor,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
  }

  private updateScorePill(): void {
    this.scorePill.bg.destroy();
    this.scorePill.label.destroy();
    this.scorePill = createPillContainer(this, 70, 56, `Orders: ${this.score}`, {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
  }

  private showCurrentOrder(): void {
    if (this.currentOrderIndex >= this.config.orders.length) {
      // Cycle orders
      this.currentOrderIndex = 0;
    }
    const order = this.config.orders[this.currentOrderIndex];
    this.orderText.setText(`Order: "${order.name}"\nNeed: ${order.items.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private selectItem(item: string): void {
    if (this.gameOver) return;
    this.selectedItems.push(item);
    this.selectedText.setText(`Your tray: ${this.selectedItems.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private submitOrder(): void {
    if (this.gameOver) return;
    const order = this.config.orders[this.currentOrderIndex];

    // Check if selected items match order (same items, same order)
    const correct = order.items.length === this.selectedItems.length &&
      order.items.every((item, i) => item === this.selectedItems[i]);

    if (correct) {
      this.score++;
      this.updateScorePill();
      this.currentOrderIndex++;
      this.showCurrentOrder();
    }

    this.selectedItems = [];
    this.selectedText.setText('Your tray: (empty)');
  }

  private endGame(): void {
    this.gameOver = true;
    this.timerEvent.destroy();
    saveMiniGameScore(this.checkpointId, this.score);

    const { width, height } = this.cameras.main;

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

    createStyledText(this, width / 2, height / 2 - 40, `${this.score} orders filled!`, {
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
