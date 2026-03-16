import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';
import { createPanel, createStyledButton, createStyledText, createCloseButton, createPillContainer, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface CatchConfig {
  items: string[];
  speed: number;
  spawnRate: number;
}

interface CatchData {
  checkpointId: string;
  config: CatchConfig;
}

export class CatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CatchConfig;
  private basket!: Phaser.GameObjects.Graphics;
  private basketBody!: Phaser.GameObjects.Rectangle;
  private score = 0;
  private misses = 0;
  private scorePill!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text };
  private missPill!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text };
  private spawnTimer!: Phaser.Time.TimerEvent;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private gameOver = false;
  private pointerX: number | null = null;

  constructor() {
    super({ key: 'CatchGame' });
  }

  init(data: CatchData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.score = 0;
    this.misses = 0;
    this.gameOver = false;
    this.pointerX = null;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x1a2e1a, 0x1a2e1a, 1);
    bg.fillRect(0, 0, width, height);

    // Basket — nicer graphics with gradient fill and shadow
    this.basket = this.add.graphics();
    const basketW = 70;
    const basketH = 24;
    const basketX = width / 2;
    const basketY = height - 40;
    // Shadow
    this.basket.fillStyle(0x000000, 0.3);
    this.basket.fillRoundedRect(-basketW / 2 + 2, -basketH / 2 + 2, basketW, basketH, 6);
    // Body gradient
    this.basket.fillStyle(0x8B4513, 1);
    this.basket.fillRoundedRect(-basketW / 2, -basketH / 2, basketW, basketH, 6);
    this.basket.fillStyle(0xa0522d, 0.6);
    this.basket.fillRoundedRect(-basketW / 2 + 4, -basketH / 2 + 2, basketW - 8, basketH / 2, 4);
    this.basket.setPosition(basketX, basketY);

    // Invisible rectangle for physics
    this.basketBody = this.add.rectangle(basketX, basketY, basketW, basketH);
    this.basketBody.setAlpha(0);
    this.physics.add.existing(this.basketBody);
    (this.basketBody.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.basketBody.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // Score pill (success color)
    this.scorePill = createPillContainer(this, 70, 20, 'Caught: 0', {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });

    // Miss pill (danger color)
    this.missPill = createPillContainer(this, 70, 48, 'Missed: 0/3', {
      color: UI_COLORS.danger,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });

    // Quit button
    createCloseButton(this, width - 24, 24, () => this.quitGame()).setDepth(999);

    // Keyboard input (guard for keyboard-less devices)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Touch input — basket follows pointer X
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.pointerX = pointer.x;
      }
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't track pointer if hitting the quit button
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length > 0) return;
      this.pointerX = pointer.x;
    });
    this.input.on('pointerup', () => {
      this.pointerX = null;
    });

    // Spawn items
    this.spawnTimer = this.time.addEvent({
      delay: this.config.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });

    addFadeTransition(this);
  }

  private spawnItem(): void {
    if (this.gameOver) return;
    const { width } = this.cameras.main;
    const x = Phaser.Math.Between(30, width - 30);

    // Glow circle behind item
    const glow = this.add.circle(x, -10, 18, UI_COLORS.gold, 0.2);
    (glow as any).__isGlow = true;

    const item = this.add.circle(x, -10, 10, UI_COLORS.gold);
    this.physics.add.existing(item);
    (item.body as Phaser.Physics.Arcade.Body).setVelocityY(this.config.speed * 60);

    // Link glow to item
    (item as any).__glow = glow;
  }

  update(): void {
    if (this.gameOver) return;

    const body = this.basketBody.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    // Keyboard input
    const keyLeft = this.cursors?.left.isDown ?? false;
    const keyRight = this.cursors?.right.isDown ?? false;

    if (keyLeft) body.setVelocityX(-300);
    else if (keyRight) body.setVelocityX(300);
    else if (this.pointerX !== null) {
      // Touch input — move basket toward pointer X
      const diff = this.pointerX - this.basketBody.x;
      if (Math.abs(diff) > 4) {
        body.setVelocityX(Math.sign(diff) * 300);
      }
    }

    // Sync basket graphics with physics body
    this.basket.setPosition(this.basketBody.x, this.basketBody.y);

    // Check catches and misses
    const { height } = this.cameras.main;
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Arc && child.body && !(child as any).__isGlow) {
        // Update glow position
        const glow = (child as any).__glow as Phaser.GameObjects.Arc | undefined;
        if (glow) {
          glow.setPosition(child.x, child.y);
        }

        if (Phaser.Geom.Intersects.RectangleToRectangle(
          child.getBounds(),
          this.basketBody.getBounds()
        )) {
          this.score++;
          this.updateScorePill();
          if (glow) glow.destroy();
          child.destroy();
        } else if (child.y > height + 10) {
          this.misses++;
          this.updateMissPill();
          if (glow) glow.destroy();
          child.destroy();
          if (this.misses >= 3) this.endGame();
        }
      }
    });
  }

  private updateScorePill(): void {
    this.scorePill.bg.destroy();
    this.scorePill.label.destroy();
    this.scorePill = createPillContainer(this, 70, 20, `Caught: ${this.score}`, {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
  }

  private updateMissPill(): void {
    this.missPill.bg.destroy();
    this.missPill.label.destroy();
    this.missPill = createPillContainer(this, 70, 48, `Missed: ${this.misses}/3`, {
      color: UI_COLORS.danger,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
  }

  private quitGame(): void {
    if (!this.gameOver) {
      this.spawnTimer.destroy();
    }
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) worldScene.refreshUI();
    this.scene.stop();
    this.scene.resume('WorldScene');
  }

  private endGame(): void {
    this.gameOver = true;
    this.spawnTimer.destroy();
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

    createStyledText(this, width / 2, height / 2 - 40, `Caught ${this.score}!`, {
      fontSize: '28px',
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
