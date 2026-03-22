// src/game/scenes/budapest/cutsceneHelpers.ts
// Shared utilities for Budapest cutscenes: letterbox bars, dialogue text, skip button

import Phaser from 'phaser';

export interface LetterboxBars {
  top: Phaser.GameObjects.Rectangle;
  bottom: Phaser.GameObjects.Rectangle;
}

/** Add cinematic letterbox bars that slide in from top and bottom */
export function addLetterbox(scene: Phaser.Scene, barHeight = 0.12): LetterboxBars {
  const w = Number(scene.cameras.main.width);
  const h = Number(scene.cameras.main.height);
  const bh = Math.round(h * barHeight);

  const top = scene.add.rectangle(w / 2, -bh / 2, w, bh, 0x000000).setDepth(50).setScrollFactor(0);
  const bottom = scene.add.rectangle(w / 2, h + bh / 2, w, bh, 0x000000).setDepth(50).setScrollFactor(0);

  scene.tweens.add({ targets: top, y: bh / 2, duration: 600, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: bottom, y: h - bh / 2, duration: 600, ease: 'Sine.easeOut' });

  return { top, bottom };
}

/** Remove letterbox bars with a slide-out animation */
export function removeLetterbox(scene: Phaser.Scene, bars: LetterboxBars): void {
  const h = Number(scene.cameras.main.height);
  const bh = bars.top.height;
  scene.tweens.add({ targets: bars.top, y: -bh / 2, duration: 400, ease: 'Sine.easeIn' });
  scene.tweens.add({ targets: bars.bottom, y: h + bh / 2, duration: 400, ease: 'Sine.easeIn' });
}

/** Show cutscene dialogue text with fade in/out */
export function showDialogue(
  scene: Phaser.Scene,
  text: string,
  speaker: 'player' | 'partner' | 'ambient',
  opts?: { y?: number; duration?: number; fontSize?: string },
): Phaser.GameObjects.Text {
  const w = Number(scene.cameras.main.width);
  const h = Number(scene.cameras.main.height);
  const color = speaker === 'player' ? '#88BBFF' : speaker === 'partner' ? '#FFAACC' : '#FFFFFF';
  const yPos = opts?.y ?? h * 0.82;
  const dur = opts?.duration ?? 3000;

  const textObj = scene.add.text(w / 2, yPos, text, {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: opts?.fontSize ?? '11px',
    color,
    wordWrap: { width: w * 0.6 },
    align: 'center',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(55).setAlpha(0);

  scene.tweens.add({ targets: textObj, alpha: 1, duration: 500 });
  scene.time.delayedCall(dur, () => {
    scene.tweens.add({
      targets: textObj,
      alpha: 0,
      duration: 400,
      onComplete: () => textObj.destroy(),
    });
  });

  return textObj;
}

/** Add a skip button and return the cleanup function */
export function addSkipButton(
  scene: Phaser.Scene,
  targetScene: string,
  sceneData?: Record<string, unknown>,
): HTMLDivElement {
  const skipBtn = document.createElement('div');
  skipBtn.className = 'skip-cutscene';
  skipBtn.textContent = 'Skip \u25B6\u25B6';
  document.getElementById('ui-layer')!.appendChild(skipBtn);

  skipBtn.addEventListener('click', () => {
    skipBtn.remove();
    scene.tweens.killAll();
    scene.time.removeAllEvents();
    scene.cameras.main.fadeOut(300, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      scene.scene.start(targetScene, sceneData);
    });
  });

  scene.events.once('shutdown', () => { skipBtn.remove(); });

  return skipBtn;
}

// ═══════════════════════════════════════════════════════════════════════
// CUTSCENE CHARACTER ANIMATION PRESETS
// Reusable animation functions that return tween references for cleanup
// ═══════════════════════════════════════════════════════════════════════

export interface AnimationSet {
  tweens: Phaser.Tweens.Tween[];
  kill: () => void;
}

function makeSet(tweens: Phaser.Tweens.Tween[]): AnimationSet {
  return {
    tweens,
    kill: () => tweens.forEach(t => t.destroy()),
  };
}

/** Subtle Y oscillation simulating breathing — works on any sprite */
export function addBreathing(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
  amplitude = 2,
  period = 2000,
): AnimationSet {
  const t = scene.tweens.add({
    targets: target,
    y: target.y - amplitude,
    duration: period,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  return makeSet([t]);
}

/** Gentle angular sway — simulates rocking or leaning */
export function addSway(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle,
  angleDeg = 1.5,
  period = 3000,
): AnimationSet {
  const t = scene.tweens.add({
    targets: target,
    angle: { from: -angleDeg, to: angleDeg },
    duration: period,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
  return makeSet([t]);
}

/** Two sprites lean toward each other — romantic moment */
export function addLeanTogether(
  scene: Phaser.Scene,
  left: Phaser.GameObjects.Image,
  right: Phaser.GameObjects.Image,
  opts?: { angleLeft?: number; angleRight?: number; duration?: number; xShift?: number },
): AnimationSet {
  const angleL = opts?.angleLeft ?? 6;
  const angleR = opts?.angleRight ?? -6;
  const dur = opts?.duration ?? 1500;
  const xShift = opts?.xShift ?? 8;

  left.setOrigin(0.5, 1.0);
  right.setOrigin(0.5, 1.0);

  const t1 = scene.tweens.add({
    targets: left,
    angle: angleL,
    x: left.x + xShift,
    duration: dur,
    ease: 'Sine.easeInOut',
  });
  const t2 = scene.tweens.add({
    targets: right,
    angle: angleR,
    x: right.x - xShift,
    duration: dur,
    ease: 'Sine.easeInOut',
  });
  return makeSet([t1, t2]);
}

/** Floating "z" sleep indicators above a sprite */
export function addSleepingZ(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image,
  waves = 3,
  depth = 55,
): AnimationSet {
  const tweens: Phaser.Tweens.Tween[] = [];
  for (let wave = 0; wave < waves; wave++) {
    scene.time.delayedCall(wave * 1800, () => {
      const zx = target.x - 10;
      const zy = target.y - target.displayHeight * 0.8;
      const zText = scene.add.text(zx, zy, 'z', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ffffff',
      }).setDepth(depth).setAlpha(0.8);

      const t = scene.tweens.add({
        targets: zText,
        y: zy - 30,
        alpha: 0,
        duration: 1600,
        ease: 'Sine.easeIn',
        onComplete: () => zText.destroy(),
      });
      tweens.push(t);

      scene.time.delayedCall(400, () => {
        const z2 = scene.add.text(zx + 8, zy - 5, 'z', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: '#ddddff',
        }).setDepth(depth).setAlpha(0.6);

        const t2 = scene.tweens.add({
          targets: z2,
          y: zy - 35,
          alpha: 0,
          duration: 1400,
          ease: 'Sine.easeIn',
          onComplete: () => z2.destroy(),
        });
        tweens.push(t2);
      });
    });
  }
  return makeSet(tweens);
}

/** Floating heart particles above a sprite — romantic moment */
export function addHeartParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 3,
  depth = 55,
): AnimationSet {
  const tweens: Phaser.Tweens.Tween[] = [];
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * 1200, () => {
      const hx = x + (Math.random() - 0.5) * 30;
      const heart = scene.add.text(hx, y, '\u2665', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#FF6688',
      }).setDepth(depth).setAlpha(0.8);

      const t = scene.tweens.add({
        targets: heart,
        y: y - 40 - Math.random() * 20,
        alpha: 0,
        duration: 2000,
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy(),
      });
      tweens.push(t);
    });
  }
  return makeSet(tweens);
}
