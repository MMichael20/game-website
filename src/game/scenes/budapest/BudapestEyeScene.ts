import Phaser from 'phaser';
import {
  addLetterbox,
  removeLetterbox,
  showDialogue,
  addSkipButton,
  addBreathing,
  addSway,
  type AnimationSet,
} from './cutsceneHelpers';
import { audioManager } from '../../../audio/AudioManager';

/**
 * BudapestEyeScene — First-person POV from inside the ferris wheel cabin.
 *
 * The player looks out through the cabin window as the wheel ascends over
 * Budapest at sunset. The city drops away, the sky transforms through golden
 * hour into twilight, and the couple shares an intimate moment at the apex.
 *
 * 40 seconds, 8 phases. The emotional centerpiece of Budapest.
 */
export class BudapestEyeScene extends Phaser.Scene {
  private viewOffset = 0;
  private offsetObj = { value: 0 };
  private cityLights: { obj: Phaser.GameObjects.Arc; baseY: number }[] = [];
  private boats: { obj: Phaser.GameObjects.Rectangle; baseY: number }[] = [];
  private riverBaseY = 0;
  private cityscapeStartY = 0;
  private nearBuildingsStartY = 0;
  private cityscape!: Phaser.GameObjects.Image;
  private nearBuildings!: Phaser.GameObjects.Image;
  private river!: Phaser.GameObjects.Rectangle;
  private riverGolden!: Phaser.GameObjects.Rectangle;
  private coupleBreathing?: AnimationSet;
  private coupleSway?: AnimationSet;

  constructor() {
    super({ key: 'BudapestEyeScene' });
  }

  create() {
    audioManager.transitionToScene(this.scene.key);

    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);
    const maxOffset = 250;

    // Start with black screen — we fade in during phase 1
    this.cameras.main.setAlpha(0);

    // =================================================================
    // SKY BACKGROUND (depth 0)
    // =================================================================
    const sky = this.add.rectangle(w / 2, h / 2, w, h, 0x5577AA).setDepth(0);

    // Twilight sky — a second rectangle that crossfades over the base sky
    // instead of tweening fillColor (which interpolates packed hex badly)
    const skyTwilight = this.add
      .rectangle(w / 2, h / 2, w, h, 0x223355)
      .setAlpha(0)
      .setDepth(1);

    // Sunset overlay layers — positioned at different vertical bands
    const sunsetGold = this.add
      .rectangle(w / 2, h * 0.5, w, h, 0xDDAA44)
      .setAlpha(0)
      .setDepth(2);
    const sunsetOrange = this.add
      .rectangle(w / 2, h * 0.4, w, h * 0.8, 0xCC5533)
      .setAlpha(0)
      .setDepth(3);
    const sunsetPink = this.add
      .rectangle(w / 2, h * 0.35, w, h * 0.7, 0xCC4466)
      .setAlpha(0)
      .setDepth(4);
    const sunsetDeepPurple = this.add
      .rectangle(w / 2, h * 0.2, w, h * 0.4, 0x332255)
      .setAlpha(0)
      .setDepth(5);
    const twilightOverlay = this.add
      .rectangle(w / 2, h * 0.3, w, h * 0.6, 0x223355)
      .setAlpha(0)
      .setDepth(6);

    // =================================================================
    // SUN DISC (depth 1)
    // =================================================================
    const sunDisc = this.add
      .image(w * 0.7, h * 0.5, 'bp-eye-sun-disc')
      .setDepth(10)
      .setScale(4)
      .setAlpha(0)
      .setTint(0xFFAA44);

    // Sun halo — pulsing outer glow
    const sunHalo = this.add
      .circle(w * 0.7, h * 0.5, 40, 0xFFAA44)
      .setAlpha(0)
      .setDepth(9);

