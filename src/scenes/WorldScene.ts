import Phaser from 'phaser';
import { loadGameState } from '../utils/storage';
import { loadOutfitSelection } from '../utils/storage';
import checkpointData from '../data/checkpoints.json';
import { PARTICLE_CONFIGS } from '../rendering/ParticleConfigs';
import {
  createStyledButton,
  createStyledText,
  createPillContainer,
  createPanel,
  addFadeTransition,
  UI_COLORS,
  createCloseButton,
} from '../rendering/UIRenderer';

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
  private progressBg!: Phaser.GameObjects.Graphics;
  private checkmarkSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private completionShown = false;
  private moveTarget: Phaser.Math.Vector2 | null = null;

  private playerTextureKey = '';
  private partnerTextureKey = '';

  private locationOutfitActive = false;
  private savedPlayerTexture = '';
  private savedPartnerTexture = '';

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
    this.createParticles();
    this.createLighting();
    addFadeTransition(this);
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

    // Flower patches at scenic positions
    const flowerPositions = [
      [6, 14], [18, 20], [25, 18], [32, 10], [10, 24], [22, 4],
    ];
    flowerPositions.forEach(([x, y]) => {
      const flower = this.add.image(x * tileSize + 16, y * tileSize + 16, 'flower-patch');
      flower.setDepth(y * tileSize - 1);
    });

    // Fence/hedge segments between areas
    const fencePositions = [
      [9, 12], [10, 12], [11, 12], [12, 12],
      [26, 6], [27, 6], [28, 6],
    ];
    fencePositions.forEach(([x, y]) => {
      const fence = this.add.image(x * tileSize + 16, y * tileSize + 16, 'fence');
      fence.setDepth(y * tileSize);
    });

    // Lamp posts along dirt paths
    const lampPositions = [
      [8, 15], [14, 15], [26, 15], [32, 15],
      [20, 8], [20, 12], [20, 18], [20, 24],
    ];
    lampPositions.forEach(([x, y]) => {
      const lamp = this.add.image(x * tileSize + 16, y * tileSize + 8, 'lamp-post');
      lamp.setDepth(y * tileSize);
    });

    this.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  private createPlayer(): void {
    const outfits = loadOutfitSelection();
    const textureKey = `her-outfit-${outfits.herOutfit}`;
    this.playerTextureKey = textureKey;

    // Use frame-0 of the pre-rendered character
    this.player = this.physics.add.sprite(20 * 32, 15 * 32, textureKey + '-frame-0');
    this.player.setScale(0.4); // 160px -> ~64px display
    this.player.setDepth(15 * 32);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(40, 40);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(60, 140);
  }

  private createPartner(): void {
    const outfits = loadOutfitSelection();
    const textureKey = `him-outfit-${outfits.hisOutfit}`;
    this.partnerTextureKey = textureKey;

    this.partner = this.add.sprite(20 * 32 + 40, 15 * 32, textureKey + '-frame-0');
    this.partner.setScale(0.4);
    this.partner.setDepth(15 * 32);
  }

  private createCheckpointZones(): void {
    const checkpoints = checkpointData.checkpoints;
    const state = loadGameState();

    const buildingTextureMap: Record<string, string> = {
      restaurant: 'building-restaurant',
      cafe: 'building-cafe',
      park: 'building-park',
      cinema: 'building-cinema',
      home: 'building-home',
      pizzeria: 'building-pizzeria',
    };

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

      const texKey = buildingTextureMap[cp.id] || 'building-restaurant';
      const bldg = this.add.image(pos.x, pos.y, texKey);
      bldg.setScale(0.6); // 256px * 0.6 = ~154px display
      bldg.setDepth(pos.y - 32);

      const glow = this.add.image(pos.x, pos.y, 'checkpoint-glow');
      glow.setScale(1.0);
      glow.setDepth(pos.y - 33);

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
    this.promptText = this.add.text(0, 0, '', { fontSize: '1px' })
      .setOrigin(0.5).setVisible(false).setDepth(99999);

    // We'll use a styled text for the prompt instead
    this.promptText = createStyledText(this, 0, 0, 'Tap here to enter', {
      fontSize: '14px',
      color: UI_COLORS.textHex,
      backgroundColor: '#1e1b4bcc',
      padding: { x: 12, y: 8 },
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

    // Styled progress pill
    const pill = createPillContainer(this, 60, 20, `${visited}/${total} places visited`);
    pill.bg.setScrollFactor(0).setDepth(90000);
    pill.label.setScrollFactor(0).setDepth(90001);
    this.progressText = pill.label;
    this.progressBg = pill.bg;

    // Settings button
    const settingsBtn = createStyledButton(this, this.cameras.main.width - 70, 20, 'Settings', {
      fontSize: '12px',
      paddingX: 12,
      paddingY: 6,
    });
    settingsBtn.container.setScrollFactor(0).setDepth(90000);
    settingsBtn.container.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('DressingRoomScene', { fromWorld: true });
    });

    // Fullscreen toggle (only if browser supports it)
    if (this.scale.fullscreen.available) {
      const fsBtn = createStyledButton(this, this.cameras.main.width - 70, 54, 'Fullscreen', {
        fontSize: '12px',
        paddingX: 12,
        paddingY: 6,
      });
      fsBtn.container.setScrollFactor(0).setDepth(90000);
      fsBtn.container.on('pointerdown', () => this.scale.toggleFullscreen());

      this.scale.on('enterfullscreen', () => fsBtn.label.setText('Exit FS'));
      this.scale.on('leavefullscreen', () => fsBtn.label.setText('Fullscreen'));
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

  private createParticles(): void {
    const positions: Record<string, { x: number; y: number }> = {
      park: { x: 20 * 32, y: 22 * 32 },
      cafe: { x: 30 * 32, y: 8 * 32 },
      home: { x: 4 * 32, y: 9 * 32 },
      pizzeria: { x: 14 * 32, y: 10 * 32 },
    };

    this.add.particles(positions.park.x, positions.park.y, 'particle-leaf', PARTICLE_CONFIGS.leaves);
    this.add.particles(positions.cafe.x, positions.cafe.y - 20, 'particle-steam', PARTICLE_CONFIGS.steam);
    this.add.particles(positions.home.x, positions.home.y, 'particle-sparkle', PARTICLE_CONFIGS.sparkles);
    this.add.particles(positions.pizzeria.x + 20, positions.pizzeria.y - 30, 'particle-smoke', PARTICLE_CONFIGS.smoke);
  }

  private createLighting(): void {
    const { width, height } = this.cameras.main;
    const vignette = this.add.graphics();
    vignette.setScrollFactor(0).setDepth(89000);
    // Dark edges
    vignette.fillStyle(0x000000, 0.15);
    vignette.fillRect(0, 0, width, 30); // top
    vignette.fillRect(0, height - 30, width, 30); // bottom
    vignette.fillRect(0, 0, 30, height); // left
    vignette.fillRect(width - 30, 0, 30, height); // right
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

    const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;

    if (isMoving) {
      this.playerPositionHistory.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (this.playerPositionHistory.length > 30) {
        this.playerPositionHistory.shift();
      }
      // Play walk animation and flip based on direction
      this.player.play(this.playerTextureKey + '-walk', true);
      if (body.velocity.x < 0) this.player.setFlipX(true);
      else if (body.velocity.x > 0) this.player.setFlipX(false);
    } else {
      // Idle — show neutral frame
      this.player.stop();
      this.player.setTexture(this.playerTextureKey + '-frame-0');
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
      const dx = Math.cos(angle) * partnerSpeed * (delta / 1000);
      this.partner.x += dx;
      this.partner.y += Math.sin(angle) * partnerSpeed * (delta / 1000);

      // Walk animation and direction
      this.partner.play(this.partnerTextureKey + '-walk', true);
      if (dx < 0) this.partner.setFlipX(true);
      else if (dx > 0) this.partner.setFlipX(false);
    } else {
      // Idle
      this.partner.stop();
      this.partner.setTexture(this.partnerTextureKey + '-frame-0');
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

    // Camera zoom on checkpoint entry/exit
    if (foundCheckpoint && !this.activeCheckpointId) {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.7,
        duration: 300,
        ease: 'Sine.easeOut',
      });
    }
    if (!foundCheckpoint && this.activeCheckpointId) {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.5,
        duration: 300,
        ease: 'Sine.easeOut',
      });
    }

    // Location-based outfit auto-apply
    if ((foundCheckpoint === 'restaurant' || foundCheckpoint === 'pizzeria') && !this.locationOutfitActive) {
      this.locationOutfitActive = true;
      this.savedPlayerTexture = this.playerTextureKey;
      this.savedPartnerTexture = this.partnerTextureKey;
      const outfitIdx = foundCheckpoint === 'restaurant' ? 5 : 6;
      this.playerTextureKey = `her-outfit-${outfitIdx}`;
      this.partnerTextureKey = `him-outfit-${outfitIdx}`;
      this.player.setTexture(this.playerTextureKey + '-frame-0');
      this.partner.setTexture(this.partnerTextureKey + '-frame-0');
    }

    if (!foundCheckpoint && this.locationOutfitActive) {
      this.locationOutfitActive = false;
      this.playerTextureKey = this.savedPlayerTexture;
      this.partnerTextureKey = this.savedPartnerTexture;
      this.player.setTexture(this.playerTextureKey + '-frame-0');
      this.partner.setTexture(this.partnerTextureKey + '-frame-0');
    }

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

    const panelW = 400;
    const panelH = 200;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;
    const panel = createPanel(this, panelX, panelY, panelW, panelH);
    panel.setScrollFactor(0).setDepth(95001);
    overlayElements.push(panel);

    const title = this.add.text(width / 2, height / 2 - 40, 'You visited all our places!', {
      fontSize: '28px', color: '#ffd700', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
    overlayElements.push(title);

    const msg = this.add.text(width / 2, height / 2 + 20, 'Thank you for being my favourite person.', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
    overlayElements.push(msg);

    const closeBtn = createStyledButton(this, width / 2, height / 2 + 70, 'Continue Exploring', {
      color: UI_COLORS.success,
    });
    closeBtn.container.setScrollFactor(0).setDepth(95002);
    overlayElements.push(closeBtn.container);

    closeBtn.container.on('pointerdown', () => {
      overlayElements.forEach((el) => el.destroy());
    });
  }

  applyOutfitChange(): void {
    const outfits = loadOutfitSelection();
    const herKey = `her-outfit-${outfits.herOutfit}`;
    const hisKey = `him-outfit-${outfits.hisOutfit}`;
    this.playerTextureKey = herKey;
    this.partnerTextureKey = hisKey;
    this.player.setTexture(herKey + '-frame-0');
    this.partner.setTexture(hisKey + '-frame-0');
  }
}
