import Phaser from 'phaser';
import { loadGameState } from '../utils/storage';
import { loadOutfitSelection } from '../utils/storage';
import checkpointData from '../data/checkpoints.json';
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE,
  TREE_POSITIONS, FLOWER_POSITIONS, FENCE_POSITIONS, LAMP_POSITIONS,
  CHECKPOINT_POSITIONS, DECORATIONS, DECORATIVE_BUILDINGS,
  NPCS, PATH_NETWORK,
} from '../data/mapLayout';
import { NPCSystem } from '../systems/NPCSystem';
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
import { SkyRenderer } from '../rendering/SkyRenderer';

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
  private playerMoving = false;
  private partnerMoving = false;

  private skyRenderer!: SkyRenderer;
  private settingsBtnContainer!: Phaser.GameObjects.Container;
  private fsBtnContainer?: Phaser.GameObjects.Container;
  private gameTimeMinutes = 480; // start at 8am
  private npcSystem!: NPCSystem;
  private playerIdleTween?: Phaser.Tweens.Tween;
  private partnerIdleTween?: Phaser.Tweens.Tween;
  private baseZoom = 1.5;
  private vignetteGfx?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'WorldScene' });
  }

  private toScreenPos(sx: number, sy: number): { x: number; y: number } {
    const { width, height } = this.cameras.main;
    const zoom = this.cameras.main.zoom;
    return {
      x: (sx - width / 2) / zoom + width / 2,
      y: (sy - height / 2) / zoom + height / 2,
    };
  }

  create(): void {
    // Sky background — must be created before map tiles
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    this.createMap();
    this.createPlayer();
    this.createPartner();

    // Idle breathing animation — subtle horizontal scale to simulate chest expansion
    this.playerIdleTween = this.tweens.add({
      targets: this.player,
      scaleX: this.player.scaleX * 1.015,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    this.partnerIdleTween = this.tweens.add({
      targets: this.partner,
      scaleX: this.partner.scaleX * 1.015,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    // Start idle immediately (player starts standing)
    this.playerIdleTween.resume();
    this.partnerIdleTween.resume();

    this.createCheckpointZones();
    this.createUI();
    this.setupCamera();
    this.setupInput();
    this.createParticles();
    this.npcSystem = new NPCSystem(this, NPCS, PATH_NETWORK);
    this.createLighting();
    addFadeTransition(this);
  }

  private createMap(): void {
    const mapW = MAP_WIDTH * TILE_SIZE;
    const mapH = MAP_HEIGHT * TILE_SIZE;

    // Single pre-rendered ground image (replaces ~1260 individual tile sprites)
    if (this.textures.exists('ground-canvas')) {
      this.add.image(mapW / 2, mapH / 2, 'ground-canvas');
    } else {
      // Legacy fallback: individual tiles
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'grass-tile');
        }
      }
      for (let x = 5; x < 35; x++) {
        this.add.image(x * TILE_SIZE + 16, 15 * TILE_SIZE + 16, 'dirt-tile');
      }
      for (let y = 5; y < 25; y++) {
        this.add.image(20 * TILE_SIZE + 16, y * TILE_SIZE + 16, 'dirt-tile');
      }
    }

    // Trees
    TREE_POSITIONS.forEach(([x, y]) => {
      const tree = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 8, 'tree');
      tree.setDepth(y * TILE_SIZE);
    });

    // Flowers
    FLOWER_POSITIONS.forEach(([x, y]) => {
      const flower = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'flower-patch');
      flower.setDepth(y * TILE_SIZE - 1);
    });

    // Fences
    FENCE_POSITIONS.forEach(([x, y]) => {
      const fence = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'fence');
      fence.setDepth(y * TILE_SIZE);
    });

    // Lamp posts
    LAMP_POSITIONS.forEach(([x, y]) => {
      const lamp = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 8, 'lamp-post');
      lamp.setDepth(y * TILE_SIZE);
    });

    // Street decorations (benches, mailboxes, etc.)
    DECORATIONS.forEach((dec) => {
      const key = dec.type;
      if (this.textures.exists(key)) {
        const sprite = this.add.image(
          dec.tileX * TILE_SIZE + 16,
          dec.tileY * TILE_SIZE + 16,
          key,
        );
        sprite.setScale(dec.scale ?? 1);
        sprite.setDepth(dec.tileY * TILE_SIZE);
      }
    });

    // Decorative (non-interactive) buildings
    DECORATIVE_BUILDINGS.forEach((bldg) => {
      const texKey = `building-${bldg.type}`;
      if (this.textures.exists(texKey)) {
        const worldX = bldg.tileX * TILE_SIZE;
        const worldY = bldg.tileY * TILE_SIZE;
        const sprite = this.add.image(worldX, worldY, texKey);
        sprite.setScale(bldg.scale);
        sprite.setDepth(worldY - 32);

        // Label
        this.add.text(worldX, worldY + 40, bldg.label, {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(worldY);
      }
    });

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
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
      const pos = CHECKPOINT_POSITIONS[cp.id];
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

    // Styled progress pill — zoom-compensated position
    const pillPos = this.toScreenPos(60, 20);
    const pill = createPillContainer(this, pillPos.x, pillPos.y, `${visited}/${total} places visited`);
    pill.bg.setScrollFactor(0).setDepth(90000);
    pill.label.setScrollFactor(0).setDepth(90001);
    this.progressText = pill.label;
    this.progressBg = pill.bg;

    // Settings button — zoom-compensated position
    const settingsPos = this.toScreenPos(this.cameras.main.width - 70, 20);
    const settingsBtn = createStyledButton(this, settingsPos.x, settingsPos.y, 'Settings', {
      fontSize: '12px',
      paddingX: 12,
      paddingY: 6,
    });
    settingsBtn.container.setScrollFactor(0).setDepth(90000);
    settingsBtn.container.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('DressingRoomScene', { fromWorld: true });
    });
    this.settingsBtnContainer = settingsBtn.container;

    // Fullscreen toggle (only if browser supports it)
    if (this.scale.fullscreen.available) {
      const fsPos = this.toScreenPos(this.cameras.main.width - 70, 54);
      const fsBtn = createStyledButton(this, fsPos.x, fsPos.y, 'Fullscreen', {
        fontSize: '12px',
        paddingX: 12,
        paddingY: 6,
      });
      fsBtn.container.setScrollFactor(0).setDepth(90000);
      fsBtn.container.on('pointerdown', () => this.scale.toggleFullscreen());
      this.fsBtnContainer = fsBtn.container;

      this.scale.on('enterfullscreen', () => fsBtn.label.setText('Exit FS'));
      this.scale.on('leavefullscreen', () => fsBtn.label.setText('Fullscreen'));
    }

    // Reposition UI on resize — zoom-compensated
    this.scale.on('resize', (_gameSize: Phaser.Structs.Size) => {
      this.recalculateZoom();
      const sPos = this.toScreenPos(this.cameras.main.width - 70, 20);
      this.settingsBtnContainer.setPosition(sPos.x, sPos.y);
      if (this.fsBtnContainer) {
        const fPos = this.toScreenPos(this.cameras.main.width - 70, 54);
        this.fsBtnContainer.setPosition(fPos.x, fPos.y);
      }
      const pPos = this.toScreenPos(60, 20);
      this.progressBg.setPosition(pPos.x, pPos.y);
      this.progressText.setPosition(pPos.x, pPos.y);
      this.redrawVignette();
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.recalculateZoom();
  }

  private recalculateZoom(): void {
    const { width, height } = this.cameras.main;
    const mapW = MAP_WIDTH * TILE_SIZE;
    const mapH = MAP_HEIGHT * TILE_SIZE;
    const targetZoom = width / 450;
    const minZoomForMap = Math.max(width / mapW, height / mapH);
    this.baseZoom = Phaser.Math.Clamp(Math.max(targetZoom, minZoomForMap), 0.5, 3);
    this.cameras.main.setZoom(this.baseZoom);
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
      const clampedX = Phaser.Math.Clamp(worldPoint.x, 0, MAP_WIDTH * TILE_SIZE);
      const clampedY = Phaser.Math.Clamp(worldPoint.y, 0, MAP_HEIGHT * TILE_SIZE);
      this.moveTarget = new Phaser.Math.Vector2(clampedX, clampedY);
    });
  }

  private createParticles(): void {
    // Park leaves
    this.add.particles(
      CHECKPOINT_POSITIONS.park.x, CHECKPOINT_POSITIONS.park.y,
      'particle-leaf',
      PARTICLE_CONFIGS.leaves as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Cafe steam
    this.add.particles(
      CHECKPOINT_POSITIONS.cafe.x, CHECKPOINT_POSITIONS.cafe.y - 20,
      'particle-steam',
      PARTICLE_CONFIGS.steam as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Home sparkles
    this.add.particles(
      CHECKPOINT_POSITIONS.home.x, CHECKPOINT_POSITIONS.home.y,
      'particle-sparkle',
      PARTICLE_CONFIGS.sparkles as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Pizzeria smoke
    this.add.particles(
      CHECKPOINT_POSITIONS.pizzeria.x + 20, CHECKPOINT_POSITIONS.pizzeria.y - 30,
      'particle-smoke',
      PARTICLE_CONFIGS.smoke as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Butterflies near park
    this.add.particles(
      CHECKPOINT_POSITIONS.park.x, CHECKPOINT_POSITIONS.park.y,
      'particle-butterfly',
      PARTICLE_CONFIGS.butterflies as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Fountain water effect
    this.add.particles(
      22 * TILE_SIZE, 22 * TILE_SIZE - 10,
      'particle-water',
      PARTICLE_CONFIGS.fountainWater as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Bakery chimney smoke
    this.add.particles(
      6 * TILE_SIZE + 20, 15 * TILE_SIZE - 30,
      'particle-smoke',
      PARTICLE_CONFIGS.smoke as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );
  }

  private createLighting(): void {
    this.vignetteGfx = this.add.graphics();
    this.vignetteGfx.setScrollFactor(0).setDepth(89000);
    this.redrawVignette();
  }

  private redrawVignette(): void {
    if (!this.vignetteGfx) return;
    const { width, height } = this.cameras.main;
    const zoom = this.cameras.main.zoom;
    this.vignetteGfx.clear();
    this.vignetteGfx.fillStyle(0x000000, 0.15);
    // Zoom-compensated origin and dimensions so borders touch actual screen edges
    const ox = -(1 - zoom) * width / (2 * zoom);
    const oy = -(1 - zoom) * height / (2 * zoom);
    const drawW = width / zoom;
    const drawH = height / zoom;
    const screenBorder = Math.max(10, Math.min(30, Math.min(width, height) * 0.04));
    const border = screenBorder / zoom;
    this.vignetteGfx.fillRect(ox, oy, drawW, border); // top
    this.vignetteGfx.fillRect(ox, oy + drawH - border, drawW, border); // bottom
    this.vignetteGfx.fillRect(ox, oy, border, drawH); // left
    this.vignetteGfx.fillRect(ox + drawW - border, oy, border, drawH); // right
  }

  update(_time: number, delta: number): void {
    // Advance game time and update sky
    this.gameTimeMinutes = (this.gameTimeMinutes + delta * 0.0005) % 1440;
    this.skyRenderer.update(this, this.gameTimeMinutes, delta);

    this.handleMovement();
    this.updatePartner(delta);
    this.checkCheckpointOverlap();
    this.npcSystem.update(delta, this.gameTimeMinutes);
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
      if (!this.playerMoving) {
        this.playerIdleTween?.pause();
      }
      this.playerMoving = true;
    } else if (this.playerMoving) {
      // Transition to idle — set texture once
      this.playerMoving = false;
      this.player.stop();
      this.player.setTexture(this.playerTextureKey + '-frame-0');
      this.playerIdleTween?.resume();
    }
  }

  private updatePartner(delta: number): void {
    const dist = Phaser.Math.Distance.Between(
      this.partner.x, this.partner.y,
      this.player.x, this.player.y
    );

    if (dist > 48 && this.playerPositionHistory.length > 10) {
      const target = this.playerPositionHistory[0];
      const targetDist = Phaser.Math.Distance.Between(
        this.partner.x, this.partner.y,
        target.x, target.y
      );

      let dx: number;
      if (targetDist < 6) {
        // Close enough to target — snap and consume
        this.partner.x = target.x;
        this.partner.y = target.y;
        dx = 0;
      } else if (targetDist < 20) {
        // Lerp for smooth deceleration near target
        const prevX = this.partner.x;
        this.partner.x = Phaser.Math.Linear(this.partner.x, target.x, 0.08);
        this.partner.y = Phaser.Math.Linear(this.partner.y, target.y, 0.08);
        dx = this.partner.x - prevX;
      } else {
        // Normal constant-speed movement
        const angle = Phaser.Math.Angle.Between(
          this.partner.x, this.partner.y,
          target.x, target.y
        );
        const partnerSpeed = this.speed * 0.9;
        dx = Math.cos(angle) * partnerSpeed * (delta / 1000);
        this.partner.x += dx;
        this.partner.y += Math.sin(angle) * partnerSpeed * (delta / 1000);
      }

      // Walk animation and direction
      this.partner.play(this.partnerTextureKey + '-walk', true);
      if (dx < -0.1) this.partner.setFlipX(true);
      else if (dx > 0.1) this.partner.setFlipX(false);
      if (!this.partnerMoving) {
        this.partnerIdleTween?.pause();
      }
      this.partnerMoving = true;
    } else if (this.partnerMoving) {
      // Transition to idle — snap to pixel grid to prevent sub-pixel blur
      this.partnerMoving = false;
      this.partner.x = Math.round(this.partner.x);
      this.partner.y = Math.round(this.partner.y);
      this.partner.stop();
      this.partner.setTexture(this.partnerTextureKey + '-frame-0');
      this.partnerIdleTween?.resume();
    } else if (!this.playerMoving && dist > 6) {
      // Player stopped but partner not yet settled — gently drift to final position
      this.partner.x = Phaser.Math.Linear(this.partner.x, this.player.x - 40, 0.05);
      this.partner.y = Phaser.Math.Linear(this.partner.y, this.player.y, 0.05);
      // Snap when close enough
      if (dist < 8) {
        this.partner.x = Math.round(this.partner.x);
        this.partner.y = Math.round(this.partner.y);
      }
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
        zoom: this.baseZoom * 1.12,
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => this.redrawVignette(),
      });
    }
    if (!foundCheckpoint && this.activeCheckpointId) {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: this.baseZoom,
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => this.redrawVignette(),
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

    const positions = CHECKPOINT_POSITIONS;

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
    const zoom = this.cameras.main.zoom;
    const overlayElements: Phaser.GameObjects.GameObject[] = [];

    // Zoom-compensated center and dimensions for full-screen coverage
    const center = this.toScreenPos(width / 2, height / 2);
    const drawW = width / zoom;
    const drawH = height / zoom;

    const overlay = this.add.rectangle(center.x, center.y, drawW, drawH, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(95000);
    overlayElements.push(overlay);

    const panelW = Math.min(400, width * 0.9);
    const panelH = Math.min(200, height * 0.4);
    const panelPos = this.toScreenPos((width - panelW) / 2, (height - panelH) / 2);
    const panel = createPanel(this, panelPos.x, panelPos.y, panelW, panelH);
    panel.setScrollFactor(0).setDepth(95001);
    overlayElements.push(panel);

    const titleFs = Math.min(28, Math.round(width * 0.07));
    const titlePos = this.toScreenPos(width / 2, height / 2 - 40);
    const title = this.add.text(titlePos.x, titlePos.y, 'You visited all our places!', {
      fontSize: `${titleFs}px`, color: '#ffd700', align: 'center',
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
    overlayElements.push(title);

    const msgPos = this.toScreenPos(width / 2, height / 2 + 20);
    const msg = this.add.text(msgPos.x, msgPos.y, 'Thank you for being my favourite person.', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95002);
    overlayElements.push(msg);

    const btnPos = this.toScreenPos(width / 2, height / 2 + 70);
    const closeBtn = createStyledButton(this, btnPos.x, btnPos.y, 'Continue Exploring', {
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