    // =================================================================
    // STARS (depth 0.6) — created now, faded in later
    // =================================================================
    const stars: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 25; i++) {
      const sx = 40 + Math.random() * (w - 80);
      const sy = 30 + Math.random() * (h * 0.35);
      const star = this.add
        .circle(sx, sy, 0.5 + Math.random() * 0.8, 0xFFFFFF)
        .setAlpha(0)
        .setDepth(7);
      stars.push(star);
    }

    // =================================================================
    // FAR CITYSCAPE (depth 20)
    // =================================================================
    this.cityscapeStartY = h * 0.5;
    this.cityscape = this.add
      .image(w / 2, this.cityscapeStartY, 'bp-eye-pov-cityscape')
      .setDepth(20)
      .setDisplaySize(w * 1.5, h * 0.5);

    // =================================================================
    // RIVER (depth 25) — a blue-gray band between building layers
    // =================================================================
    this.riverBaseY = this.cityscapeStartY + 160;
    this.river = this.add
      .rectangle(w / 2, this.riverBaseY, w * 0.85, 28, 0x3366AA)
      .setAlpha(0.65)
      .setDepth(25);

    // River golden overlay — crossfades on during golden hour instead
    // of tweening fillColor (which interpolates packed hex badly)
    const riverGolden = this.add
      .rectangle(w / 2, this.riverBaseY, w * 0.85, 28, 0xDD8844)
      .setAlpha(0)
      .setDepth(26);

    // =================================================================
    // NEAR BUILDINGS (depth 30)
    // =================================================================
    this.nearBuildingsStartY = h * 0.6;
    this.nearBuildings = this.add
      .image(w / 2, this.nearBuildingsStartY, 'bp-eye-pov-buildings-near')
      .setDepth(30)
      .setDisplaySize(w * 1.25, h * 0.4);

    // =================================================================
    // GOLDEN PARTICLES CONTAINER (depth 40) — managed by helper
    // =================================================================

    // =================================================================
    // WARM AMBIENT OVERLAY (depth 50) — full-screen color wash
    // =================================================================
    const warmOverlay = this.add
      .rectangle(w / 2, h / 2, w, h, 0xFFAA44)
      .setAlpha(0)
      .setDepth(50);

    const coolOverlay = this.add
      .rectangle(w / 2, h / 2, w, h, 0xAABBDD)
      .setAlpha(0)
      .setDepth(50);

    // =================================================================
    // COUPLE REFLECTION (depth 60) — faint mirror image at apex
    // =================================================================
    const coupleReflection = this.add
      .image(w / 2, h * 0.25, 'bp-eye-pov-couple')
      .setDepth(60)
      .setAlpha(0)
      .setFlipY(true)
      .setScale(0.6)
      .setTint(0xFFAA66);

    // =================================================================
    // RAILING (depth 70)
    // =================================================================
    const railing = this.add
      .image(w / 2, h - 45, 'bp-eye-pov-railing')
      .setDepth(70)
      .setDisplaySize(w, 50);

    // =================================================================
    // COUPLE SILHOUETTES (depth 75)
    // =================================================================
    const couple = this.add
      .image(w / 2, h - 90, 'bp-eye-pov-couple')
      .setDepth(75)
      .setAlpha(0)
      .setOrigin(0.5, 1);

    // =================================================================
    // WINDOW FRAME OVERLAY (depth 80) — always on top
    // =================================================================
    const frame = this.add
      .image(w / 2, h / 2, 'bp-eye-pov-frame')
      .setDepth(80)
      .setDisplaySize(w, h);

    // Frame warm tint overlay — catches golden light on edges
    const frameTint = this.add
      .image(w / 2, h / 2, 'bp-eye-pov-frame')
      .setDepth(81)
      .setDisplaySize(w, h)
      .setTint(0xFFAA44)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // =================================================================
    // SKIP BUTTON
    // =================================================================
    const skipBtn = addSkipButton(this, 'BudapestOverworldScene', {
      returnFromInterior: true,
    });

    // =================================================================
    // CABIN SWAY — continuous gentle rocking via camera scrollX
    // =================================================================
    const swayTween = this.tweens.add({
      targets: this.cameras.main,
      scrollX: { from: -2, to: 2 },
      duration: 4000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // =================================================================
    // VIEW OFFSET SYSTEM — drives all parallax movement
    // =================================================================
    this.offsetObj = { value: 0 };

    // Store riverGolden for parallax tracking in update()
    this.riverGolden = riverGolden;

    // ===================================================================
    //
    //   P H A S E   1 :   B O A R D I N G   (0 – 4s)
    //
    // ===================================================================

    // Fade in from black over 1.5s
    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 0, to: 1 },
      duration: 1500,
      ease: 'Sine.easeOut',
    });

    // Letterbox bars slide in
    const bars = addLetterbox(this);

    // Couple fades in at 1s — they just sat down
    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: couple,
        alpha: 1,
        duration: 800,
        ease: 'Sine.easeOut',
      });

      // Start subtle breathing and sway from the moment they appear
      this.coupleBreathing = addBreathing(this, couple, 1.5, 2400);
      this.coupleSway = addSway(this, couple, 1, 3500);
    });

    // At 2s — tiny camera shake as the wheel starts moving
    this.time.delayedCall(2000, () => {
      this.cameras.main.shake(500, 0.001);

      // Dialogue: partner
      showDialogue(this, '"Here we go..."', 'partner', { duration: 1800 });
    });

    // ===================================================================
    //
    //   P H A S E   2 :   L I F T I N G   O F F   (4 – 9s)
    //
    // ===================================================================

    // Begin the grand ascent — view offset drives city downward
    this.time.delayedCall(4000, () => {
      // Ascent tween: city drops over phases 2 through 5 (16s total)
      this.tweens.add({
        targets: this.offsetObj,
        value: maxOffset,
        duration: 16000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.viewOffset = this.offsetObj.value;
        },
      });

      // Warm golden light creeps in from the right
      this.tweens.add({
        targets: frameTint,
        alpha: 0.08,
        duration: 4000,
        ease: 'Sine.easeIn',
      });

      // Couple leans forward slightly — excited to see the view
      this.tweens.add({
        targets: couple,
        scaleX: 1.02,
        scaleY: 1.02,
        y: couple.y - 3,
        duration: 1500,
        ease: 'Sine.easeInOut',
      });
    });

    // Dialogue at 6s
    this.time.delayedCall(6000, () => {
      showDialogue(this, '"We\'re moving!"', 'player', { duration: 1800 });
    });

    // Dialogue at 8s + couple shift
    this.time.delayedCall(8000, () => {
      showDialogue(this, '"Hold my hand."', 'partner', { duration: 2000 });

      // Couple leans closer
      this.tweens.add({
        targets: couple,
        x: couple.x - 3,
        scaleX: 1.02,
        duration: 1500,
        ease: 'Sine.easeInOut',
      });
    });

    // ===================================================================
    //
    //   P H A S E   3 :   R I S I N G   A B O V E   (9 – 15s)
    //
    // ===================================================================

    this.time.delayedCall(9000, () => {
      // Sky shifts: evening blue -> warm gold -> soft orange
      this.tweens.add({
        targets: sunsetGold,
        alpha: 0.25,
        duration: 4000,
        ease: 'Sine.easeIn',
      });
      this.tweens.add({
        targets: sunsetOrange,
        alpha: 0.12,
        duration: 5000,
        ease: 'Sine.easeIn',
      });

      // Sun disc appears
      this.tweens.add({
        targets: sunDisc,
        alpha: 0.85,
        duration: 3000,
        ease: 'Sine.easeIn',
      });

      // Sun halo begins pulsing
      this.tweens.add({
        targets: sunHalo,
        alpha: { from: 0.1, to: 0.25 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Golden particles begin floating upward past the window
      this.spawnGoldenParticles(w, h, 15, 6000);

      // Boats appear on the river
      this.spawnBoats(w, h);
    });

    // Dialogue at 11s
    this.time.delayedCall(11000, () => {
      showDialogue(this, '"Look at that..."', 'partner', { duration: 2000 });
    });

    // Dialogue at 13s
    this.time.delayedCall(13000, () => {
      showDialogue(
        this,
        '"I can see the bridges... all three of them."',
        'player',
        { duration: 2200 },
      );
    });

    // ===================================================================
    //
    //   P H A S E   4 :   T H E   G O L D E N   H O U R   (15 – 20s)
    //
    // ===================================================================

    this.time.delayedCall(15000, () => {
      // Sky deepens to full sunset
      this.tweens.add({
        targets: sunsetGold,
        alpha: 0.4,
        duration: 3000,
      });
      this.tweens.add({
        targets: sunsetOrange,
        alpha: 0.3,
        duration: 3500,
      });
      this.tweens.add({
        targets: sunsetPink,
        alpha: 0.15,
        duration: 4000,
      });

      // Sun disc becomes prominent with pulsing halo
      this.tweens.add({
        targets: sunDisc,
        alpha: 1,
        scale: 5,
        duration: 3000,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: sunHalo,
        alpha: { from: 0.2, to: 0.4 },
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Danube shifts from blue to golden-orange via overlay crossfade
      this.tweens.add({
        targets: this.riverGolden,
        alpha: 0.65,
        duration: 4000,
      });

      // Warm amber overlay slowly increases
      this.tweens.add({
        targets: warmOverlay,
        alpha: { from: 0.06, to: 0.12 },
        duration: 5000,
        ease: 'Sine.easeIn',
      });

      // Frame tint deepens
      this.tweens.add({
        targets: frameTint,
        alpha: 0.15,
        duration: 4000,
      });

      // Condensation effect on the glass
      this.spawnCondensation(w, h);

      // More golden particles
      this.spawnGoldenParticles(w, h, 25, 5000);
    });

    // Dialogue at 16s
    this.time.delayedCall(16000, () => {
      showDialogue(this, '"The whole city is golden..."', 'partner', {
        duration: 2200,
      });
    });

    // Dialogue at 18s
    this.time.delayedCall(18000, () => {
      showDialogue(this, '"You\'re golden."', 'player', { duration: 2000 });
    });

    // 2 seconds of pure sunset silence (18-20s)

    // ===================================================================
    //
    //   P H A S E   5 :   T H E   A P E X   (20 – 26s)
    //
    // ===================================================================

    this.time.delayedCall(20000, () => {
      // Deep sunset gradient fills the screen
      this.tweens.add({
        targets: sunsetDeepPurple,
        alpha: 0.35,
        duration: 4000,
      });
      this.tweens.add({
        targets: sunsetOrange,
        alpha: 0.45,
        duration: 3000,
      });
      this.tweens.add({
        targets: sunsetGold,
        alpha: 0.5,
        duration: 3000,
      });
      this.tweens.add({
        targets: sunsetPink,
        alpha: 0.25,
        duration: 3000,
      });

      // Sun sinks toward the horizon
      this.tweens.add({
        targets: [sunDisc, sunHalo],
        y: h * 0.75,
        duration: 6000,
        ease: 'Sine.easeInOut',
      });

      // First stars appear — 8 fade in
      for (let i = 0; i < 8; i++) {
        this.tweens.add({
          targets: stars[i],
          alpha: Phaser.Math.FloatBetween(0.3, 0.7),
          duration: 2000,
          delay: i * 400,
          ease: 'Sine.easeIn',
        });
      }

      // Subtle zoom — intimacy
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.02,
        duration: 6000,
        ease: 'Sine.easeInOut',
      });

      // Cabin sway slows — period doubles
      swayTween.timeScale = 0.5;

      // Warm overlay deepens
      this.tweens.add({
        targets: warmOverlay,
        alpha: 0.15,
        duration: 4000,
      });

      // Couple leans together — the emotional peak moment
      this.tweens.add({
        targets: couple,
        angle: 2,
        x: couple.x - 4,
        duration: 2500,
        ease: 'Sine.easeInOut',
      });

      // Couple reflection appears in the glass, a bit more visible at apex
      this.tweens.add({
        targets: coupleReflection,
        alpha: 0.12,
        duration: 3000,
        ease: 'Sine.easeIn',
      });

      // Dialogue: the emotional peak
      showDialogue(this, '"I can see the whole city from up here."', 'partner', {
        duration: 2200,
      });
    });

    // Dialogue at 22s
    this.time.delayedCall(22000, () => {
      showDialogue(
        this,
        '"Look at the Danube... it\'s on fire."',
        'player',
        { duration: 2200 },
      );
    });

    // 24s — long pause. Just the sunset, the particles, the stars.

    // Dialogue at 25s — the emotional climax, slightly larger text
    this.time.delayedCall(25000, () => {
      showDialogue(
        this,
        '"I don\'t want this to end."',
        'partner',
        { duration: 2500, fontSize: '13px' },
      );
    });

    // ===================================================================
    //
    //   P H A S E   6 :   T W I L I G H T   D E S C E N T   (26 – 32s)
    //
    // ===================================================================

    this.time.delayedCall(26000, () => {
      // Descent tween — city rises back
      this.tweens.add({
        targets: this.offsetObj,
        value: 0,
        duration: 11000,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.viewOffset = this.offsetObj.value;
        },
      });

      // Sky deepens to twilight
      this.tweens.add({
        targets: twilightOverlay,
        alpha: 0.4,
        duration: 5000,
      });
      this.tweens.add({
        targets: sunsetDeepPurple,
        alpha: 0.5,
        duration: 4000,
      });
      // Crossfade to twilight sky color instead of tweening fillColor
      this.tweens.add({
        targets: skyTwilight,
        alpha: 1,
        duration: 5000,
      });

      // Sun disc sinks and fades
      this.tweens.add({
        targets: sunDisc,
        y: h * 0.85,
        alpha: 0.1,
        duration: 5000,
        ease: 'Sine.easeIn',
      });
      this.tweens.add({
        targets: sunHalo,
        alpha: 0,
        duration: 4000,
      });

      // Sunset layers fade
      this.tweens.add({
        targets: sunsetGold,
        alpha: 0.15,
        duration: 5000,
      });
      this.tweens.add({
        targets: sunsetOrange,
        alpha: 0.1,
        duration: 5000,
      });

      // CITY LIGHTS turn on — magical dusk moment
      this.spawnCityLights(w, h, 50);

      // More stars appear with twinkling
      for (let i = 8; i < 25; i++) {
        this.tweens.add({
          targets: stars[i],
          alpha: Phaser.Math.FloatBetween(0.3, 0.8),
          duration: 1500,
          delay: (i - 8) * 250,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: stars[i],
              alpha: { from: 0.3, to: 0.9 },
              duration: 1500 + Math.random() * 1500,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          },
        });
      }

      // Warm overlay fades, cool overlay takes over
      this.tweens.add({
        targets: warmOverlay,
        alpha: 0,
        duration: 4000,
      });
      this.tweens.add({
        targets: coolOverlay,
        alpha: 0.08,
        duration: 5000,
        delay: 2000,
      });

      // Frame tint fades
      this.tweens.add({
        targets: frameTint,
        alpha: 0,
        duration: 4000,
      });

      // Couple reflection fades
      this.tweens.add({
        targets: coupleReflection,
        alpha: 0,
        duration: 2000,
      });

      // Zoom back to normal
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.0,
        duration: 5000,
        ease: 'Sine.easeInOut',
      });

      // Silver/white particles replace golden ones
      this.spawnSilverParticles(w, h, 10, 5000);
    });

    // Dialogue at 28s
    this.time.delayedCall(28000, () => {
      showDialogue(this, '"The lights are coming on..."', 'player', {
        duration: 2200,
      });
    });

    // Dialogue at 30s
    this.time.delayedCall(30000, () => {
      showDialogue(
        this,
        '"It\'s like watching the city wake up... but in reverse."',
        'partner',
        { duration: 2500 },
      );
    });

    // Dialogue at 31s
    this.time.delayedCall(31000, () => {
      showDialogue(
        this,
        '"We should come back. Every single trip."',
        'player',
        { duration: 2200 },
      );
    });

    // ===================================================================
    //
    //   P H A S E   7 :   C O M I N G   D O W N   (32 – 37s)
    //
    // ===================================================================

    this.time.delayedCall(32000, () => {
      // Cabin sway returns to normal speed
      swayTween.timeScale = 1.0;

      // The couple shifts — one leans head on the other's shoulder
      this.tweens.add({
        targets: couple,
        angle: 3,
        x: couple.x - 5,
        duration: 2000,
        ease: 'Sine.easeInOut',
      });

      // Sky fully settles into deep twilight
      this.tweens.add({
        targets: twilightOverlay,
        alpha: 0.5,
        duration: 4000,
      });

      // Cool overlay gently fades out
      this.tweens.add({
        targets: coolOverlay,
        alpha: 0,
        duration: 4000,
        delay: 2000,
      });

      // No dialogue — let the visual descent speak for itself
    });

    // ===================================================================
    //
    //   P H A S E   8 :   E X I T   (37 – 40s)
    //
    // ===================================================================

    // Letterbox bars slide away at 37s
    this.time.delayedCall(37000, () => {
      removeLetterbox(this, bars);

      // Fade the view to warm dark
      const fadeOverlay = this.add
        .rectangle(w / 2, h / 2, w, h, 0x1A1A2A)
        .setAlpha(0)
        .setDepth(78);

      this.tweens.add({
        targets: fadeOverlay,
        alpha: 0.85,
        duration: 1500,
        ease: 'Sine.easeIn',
      });
    });

    // Remove skip button at 38s
    this.time.delayedCall(38000, () => {
      skipBtn.remove();

      // Couple fades out last
      this.tweens.add({
        targets: couple,
        alpha: 0,
        duration: 800,
        ease: 'Sine.easeIn',
      });
    });

    // Final fade to black at 39s
    this.time.delayedCall(39000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene', {
          returnFromInterior: true,
        });
      });
    });
  }

  // =====================================================================
  // UPDATE — parallax tracking, replaces old 16ms timer loop
  // =====================================================================
  update() {
    this.viewOffset = this.offsetObj.value;
    this.cityscape.y = this.cityscapeStartY + this.viewOffset;
    this.nearBuildings.y = this.nearBuildingsStartY + this.viewOffset * 1.5;
    this.river.y = this.riverBaseY + this.viewOffset;
    if (this.riverGolden) {
      this.riverGolden.y = this.riverBaseY + this.viewOffset;
    }
    for (const cl of this.cityLights) {
      cl.obj.y = cl.baseY + this.viewOffset;
    }
    for (const b of this.boats) {
      b.obj.y = b.baseY + this.viewOffset;
    }
  }

  // =====================================================================
  // HELPER: Golden particles floating upward past the window
  // =====================================================================
  private spawnGoldenParticles(
    w: number,
    h: number,
    count: number,
    overMs: number,
  ) {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall((i / count) * overMs, () => {
        const px = 70 + Math.random() * (w - 140);
        const py = h + 10 + Math.random() * 20; // start below frame
        const size = Phaser.Math.FloatBetween(1, 2.5);
        const particle = this.add
          .circle(px, py, size, 0xFFDD88)
          .setAlpha(Phaser.Math.FloatBetween(0.3, 0.7))
          .setDepth(40);

        this.tweens.add({
          targets: particle,
          y: -20, // float all the way up and out
          alpha: 0,
          duration: Phaser.Math.Between(4000, 7000),
          ease: 'Sine.easeOut',
          onComplete: () => particle.destroy(),
        });
      });
    }
  }

  // =====================================================================
  // HELPER: Silver/white particles for twilight phase
  // =====================================================================
  private spawnSilverParticles(
    w: number,
    h: number,
    count: number,
    overMs: number,
  ) {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall((i / count) * overMs, () => {
        const px = 70 + Math.random() * (w - 140);
        const py = h + 10;
        const size = Phaser.Math.FloatBetween(0.8, 2);
        const particle = this.add
          .circle(px, py, size, 0xCCDDFF)
          .setAlpha(Phaser.Math.FloatBetween(0.2, 0.5))
          .setDepth(40);

        this.tweens.add({
          targets: particle,
          y: -20,
          alpha: 0,
          duration: Phaser.Math.Between(5000, 8000),
          ease: 'Sine.easeOut',
          onComplete: () => particle.destroy(),
        });
      });
    }
  }

  // =====================================================================
  // HELPER: Condensation drops on the glass
  // =====================================================================
  private spawnCondensation(w: number, h: number) {
    for (let i = 0; i < 25; i++) {
      const drop = this.add
        .circle(
          70 + Math.random() * (w - 140),
          60 + Math.random() * (h - 170),
          0.5 + Math.random() * 1.5,
          0xFFFFFF,
        )
        .setAlpha(0.15 + Math.random() * 0.1)
        .setDepth(55);

      this.tweens.add({
        targets: drop,
        y: drop.y + 20 + Math.random() * 30,
        alpha: 0.05,
        duration: 15000 + Math.random() * 10000,
        ease: 'Linear',
        onComplete: () => drop.destroy(),
      });
    }
  }

  // =====================================================================
  // HELPER: City lights — scattered warm dots that appear one by one
  // =====================================================================
  private spawnCityLights(w: number, h: number, count: number) {
    for (let i = 0; i < count; i++) {
      const lx = 60 + Math.random() * (w - 120);
      // Position lights relative to the cityscape's base Y
      const baseY = this.cityscapeStartY + 20 + Math.random() * 100;
      const light = this.add
        .circle(lx, baseY + this.viewOffset, 1 + Math.random(), 0xFFDD66)
        .setAlpha(0)
        .setDepth(65);

      this.cityLights.push({ obj: light, baseY });

      // Staggered appearance — lights coming on effect
      this.tweens.add({
        targets: light,
        alpha: Phaser.Math.FloatBetween(0.4, 0.9),
        duration: 800,
        delay: i * 80,
        ease: 'Sine.easeIn',
      });

      // Twinkle after appearing
      this.time.delayedCall(i * 80 + 800, () => {
        this.tweens.add({
          targets: light,
          alpha: { from: 0.4, to: 0.9 },
          duration: 1500 + Math.random() * 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    }
  }

  // =====================================================================
  // HELPER: Boats on the river — small white rectangles moving horizontally
  // =====================================================================
  private spawnBoats(w: number, _h: number) {
    for (let i = 0; i < 3; i++) {
      const baseY = this.riverBaseY + (-5 + Math.random() * 10);
      const boat = this.add
        .rectangle(
          -20 + i * 120,
          baseY + this.viewOffset,
          12,
          4,
          0xFFFFFF,
        )
        .setAlpha(0.5)
        .setDepth(27);

      this.boats.push({ obj: boat, baseY });

      this.tweens.add({
        targets: boat,
        x: w + 20,
        duration: 25000 + Math.random() * 10000,
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => {
          boat.x = -20;
        },
      });
    }
  }
}
