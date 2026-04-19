// src/game/scenes/budapest/AirbnbShowerScene.ts
// Romantic shower cutscene — layered body-part animation for realistic movement
// Each character is split into head, body, and arms that animate independently

import Phaser from 'phaser';
import {
  addLetterbox, removeLetterbox, showDialogue, addSkipButton,
  addHeartParticles, AnimationSet,
} from './cutsceneHelpers';
import { generateShowerLayered } from '../../rendering/BudapestTextures';
import { BP_PROP_KEYS } from '../../rendering/BudapestWorldProps';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';
import { audioManager } from '../../../audio/AudioManager';
import { startScene } from '../sceneData';

export class AirbnbShowerScene extends Phaser.Scene {
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'AirbnbShowerScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    audioManager.transitionToScene(this.scene.key);

    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);

    // ── Generate layered body-part textures ──
    const state = loadGameState();
    const playerOutfit = OUTFIT_STYLES[state.outfits.player] ?? OUTFIT_STYLES[0];
    const partnerOutfit = OUTFIT_STYLES[state.outfits.partner] ?? OUTFIT_STYLES[0];
    generateShowerLayered(this, playerOutfit, partnerOutfit);

    addSkipButton(this, 'BudapestAirbnbScene', { returnX: this.returnX, returnY: this.returnY });

    const activeAnims: AnimationSet[] = [];

    // ── Background: luxury marble bathroom ──

    // Base wall color — warm cream marble
    this.add.rectangle(w / 2, h / 2, w, h, 0xF5F0E8).setDepth(0);

    // Marble wall tiles — pre-rendered marble floor tile, tileSprite covers the
    // upper 70% of the scene in one draw (replaces per-cell rectangles).
    const upperH = Math.ceil(h * 0.7);
    this.add.tileSprite(0, 0, w, upperH, BP_PROP_KEYS.showerFloorTile)
      .setOrigin(0, 0).setDepth(1);
    // Marble vein details still drawn per-cell (UI/EFFECT overlay — preserved).
    for (let tx = 0; tx < Math.ceil(w / 32); tx++) {
      for (let ty = 0; ty < Math.ceil(h * 0.7 / 32); ty++) {
        if ((tx + ty * 3) % 5 === 0) {
          this.add.rectangle(tx * 32 + 10, ty * 32 + 14, 12, 1, 0xDDD8CF, 0.4).setDepth(1);
        }
        if ((tx * 2 + ty) % 7 === 0) {
          this.add.rectangle(tx * 32 + 20, ty * 32 + 22, 8, 1, 0xE0DBD0, 0.3).setDepth(1);
        }
      }
    }

    // Tile border strip (gold accent line between wall and floor)
    this.add.rectangle(w / 2, h * 0.7, w, 3, 0xD4A843).setDepth(2);

    // Floor tiles — darker marble reuses the same pre-rendered tile, tinted darker.
    const floorTop = h * 0.7 + 10;
    this.add.tileSprite(0, floorTop, w, h - floorTop, BP_PROP_KEYS.showerFloorTile)
      .setOrigin(0, 0).setDepth(1).setTint(0xC8C0B0);

    // Drain in floor center — single pre-rendered asset replaces 3 circles.
    this.add.image(w / 2, h * 0.88, BP_PROP_KEYS.showerDrain).setDepth(2);

    // ── Glass shower enclosure ──
    // Left glass wall — rail rotated 90° to read vertical, then display-sized.
    this.add.image(60, h / 2, BP_PROP_KEYS.showerRail)
      .setDepth(4).setRotation(Math.PI / 2).setDisplaySize(h * 0.85, 4);
    // Left glass chrome frame highlight
    this.add.image(58, h / 2, BP_PROP_KEYS.showerRail)
      .setDepth(4).setRotation(Math.PI / 2).setDisplaySize(h * 0.85, 2).setAlpha(0.8);
    // Right glass wall
    this.add.image(w - 60, h / 2, BP_PROP_KEYS.showerRail)
      .setDepth(4).setRotation(Math.PI / 2).setDisplaySize(h * 0.85, 4);
    // Right glass chrome frame highlight
    this.add.image(w - 58, h / 2, BP_PROP_KEYS.showerRail)
      .setDepth(4).setRotation(Math.PI / 2).setDisplaySize(h * 0.85, 2).setAlpha(0.8);
    // Top glass rail (horizontal)
    this.add.image(w / 2, h * 0.08, BP_PROP_KEYS.showerRail)
      .setDepth(4).setDisplaySize(w - 116, 4);

    // ── Rain shower head — single pre-rendered asset (arm + disc + nozzles). ──
    this.add.image(w / 2 + 12, 22, BP_PROP_KEYS.showerHead).setDepth(3);

    // ── Chrome fixtures on right wall ──
    // Temperature knob — single pre-rendered asset (chrome rim + gold center + H/C).
    this.add.image(w - 75, h * 0.45, BP_PROP_KEYS.showerKnob).setDepth(3);

    // ── Shelf with bottles (left wall) ──
    // Shelf — short rail section
    this.add.image(75, h * 0.35, BP_PROP_KEYS.showerRail)
      .setDepth(3).setDisplaySize(30, 4);
    // Shampoo bottle (tall, amber) — fixture-base tinted amber
    this.add.image(67, h * 0.35 - 10, BP_PROP_KEYS.showerFixtureBase)
      .setDepth(3).setDisplaySize(6, 16).setTint(0xDAA520);
    // Conditioner bottle (white) — fixture-base tinted white
    this.add.image(77, h * 0.35 - 8, BP_PROP_KEYS.showerFixtureBase)
      .setDepth(3).setDisplaySize(7, 12).setTint(0xF5F5F5);
    // Soap bar (pink) — fixture-base tinted pink
    this.add.image(85, h * 0.35 - 4, BP_PROP_KEYS.showerFixtureBase)
      .setDepth(3).setDisplaySize(8, 4).setTint(0xFFB6C1);

    // ── Warm ambient light glow from above ──
    this.add.circle(w / 2, 30, 80, 0xFFF8E7, 0.06).setDepth(2);
    this.add.circle(w / 2, 30, 50, 0xFFF8E7, 0.04).setDepth(2);

    // Mist overlay
    const mistOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xFFFFFF)
      .setAlpha(0.05).setDepth(40);

    // ── Steam & water helpers ──
    const spawnSteam = (sx: number, sy: number) => {
      const steam = this.add.circle(
        sx + (Math.random() - 0.5) * 60, sy,
        4 + Math.random() * 5, 0xFFFFFF,
      ).setAlpha(0.2).setDepth(35);
      this.tweens.add({
        targets: steam,
        y: sy - 40 - Math.random() * 30,
        x: steam.x + (Math.random() - 0.5) * 20,
        alpha: 0, scaleX: 2, scaleY: 2,
        duration: 2500 + Math.random() * 1500,
        onComplete: () => steam.destroy(),
      });
    };

    const spawnWaterDrop = () => {
      const x = w * 0.25 + Math.random() * w * 0.5;
      const drop = this.add.rectangle(x, 30, 1.5, 5 + Math.random() * 4, 0x6699CC)
        .setAlpha(0.35 + Math.random() * 0.2).setDepth(30);
      this.tweens.add({
        targets: drop, y: h + 10,
        duration: 300 + Math.random() * 200, ease: 'Linear',
        onComplete: () => drop.destroy(),
      });
    };

    // Letterbox
    const bars = addLetterbox(this);

    // ════════════════════════════════════════════════════════
    // BUILD LAYERED CHARACTER SPRITES
    // ════════════════════════════════════════════════════════

    // All parts go in a container for unified scaling
    const coupleContainer = this.add.container(w / 2, h * 0.5).setDepth(20);

    // --- HIM (drawn first, behind her in the hug) ---
    // Positions relative to container center (0,0)

    const himBody = this.add.image(18, 8, 'shower-him-body').setOrigin(0.5, 0);
    // Head bottom must overlap body top (neck). His head: 34px tall, origin 0.5 = center at 17px
    // Bottom of head = y + 17, body top = 8 → y = 8 - 17 + 3(overlap) = -6
    const himHead = this.add.image(18, -6, 'shower-him-head').setOrigin(0.5, 0.5).setAngle(-5);
    // Arms at shoulder height: body y=8, shoulders at ~y=4 in texture → world y=12
    const himArmL = this.add.image(2, 12, 'shower-him-arm').setOrigin(0.5, 0);
    const himArmR = this.add.image(34, 12, 'shower-him-arm').setOrigin(0.5, 0).setFlipX(true);

    // --- HER (in front, overlapping slightly for hug) ---
    const herBody = this.add.image(-10, 6, 'shower-her-body').setOrigin(0.5, 0);
    // Her head: 30px tall, origin 0.5 = center at 15px
    // Bottom = y + 15, body top = 6 → y = 6 - 15 + 3(overlap) = -6
    const herHead = this.add.image(-10, -6, 'shower-her-head').setOrigin(0.5, 0.5).setAngle(5);
    // Arms at shoulder height: body y=6, shoulders at ~y=4 in texture → world y=10
    const herArmL = this.add.image(-24, 10, 'shower-her-arm').setOrigin(0.5, 0);
    const herArmR = this.add.image(4, 10, 'shower-her-arm').setOrigin(0.5, 0).setFlipX(true);

    // Add to container in draw order (back to front)
    coupleContainer.add([
      himArmL, himBody, himArmR,
      herArmL, herBody, herArmR,
      himHead, herHead,
    ]);

    // Start invisible, small
    coupleContainer.setScale(1.5).setAlpha(0);

    // ════════════════════════════════════════════════════════
    // PHASE 1: Stepping In (0–5s)
    // Arms at sides, breathing, fade in
    // ════════════════════════════════════════════════════════

    // Fade in + zoom
    this.tweens.add({
      targets: coupleContainer,
      alpha: 1, scaleX: 2.5, scaleY: 2.5,
      duration: 3000, ease: 'Sine.easeInOut',
    });

    // Independent breathing — her chest rises more (bust emphasis)
    const herBreath = this.tweens.add({
      targets: herBody, y: herBody.y - 1.5,
      duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const herHeadBreath = this.tweens.add({
      targets: herHead, y: herHead.y - 2,
      duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const himBreath = this.tweens.add({
      targets: himBody, y: himBody.y - 1,
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const himHeadBreath = this.tweens.add({
      targets: himHead, y: himHead.y - 1.5,
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    // Arms follow body breathing
    const herArmBreathL = this.tweens.add({
      targets: herArmL, y: herArmL.y - 1.5,
      duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const herArmBreathR = this.tweens.add({
      targets: herArmR, y: herArmR.y - 1.5,
      duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const himArmBreathL = this.tweens.add({
      targets: himArmL, y: himArmL.y - 1,
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    const himArmBreathR = this.tweens.add({
      targets: himArmR, y: himArmR.y - 1,
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });

    activeAnims.push({
      tweens: [herBreath, herHeadBreath, himBreath, himHeadBreath,
               herArmBreathL, herArmBreathR, himArmBreathL, himArmBreathR],
      kill: () => {
        [herBreath, herHeadBreath, himBreath, himHeadBreath,
         herArmBreathL, herArmBreathR, himArmBreathL, himArmBreathR]
          .forEach(t => t.destroy());
      },
    });

    // Steam + water
    const steamEvent = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => spawnSteam(w / 2, h * 0.3),
    });
    this.time.addEvent({ delay: 60, loop: true, callback: spawnWaterDrop });

    this.time.delayedCall(1000, () => {
      showDialogue(this, 'The water is perfect...', 'partner');
    });
    this.time.delayedCall(3500, () => {
      showDialogue(this, 'This is so nice after walking all day.', 'player');
    });

    // ════════════════════════════════════════════════════════
    // PHASE 2: Arms Wrapping (5–12s)
    // Arms reach out and wrap around each other
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(5000, () => {
      // Zoom closer
      this.tweens.add({
        targets: coupleContainer,
        scaleX: 3.5, scaleY: 3.5,
        duration: 3000, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: this.cameras.main, zoom: 1.1,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Her right arm reaches across to him (rotates toward him)
      this.tweens.add({
        targets: herArmR,
        x: 10, angle: -35,
        duration: 2500, ease: 'Sine.easeInOut',
      });

      // His left arm wraps around her back (rotates toward her)
      this.tweens.add({
        targets: himArmL,
        x: -8, angle: 25,
        duration: 2500, ease: 'Sine.easeInOut',
      });

      // Bodies move slightly closer together
      this.tweens.add({
        targets: herBody, x: herBody.x + 3,
        duration: 2500, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: himBody, x: himBody.x - 2,
        duration: 2500, ease: 'Sine.easeInOut',
      });

      // Gentle sway on the whole container
      const sway = this.tweens.add({
        targets: coupleContainer,
        angle: { from: -0.8, to: 0.8 },
        duration: 3500, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      });
      activeAnims.push({ tweens: [sway], kill: () => sway.destroy() });

      // Water sparkles on bodies
      this.time.addEvent({
        delay: 600, loop: true,
        callback: () => {
          const dx = (Math.random() - 0.5) * 60;
          const dy = (Math.random() - 0.5) * 40;
          const droplet = this.add.circle(
            w / 2 + dx, h * 0.5 + dy, 1.5, 0xAADDFF,
          ).setAlpha(0.6).setDepth(22);
          this.tweens.add({
            targets: droplet, y: droplet.y + 10 + Math.random() * 10,
            alpha: 0, duration: 800,
            onComplete: () => droplet.destroy(),
          });
        },
      });

      // Mist thickens
      this.tweens.add({ targets: mistOverlay, alpha: 0.1, duration: 3000 });

      this.time.delayedCall(2000, () => {
        showDialogue(this, 'Come closer...', 'partner');
      });
      this.time.delayedCall(4500, () => {
        showDialogue(this, 'You have shampoo in your hair.', 'player');
      });
      this.time.delayedCall(6000, () => {
        showDialogue(this, "No I don't! ...Do I?", 'partner');
      });
    });

    // ════════════════════════════════════════════════════════
    // PHASE 3: Full Embrace (12–20s)
    // Eyes close, head nuzzle, tight hug, hearts
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(12000, () => {
      // Swap to closed-eye heads
      herHead.setTexture('shower-her-head-closed');
      himHead.setTexture('shower-him-head-closed');

      // Her head nuzzles onto his chest — tilts more right, moves toward him
      this.tweens.add({
        targets: herHead,
        x: herHead.x + 8, y: herHead.y + 4, angle: 18,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // His head tilts down toward her (from -5° to -15°)
      this.tweens.add({
        targets: himHead,
        y: himHead.y + 3, angle: -15,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // His right arm also wraps around her (full embrace)
      this.tweens.add({
        targets: himArmR,
        x: -2, angle: -20,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // Her left arm wraps around his waist
      this.tweens.add({
        targets: herArmL,
        x: herArmL.x + 8, angle: -20,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // Even bigger zoom
      this.tweens.add({
        targets: coupleContainer,
        scaleX: 4.0, scaleY: 4.0,
        duration: 2000, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: this.cameras.main, zoom: 1.15,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // Hearts
      addHeartParticles(this, w / 2, h * 0.5 - 60, 5, 55);

      // Mist intensifies
      this.tweens.add({ targets: mistOverlay, alpha: 0.15, duration: 4000 });

      // Steam intensifies
      steamEvent.destroy();
      this.time.addEvent({
        delay: 300, loop: true,
        callback: () => spawnSteam(w / 2, h * 0.25),
      });

      this.time.delayedCall(1500, () => {
        showDialogue(this, "I don't want to leave Budapest.", 'partner');
      });
      this.time.delayedCall(4000, () => {
        showDialogue(this, "We'll come back. I promise.", 'player');
      });
      this.time.delayedCall(6500, () => {
        showDialogue(this, "...Can we just stay here a bit longer?", 'partner');
      });
    });

    // ════════════════════════════════════════════════════════
    // PHASE 4: Fade Out (20–24s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(20000, () => {
      activeAnims.forEach(a => a.kill());

      this.tweens.add({
        targets: coupleContainer, alpha: 0, duration: 2000,
      });
      this.tweens.add({
        targets: mistOverlay, alpha: 0.6, duration: 2500,
      });

      removeLetterbox(this, bars);

      const whiteOut = this.add.rectangle(w / 2, h / 2, w, h, 0xFFFFFF)
        .setAlpha(0).setDepth(100);
      this.tweens.add({
        targets: whiteOut, alpha: 1, duration: 2500,
        onComplete: () => {
          startScene(this, 'BudapestAirbnbScene', { returnX: this.returnX, returnY: this.returnY });
        },
      });
    });
  }
}
