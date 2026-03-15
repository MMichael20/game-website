import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';
import { createPanel, createStyledButton, createStyledText, createCloseButton, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface PuzzleData {
  checkpointId: string;
  config: {
    photo?: string;
    gridSize?: number;
  };
}

export class PuzzleGame extends Phaser.Scene {
  private checkpointId!: string;
  private gridSize = 3;
  private tiles: Phaser.GameObjects.Graphics[] = [];
  private tileLabels: Phaser.GameObjects.Text[] = [];
  private tileHitAreas: Phaser.GameObjects.Rectangle[] = [];
  private positions: Array<{ x: number; y: number }> = [];
  private correctOrder: number[] = [];
  private currentOrder: number[] = [];
  private startTime = 0;
  private dragTile: number | null = null;

  constructor() {
    super({ key: 'PuzzleGame' });
  }

  init(data: PuzzleData): void {
    this.checkpointId = data.checkpointId;
    this.gridSize = data.config.gridSize || 3;
    this.tiles = [];
    this.tileLabels = [];
    this.tileHitAreas = [];
    this.positions = [];
    this.correctOrder = [];
    this.currentOrder = [];
    this.dragTile = null;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x1a2a3e, 0x1a2a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Styled title
    createStyledText(this, width / 2, 20, 'Solve the Puzzle!', {
      fontSize: '22px',
      color: UI_COLORS.goldHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Quit button
    createCloseButton(this, width - 24, 24, () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    }).setDepth(999);

    const tileSize = 80;
    const gap = 4;
    const totalSize = this.gridSize * (tileSize + gap) - gap;
    const startX = width / 2 - totalSize / 2 + tileSize / 2;
    const startY = height / 2 - totalSize / 2 + tileSize / 2;

    // Create grid positions
    const indices: number[] = [];
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      indices.push(i);
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      this.positions.push({
        x: startX + col * (tileSize + gap),
        y: startY + row * (tileSize + gap),
      });
    }
    this.correctOrder = [...indices];

    // Shuffle
    const shuffled = [...indices];
    Phaser.Utils.Array.Shuffle(shuffled);
    this.currentOrder = shuffled;

    // Create tiles with rounded corners via Graphics + gradient fills
    shuffled.forEach((tileIndex, posIndex) => {
      const pos = this.positions[posIndex];
      const hue = (tileIndex / (this.gridSize * this.gridSize)) * 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.5).color;
      const lighterColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.65).color;

      const tileBg = this.add.graphics();
      // Shadow
      tileBg.fillStyle(0x000000, 0.2);
      tileBg.fillRoundedRect(pos.x - tileSize / 2 + 2, pos.y - tileSize / 2 + 2, tileSize, tileSize, 8);
      // Main tile
      tileBg.fillStyle(color, 1);
      tileBg.fillRoundedRect(pos.x - tileSize / 2, pos.y - tileSize / 2, tileSize, tileSize, 8);
      // Gradient highlight
      tileBg.fillStyle(lighterColor, 0.4);
      tileBg.fillRoundedRect(pos.x - tileSize / 2 + 4, pos.y - tileSize / 2 + 4, tileSize - 8, tileSize / 2 - 4, { tl: 6, tr: 6, bl: 0, br: 0 });
      tileBg.lineStyle(1, 0xffffff, 0.2);
      tileBg.strokeRoundedRect(pos.x - tileSize / 2, pos.y - tileSize / 2, tileSize, tileSize, 8);

      const label = createStyledText(this, pos.x, pos.y, `${tileIndex + 1}`, {
        fontSize: '20px',
        color: UI_COLORS.textHex,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Hit area for dragging
      const hitArea = this.add.rectangle(pos.x, pos.y, tileSize, tileSize).setAlpha(0.001)
        .setInteractive({ useHandCursor: true, draggable: true });

      (hitArea as any).__tileIndex = tileIndex;
      (hitArea as any).__posIndex = posIndex;
      (hitArea as any).__tileBg = tileBg;
      (hitArea as any).__label = label;

      this.tiles.push(tileBg);
      this.tileLabels.push(label);
      this.tileHitAreas.push(hitArea);
    });

    // Drag events
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      obj.setDepth(100);
      const tileBg = (obj as any).__tileBg as Phaser.GameObjects.Graphics;
      const label = (obj as any).__label as Phaser.GameObjects.Text;
      tileBg.setDepth(99);
      label.setDepth(101);
      // Scale up while dragging
      tileBg.setScale(1.1);
      label.setScale(1.1);
      obj.setScale(1.1);
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      const tileBg = (obj as any).__tileBg as Phaser.GameObjects.Graphics;
      const label = (obj as any).__label as Phaser.GameObjects.Text;
      const posIndex = (obj as any).__posIndex as number;
      const oldPos = this.positions[posIndex];

      // Move relative to original position
      const dx = dragX - oldPos.x;
      const dy = dragY - oldPos.y;
      obj.setPosition(dragX, dragY);
      tileBg.setPosition(dx, dy);
      label.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      const tileBg = (obj as any).__tileBg as Phaser.GameObjects.Graphics;
      const label = (obj as any).__label as Phaser.GameObjects.Text;

      // Reset scale
      tileBg.setScale(1);
      label.setScale(1);
      obj.setScale(1);

      // Find closest position
      let closestPos = 0;
      let closestDist = Infinity;
      this.positions.forEach((pos, i) => {
        const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pos.x, pos.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestPos = i;
        }
      });

      // Swap with tile at that position
      const myPosIndex = (obj as any).__posIndex as number;
      const otherHitArea = this.tileHitAreas.find((t) => (t as any).__posIndex === closestPos);

      if (otherHitArea && otherHitArea !== obj) {
        // Swap positions
        const otherTileBg = (otherHitArea as any).__tileBg as Phaser.GameObjects.Graphics;
        const otherLabel = (otherHitArea as any).__label as Phaser.GameObjects.Text;

        (otherHitArea as any).__posIndex = myPosIndex;
        (obj as any).__posIndex = closestPos;

        const otherPos = this.positions[myPosIndex];
        otherHitArea.setPosition(otherPos.x, otherPos.y);
        otherTileBg.setPosition(0, 0);
        otherTileBg.setDepth(0);
        otherLabel.setPosition(otherPos.x, otherPos.y);
        otherLabel.setDepth(1);

        // Update current order
        this.currentOrder[myPosIndex] = (otherHitArea as any).__tileIndex;
        this.currentOrder[closestPos] = (obj as any).__tileIndex;
      }

      const snapPos = this.positions[closestPos];
      obj.setPosition(snapPos.x, snapPos.y);
      tileBg.setPosition(0, 0);
      tileBg.setDepth(0);
      label.setPosition(snapPos.x, snapPos.y);
      label.setDepth(1);
      obj.setDepth(0);

      // Check win
      this.checkWin();
    });

    this.startTime = Date.now();

    addFadeTransition(this);
  }

  private checkWin(): void {
    const isCorrect = this.currentOrder.every((val, i) => val === this.correctOrder[i]);
    if (isCorrect) {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      this.showResults(elapsed);
    }
  }

  private showResults(seconds: number): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, seconds, true); // lower time = better

    // Results panel
    const panelW = 320;
    const panelH = 220;
    createPanel(this, width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, {
      color: UI_COLORS.darkPanel,
      radius: 16,
      shadow: true,
      strokeColor: UI_COLORS.gold,
      strokeWidth: 2,
    }).setDepth(200);

    createStyledText(this, width / 2, height / 2 - 40, `Solved in ${seconds}s!`, {
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
