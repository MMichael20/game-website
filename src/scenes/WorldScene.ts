import Phaser from 'phaser';
import { loadGameState, markCheckpointVisited } from '../utils/storage';
import checkpointData from '../data/checkpoints.json';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private partner!: Phaser.GameObjects.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private speed = 160;
  private checkpointZones: Phaser.GameObjects.Zone[] = [];
  private activeCheckpointId: string | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private playerPositionHistory: Phaser.Math.Vector2[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private checkmarkSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private completionShown = false;
  private moveTarget: Phaser.Math.Vector2 | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.createMap();
    this.createPlayer();
    this.createPartner();
    this.createCheckpointZones();
    this.createUI();
    this.setupCamera();
    this.setupInput();
  }

  private createMap(): void {
    const mapWidth = 40;
    const mapHeight = 30;
    const tileSize = 32;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        this.add.image(x * tileSize + 16, y * tileSize + 16, 'grass-tile');
      }
    }

    for (let x = 5; x < 35; x++) {
      this.add.image(x * tileSize + 16, 15 * tileSize + 16, 'dirt-tile');
    }
    for (let y = 5; y < 25; y++) {
      this.add.image(20 * tileSize + 16, y * tileSize + 16, 'dirt-tile');
    }

    const treePositions = [
      [3, 3], [7, 2], [2, 10], [8, 8], [15, 3], [30, 5],
      [35, 12], [5, 20], [12, 25], [28, 22], [33, 27], [37, 8],
    ];
    treePositions.forEach(([x, y]) => {
      const tree = this.add.image(x * tileSize + 16, y * tileSize + 8, 'tree');
      tree.setDepth(y * tileSize);
    });

    this.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  private createPlayer(): void {
    const state = loadGameState();
    this.player = this.physics.add.sprite(20 * 32, 15 * 32, 'character');
    this.player.setDepth(15 * 32);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(12, 24);

    if (state.avatar1) {
      const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
      this.player.setTint(outfitColors[state.avatar1.outfit] || 0xffffff);
    }
  }

  private createPartner(): void {
    const state = loadGameState();
    this.partner = this.add.sprite(20 * 32 + 40, 15 * 32, 'character');
    this.partner.setDepth(15 * 32);

    if (state.avatar2) {
      const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
      this.partner.setTint(outfitColors[state.avatar2.outfit] || 0xffaacc);
    } else {
      this.partner.setTint(0xffaacc);
    }
  }

  private createCheckpointZones(): void {
    const checkpoints = checkpointData.checkpoints;
    const state = loadGameState();

    checkpoints.forEach((cp) => {
      const positions: Record<string, { x: number; y: number }> = {
        restaurant: { x: 10 * 32, y: 8 * 32 },
        cafe: { x: 30 * 32, y: 8 * 32 },
        park: { x: 20 * 32, y: 22 * 32 },
        cinema: { x: 16 * 32, y: 6 * 32 },
        home: { x: 4 * 32, y: 9 * 32 },
        pizzeria: { x: 14 * 32, y: 10 * 32 },
      };

      const pos = positions[cp.id];
      if (!pos) return;

      const bldg = this.add.image(pos.x, pos.y, 'building');
      bldg.setDepth(pos.y - 32);

      this.add.image(pos.x, pos.y, 'checkpoint-glow').setDepth(pos.y - 33);

      if (state.visitedCheckpoints.includes(cp.id)) {
        const cm = this.add.image(pos.x + 24, pos.y - 24, 'checkmark').setDepth(pos.y);
        this.checkmarkSprites.set(cp.id, cm);
      }

      this.add.text(pos.x, pos.y + 40, cp.name, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(pos.y);

      const zone = this.add.zone(pos.x, pos.y, 80, 80);
      this.physics.add.existing(zone, true);
      (zone as any).checkpointId = cp.id;
      this.checkpointZones.push(zone);
    });
  }

  private createUI(): void {
    this.promptText = this.add.text(0, 0, 'Tap here to enter', {
      fontSize: '14px',
      color: '#ffd700',
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setVisible(false).setDepth(99999);

    // Mobile checkpoint interaction — tap the prompt to enter
    this.promptText.on('pointerdown', () => {
      if (this.activeCheckpointId) {
        this.openMemoryCard(this.activeCheckpointId);
      }
    });

    const state = loadGameState();
    const total = checkpointData.checkpoints.length;
    const visited = state.visitedCheckpoints.length;
    this.progressText = this.add.text(10, 10, `${visited}/${total} places visited`, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(90000);

    const settingsBtn = this.add.text(this.cameras.main.width - 10, 10, '[ Settings ]', {
      fontSize: '14px',
      color: '#94a3b8',
      backgroundColor: '#00000088',
      padding: { x: 12, y: 10 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(90000).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('AvatarScene', { fromWorld: true });
    });

    // Fullscreen toggle (only if browser supports it)
    if (this.scale.fullscreen.available) {
      const fsBtn = this.add.text(this.cameras.main.width - 10, 44, '[ Fullscreen ]', {
        fontSize: '14px',
        color: '#94a3b8',
        backgroundColor: '#00000088',
        padding: { x: 12, y: 10 },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(90000).setInteractive({ useHandCursor: true });

      fsBtn.on('pointerdown', () => this.scale.toggleFullscreen());

      this.scale.on('enterfullscreen', () => fsBtn.setText('[ Exit FS ]'));
      this.scale.on('leavefullscreen', () => fsBtn.setText('[ Fullscreen ]'));
    }
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 40 * 32, 30 * 32);
    this.cameras.main.setZoom(1.5);
  }

  private setupInput(): void {
    // Guard for keyboard-less devices
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => {
        if (this.activeCheckpointId) {
          this.openMemoryCard(this.activeCheckpointId);
        }
      });
    }

    // Tap-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Skip if the tap hit an interactive UI element
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length > 0) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const clampedX = Phaser.Math.Clamp(worldPoint.x, 0, 40 * 32);
      const clampedY = Phaser.Math.Clamp(worldPoint.y, 0, 30 * 32);
      this.moveTarget = new Phaser.Math.Vector2(clampedX, clampedY);
    });
  }

  update(_time: number, delta: number): void {
    this.handleMovement();
    this.updatePartner(delta);
    this.checkCheckpointOverlap();
    this.updateDepthSorting();
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const up = (this.cursors?.up.isDown ?? false) || (this.wasd?.up.isDown ?? false);
    const down = (this.cursors?.down.isDown ?? false) || (this.wasd?.down.isDown ?? false);
    const left = (this.cursors?.left.isDown ?? false) || (this.wasd?.left.isDown ?? false);
    const right = (this.cursors?.right.isDown ?? false) || (this.wasd?.right.isDown ?? false);
    const keyboardActive = up || down || left || right;

    if (keyboardActive) {
      // Keyboard takes priority — cancel any tap target
      this.moveTarget = null;

      if (left) body.setVelocityX(-this.speed);
      else if (right) body.setVelocityX(this.speed);

      if (up) body.setVelocityY(-this.speed);
      else if (down) body.setVelocityY(this.speed);

      if (body.velocity.x !== 0 && body.velocity.y !== 0) {
        body.velocity.normalize().scale(this.speed);
      }
    } else if (this.moveTarget) {
      // Tap-to-move
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.moveTarget.x, this.moveTarget.y
      );

      if (dist <= 4) {
        // Arrived — snap and stop
        this.player.setPosition(this.moveTarget.x, this.moveTarget.y);
        this.moveTarget = null;
      } else {
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          this.moveTarget.x, this.moveTarget.y
        );
        body.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
      }
    }

    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      this.playerPositionHistory.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (this.playerPositionHistory.length > 30) {
        this.playerPositionHistory.shift();
      }
    }
  }

  private updatePartner(delta: number): void {
    const dist = Phaser.Math.Distance.Between(
      this.partner.x, this.partner.y,
      this.player.x, this.player.y
    );

    if (dist > 48 && this.playerPositionHistory.length > 10) {
      const target = this.playerPositionHistory[0];
      const angle = Phaser.Math.Angle.Between(
        this.partner.x, this.partner.y,
        target.x, target.y
      );
      const partnerSpeed = this.speed * 0.9;
      this.partner.x += Math.cos(angle) * partnerSpeed * (delta / 1000);
      this.partner.y += Math.sin(angle) * partnerSpeed * (delta / 1000);
    }
  }

  private checkCheckpointOverlap(): void {
    let foundCheckpoint: string | null = null;

    this.checkpointZones.forEach((zone) => {
      const playerBounds = this.player.getBounds();
      const zoneBounds = new Phaser.Geom.Rectangle(
        zone.x - zone.width / 2,
        zone.y - zone.height / 2,
        zone.width,
        zone.height
      );

      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zoneBounds)) {
        foundCheckpoint = (zone as any).checkpointId;
      }
    });

    this.activeCheckpointId = foundCheckpoint;

    if (foundCheckpoint) {
      this.promptText.setVisible(true);
      this.promptText.setInteractive({ useHandCursor: true });
      this.promptText.setPosition(this.player.x, this.player.y - 40);
    } else {
      this.promptText.setVisible(false);
      this.promptText.disableInteractive();
    }
  }

  private updateDepthSorting(): void {
    this.player.setDepth(this.player.y);
    this.partner.setDepth(this.partner.y);
  }

  private openMemoryCard(checkpointId: string): void {
    this.scene.pause();
    this.scene.launch('MemoryCard', { checkpointId });
  }

  refreshUI(): void {
    const state = loadGameState();
    const total = checkpointData.checkpoints.length;
    const visited = state.visitedCheckpoints.length;
    this.progressText.setText(`${visited}/${total} places visited`);

    const positions: Record<string, { x: number; y: number }> = {
      restaurant: { x: 10 * 32, y: 8 * 32 },
      cafe: { x: 30 * 32, y: 8 * 32 },
      park: { x: 20 * 32, y: 22 * 32 },
      cinema: { x: 16 * 32, y: 6 * 32 },
      home: { x: 4 * 32, y: 9 * 32 },
      pizzeria: { x: 14 * 32, y: 10 * 32 },
    };

    state.visitedCheckpoints.forEach((cpId) => {
      if (!this.checkmarkSprites.has(cpId)) {
        const pos = positions[cpId];
        if (pos) {
          const cm = this.add.image(pos.x + 24, pos.y - 24, 'checkmark').setDepth(pos.y);
          this.checkmarkSprites.set(cpId, cm);
        }
      }
    });

    if (visited === total && total > 0 && !this.completionShown) {
      this.completionShown = true;
      this.showCompletionOverlay();
    }
  }

  private showCompletionOverlay(): void {
    const { width, height } = this.cameras.main;
    const overlayElements: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(95000);
    overlayElements.push(overlay);

    const title = this.add.text(width / 2, height / 2 - 40, 'You visited all our places!', {
      fontSize: '28px', color: '#ffd700', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95001);
    overlayElements.push(title);

    const msg = this.add.text(width / 2, height / 2 + 20, 'Thank you for being my favourite person.', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95001);
    overlayElements.push(msg);

    const closeBtn = this.add.text(width / 2, height / 2 + 70, '[ Continue Exploring ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(95001);
    overlayElements.push(closeBtn);

    closeBtn.on('pointerdown', () => {
      overlayElements.forEach((el) => el.destroy());
    });
  }

  applyAvatarTints(): void {
    const state = loadGameState();
    const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
    if (state.avatar1) {
      this.player.setTint(outfitColors[state.avatar1.outfit] || 0xffffff);
    }
    if (state.avatar2) {
      this.partner.setTint(outfitColors[state.avatar2.outfit] || 0xffaacc);
    }
  }
}
