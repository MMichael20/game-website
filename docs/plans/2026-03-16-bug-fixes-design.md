# Bug Fixes Design Document

**Date:** 2026-03-16
**Scope:** 5 bugs affecting display, mobile UX, animations, and NPC behavior

---

## Implementation Order

1. **Bug 1 — Game Stretches on Screen** (no dependencies, unblocks Bug 2 assessment)
2. **Bug 2 — Mobile Responsiveness** (depends on Bug 1 being fixed first)
3. **Bug 3 — Breathing Animation Looks Like Bobbing** (independent)
4. **Bug 4 — Partner Shakes When Stopping** (independent)
5. **Bug 5 — NPCs Teleport Between Positions** (independent)

Bugs 3, 4, and 5 are independent of each other and of Bugs 1-2. They can be implemented in any order or in parallel. Bug 2 must be assessed after Bug 1 is deployed because the CSS stretch is the root cause of most perceived mobile issues.

---

## Bug 1: Game Stretches on Screen

### Root Cause

`index.html` line 13 applies `width: 100% !important; height: 100% !important` to the canvas element. This overrides Phaser's `Scale.FIT` mode, which calculates the correct canvas dimensions to maintain the 800x600 aspect ratio with letterboxing. The `!important` CSS forces the canvas to fill the entire viewport, stretching the game when the viewport aspect ratio differs from 4:3.

### Fix

**File:** `index.html`

Replace the canvas CSS rule on line 13:

```css
/* BEFORE */
canvas { display: block; width: 100% !important; height: 100% !important; }

/* AFTER */
canvas { display: block; }
```

Remove the `width` and `height` declarations entirely. Phaser's `Scale.FIT` with `CENTER_BOTH` (configured in `src/main.ts` lines 27-28) will:
- Calculate the largest 800x600 rectangle that fits the viewport
- Set the canvas width/height attributes accordingly
- Center the canvas within the parent via `CENTER_BOTH`
- Add letterbox bars (using the `#1a1a2e` body background) on sides or top/bottom

### Validation

- Resize browser to various aspect ratios (16:9, 4:3, 9:16 portrait). The game should maintain 4:3 with letterboxing.
- Verify no distortion on ultrawide or narrow viewports.
- Confirm the body background color `#1a1a2e` shows through letterbox areas.

### Risk: Low

Single CSS line removal. Phaser's built-in scaling is well-tested. The game config already has the correct scale settings.

---

## Bug 2: Mobile Responsiveness

### Root Cause Analysis

The game uses `Phaser.Scale.FIT` at 800x600. This means the internal coordinate system is always 800x600 regardless of physical screen size. Phaser scales the canvas proportionally to fit the screen. After fixing Bug 1 (CSS stretch), the game should render correctly at any screen size with proper letterboxing.

The actual mobile concerns after Bug 1 are:
- On very small phones (320px wide), the scaled-down game may have text and touch targets that are physically too small
- The existing camera zoom for small screens (`WorldScene.ts` line 319: `width < 500 ? 1.8 : 1.5`) operates on Phaser's internal camera width, not physical pixels, which may not capture real device size

### Fix — Phased Approach

#### Phase 1: Assess after Bug 1 fix (no code changes)

After deploying the Bug 1 CSS fix, manually test on:
- iPhone SE (375x667) — smallest common iOS device
- Small Android (360x640)
- iPad (768x1024) — tablet portrait
- Desktop (1920x1080)

Measure whether text is legible and buttons are tappable at the scaled size.

#### Phase 2: Minimum touch target enforcement (if needed)

**File:** `src/scenes/WorldScene.ts`

Ensure all interactive elements in the game have a minimum hit area of 44x44 logical pixels. Key areas to audit:

| Element | Current Size | Location |
|---------|-------------|----------|
| Settings button | 12px font + 12x6 padding | `WorldScene.ts` line 288-292 |
| Fullscreen button | 12px font + 12x6 padding | `WorldScene.ts` line 301-306 |
| Checkpoint prompt text | 14px font + 12x8 padding | `WorldScene.ts` line 262-267 |

These sizes are in logical pixels (800x600 space). A 12px padded button is roughly 60x24 logical pixels, which at the scaled-down size on a 375px-wide phone becomes ~28x11 physical pixels — below Apple's 44px minimum.

Fix approach: Add `setMinSize(44, 44)` or increase padding on interactive elements to ensure minimum 44x44 logical pixel hit areas. Since the game is 800px logical and a small phone is ~375px, the scale factor is ~0.47, so we need at least 44/0.47 = ~94 logical pixels for touch targets. This is large — a better approach is to use Phaser's `input.hitArea` to expand the touch region without changing visual size.

For each interactive button/text, after creating it:
```
element.setInteractive(new Phaser.Geom.Rectangle(-22, -22, width+44, height+44), Phaser.Geom.Rectangle.Contains);
```

#### Phase 3: Orientation guidance (if needed)

**File:** `index.html`

Add a CSS-based landscape suggestion overlay for portrait mobile:

```css
@media (orientation: portrait) and (max-width: 600px) {
  /* Show a rotate-device hint */
}
```

This is a pure CSS addition — a semi-transparent overlay with a rotation icon, hidden when landscape. It does not block gameplay, just suggests rotation.

### Files to Modify

- `index.html` — orientation hint CSS (Phase 3 only)
- `src/scenes/WorldScene.ts` — touch target hit areas (Phase 2)
- `src/scenes/MenuScene.ts` — button hit areas (Phase 2)
- `src/scenes/DressingRoomScene.ts` — button hit areas (Phase 2)

### Risk: Low-Medium

Phase 1 is zero-risk (assessment only). Phase 2 changes hit areas without visual changes — low risk but needs testing on each scene. Phase 3 is additive CSS.

---

## Bug 3: Breathing Animation Looks Like Bobbing

### Root Cause

`WorldScene.ts` lines 69-88 create idle tweens that animate both `y` (position) and `scaleY` (compression). The `y: this.player.y - 1.5` moves the sprite upward by 1.5 pixels each cycle, creating a visible bobbing motion. Combined with `scaleY * 0.985`, this looks like the character is bouncing rather than breathing.

Additionally, when the player stops moving and the idle tween resumes (line 496), `updateTo('y', this.player.y - 1.5, true)` re-targets the tween to the new position — but the base `y` keeps shifting, compounding the visual artifact.

### Fix

**File:** `src/scenes/WorldScene.ts`

Replace the breathing tweens (lines 69-88) with scaleX-only oscillation that simulates chest expansion:

**Player tween (line 69-78):**
```typescript
this.playerIdleTween = this.tweens.add({
  targets: this.player,
  scaleX: 0.4 * 1.015,   // 0.406 — subtle 1.5% horizontal expansion
  duration: 1200,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
  paused: true,
});
```

**Partner tween (lines 80-88):**
```typescript
this.partnerIdleTween = this.tweens.add({
  targets: this.partner,
  scaleX: 0.4 * 1.015,   // same expansion ratio
  duration: 1400,         // slightly offset from player for natural feel
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
  paused: true,
});
```

Key changes:
- **Remove** `y` property from tween — no vertical movement
- **Remove** `scaleY` property from tween — no vertical compression
- **Add** `scaleX` target of `baseScale * 1.015` (where baseScale is 0.4, set at lines 195 and 208)
- The tween's `yoyo: true` oscillates scaleX between 0.4 (normal) and 0.406 (expanded)

**Also remove** the `updateTo('y', ...)` calls when resuming idle (lines 496-497 and 534-535):

Lines 494-497 become:
```typescript
this.player.setTexture(this.playerTextureKey + '-frame-0');
this.playerIdleTween?.resume();
```

Lines 532-535 become:
```typescript
this.partner.setTexture(this.partnerTextureKey + '-frame-0');
this.partnerIdleTween?.resume();
```

The `updateTo` calls were needed because the Y-based tween had absolute position targets that changed when the player moved. With scaleX-only, the tween target (0.406) is constant and does not depend on position.

### Why scaleX Works

The 0.4 base scale renders 160px source art at ~64px display size. A 1.5% scaleX increase adds less than 1 pixel of width — imperceptible as movement but subconsciously reads as breathing/life. No vertical bobbing means the feet stay planted.

### Risk: Low

Purely visual change affecting only the idle state. The tween values are conservative (1.5% expansion). If the effect is too subtle, it can be increased to 1.02 (2%) later.

---

## Bug 4: Partner Shakes When Stopping

### Root Cause

`WorldScene.ts` lines 501-537 implement partner following. The movement logic has two thresholds:
- **Start moving:** `dist > 48` (line 507) — partner begins following when 48+ pixels from player
- **Stop moving:** `dist <= 48` triggers the `else if (this.partnerMoving)` branch (line 526)

The problem: the partner moves at `speed * 0.9 * (delta / 1000)` per frame toward `playerPositionHistory[0]`. With no deceleration, the partner overshoots the target position, lands >48px away on the other side, starts moving again, overshoots again — causing oscillation/shaking.

The snap to `Math.round()` (lines 529-530) only fires once when `partnerMoving` transitions to false, but the oscillation happens across multiple frames before that transition sticks.

### Fix

**File:** `src/scenes/WorldScene.ts`

Modify `updatePartner()` (lines 501-537) with three changes:

#### Change 1: Lerp-based approach within 20px

When the partner is within 20px of the target, switch from constant-speed movement to lerp (linear interpolation). This creates natural deceleration as the partner approaches.

```typescript
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

    if (targetDist < 20) {
      // Lerp for smooth deceleration near target
      this.partner.x = Phaser.Math.Linear(this.partner.x, target.x, 0.08);
      this.partner.y = Phaser.Math.Linear(this.partner.y, target.y, 0.08);
    } else {
      // Normal constant-speed movement
      const angle = Phaser.Math.Angle.Between(
        this.partner.x, this.partner.y,
        target.x, target.y
      );
      const partnerSpeed = this.speed * 0.9;
      const dx = Math.cos(angle) * partnerSpeed * (delta / 1000);
      this.partner.x += dx;
      this.partner.y += Math.sin(angle) * partnerSpeed * (delta / 1000);
    }

    // Walk animation and direction (unchanged)
    ...
  }
  ...
}
```

#### Change 2: Increase snap threshold from implicit to explicit 6px

Add an explicit snap when the partner is within 6px of the history target:

```typescript
if (targetDist < 6) {
  // Close enough — consume this history point
  this.partner.x = target.x;
  this.partner.y = target.y;
}
```

#### Change 3: Lerp to final position when player is idle

When the player has stopped but the partner is still slightly offset (4-48px range), lerp the partner toward the player's current position:

After the `else if (this.partnerMoving)` block (current line 526), add:

```typescript
else if (!this.playerMoving && dist > 6) {
  // Player stopped but partner not yet settled — gently drift to final position
  this.partner.x = Phaser.Math.Linear(this.partner.x, this.player.x - 40, 0.05);
  this.partner.y = Phaser.Math.Linear(this.partner.y, this.player.y, 0.05);
}
```

The `-40` offset keeps the partner beside the player rather than overlapping (matching the initial spawn offset from line 207).

### Risk: Low

The lerp approach is a standard technique for smooth following. The 0.08 factor means the partner covers 8% of the remaining distance each frame — fast enough to not feel sluggish, slow enough to prevent overshoot. If the partner feels too slow, increase to 0.12.

---

## Bug 5: NPCs Teleport Between Positions

### Root Cause

Two teleportation sources in `NPCSystem.ts`:

1. **Schedule transitions** (lines 335-342): When `scheduleIdx !== npc.currentScheduleIdx`, the old behavior's `exit()` is called, a new behavior is created, and `enter()` is called. The `enter()` methods of `IdleAtBehavior` (line 171) and `SitBenchBehavior` (line 203) call `npc.sprite.setPosition(node.x, node.y)` — an instant teleport.

2. **Stuck detection** (lines 362-367): When a walking NPC hasn't moved >2px in 3 seconds, it teleports to the nearest path node via `npc.sprite.setPosition(nearest.x, nearest.y)`.

### Fix

**File:** `src/systems/NPCSystem.ts`

#### Fix for schedule transitions (lines 335-342)

Replace the instant behavior switch with a tween transition. When the schedule changes:

1. Exit the old behavior
2. Determine the new behavior's target position
3. Tween the sprite from current position to the target with a fade effect
4. After tween completes, enter the new behavior (but skip its `setPosition` call)

Implementation approach — add a `transitionTo` method to `NPCSystem`:

```typescript
private transitionTo(npc: NPCEntity, newBehavior: BehaviorStrategy, entry: NPCScheduleEntry): void {
  // Determine target position for the new behavior
  let targetX = npc.sprite.x;
  let targetY = npc.sprite.y;

  if (entry.behavior === 'idle-at' || entry.behavior === 'sit-bench') {
    const node = this.networkMap.get(entry.idleAt ?? '');
    if (node) {
      targetX = node.x;
      targetY = node.y;
    }
  } else if (entry.behavior === 'walk-route' && entry.route && entry.route.length > 0) {
    const node = this.networkMap.get(entry.route[0]);
    if (node) {
      targetX = node.x;
      targetY = node.y;
    }
  }

  const dist = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, targetX, targetY);

  if (dist < 10) {
    // Close enough — no transition needed, just enter directly
    npc.currentBehavior = newBehavior;
    newBehavior.enter(npc);
    return;
  }

  // Fade + move tween
  npc.currentBehavior = null; // prevent updates during transition
  this.scene.tweens.add({
    targets: npc.sprite,
    x: targetX,
    y: targetY,
    alpha: { from: 1, to: 0.3, yoyo: true },
    duration: 400,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      npc.sprite.alpha = 1;
      npc.currentBehavior = newBehavior;
      // Enter behavior but position is already set by the tween
      // Need to skip setPosition in enter() — see below
      newBehavior.enter(npc);
    },
  });
}
```

**Problem:** The `enter()` methods of `IdleAtBehavior` and `SitBenchBehavior` call `setPosition()`, which would override the tween's final position. Two options:

**Option A (preferred):** Add a `skipPosition` flag to `NPCEntity`:

```typescript
interface NPCEntity {
  ...
  skipPositionOnEnter: boolean;  // new field
}
```

Modify `IdleAtBehavior.enter()` and `SitBenchBehavior.enter()`:
```typescript
enter(npc: NPCEntity): void {
  if (!npc.skipPositionOnEnter) {
    const node = this.networkMap.get(this.nodeId);
    if (node) {
      npc.sprite.setPosition(node.x, node.y);
    }
  }
  npc.skipPositionOnEnter = false; // reset
  ...
}
```

Set `npc.skipPositionOnEnter = true` before calling `newBehavior.enter(npc)` in the tween's `onComplete`.

**Option B (simpler):** Do not call `enter()` from the tween. Instead, duplicate only the non-position parts of `enter()` (set texture, reset timers). This avoids modifying the behavior interface but duplicates logic.

Recommendation: **Option A.** The flag is a clean, minimal addition that keeps behavior logic centralized.

#### Fix for stuck detection (lines 362-367)

Replace the instant teleport with the same fade+move tween:

```typescript
if (npc.stuckTimer > 3000) {
  const nearest = findClosestNode(npc.sprite.x, npc.sprite.y, this.networkMap);
  npc.stuckTimer = 0;
  // Smooth unstick instead of teleport
  this.scene.tweens.add({
    targets: npc.sprite,
    x: nearest.x,
    y: nearest.y,
    alpha: { from: 1, to: 0.3, yoyo: true },
    duration: 400,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      npc.sprite.alpha = 1;
    },
  });
}
```

#### Update schedule transition code (lines 335-342)

Replace:
```typescript
if (scheduleIdx !== npc.currentScheduleIdx) {
  if (npc.currentBehavior) {
    npc.currentBehavior.exit(npc);
  }
  npc.currentScheduleIdx = scheduleIdx;
  npc.currentBehavior = this.createBehavior(npc.def.schedule[scheduleIdx]);
  npc.currentBehavior.enter(npc);
}
```

With:
```typescript
if (scheduleIdx !== npc.currentScheduleIdx) {
  if (npc.currentBehavior) {
    npc.currentBehavior.exit(npc);
  }
  npc.currentScheduleIdx = scheduleIdx;
  const entry = npc.def.schedule[scheduleIdx];
  const newBehavior = this.createBehavior(entry);
  this.transitionTo(npc, newBehavior, entry);
}
```

### Edge Cases

- **Tween interrupted by another schedule change:** If a transition tween is in progress when another schedule change occurs, the new change should kill the in-progress tween. Add a `transitionTween` field to `NPCEntity` and call `transitionTween.stop()` before starting a new one.
- **NPC hidden during transition:** If the NPC becomes invisible (schedule window ends) during a transition tween, stop the tween and hide immediately.
- **Behavior loop re-entry (line 350):** When a behavior completes and re-enters (e.g., walk route loops), `enter()` is called again. This is fine — the NPC is already at the route start, so `setPosition` is a no-op. No transition tween needed here since `dist < 10` check handles it.

### Files to Modify

- `src/systems/NPCSystem.ts` — all changes for this bug

### Risk: Medium

The tween-during-transition approach introduces asynchronous state (tween callback sets behavior after delay). Key risks:
- Race condition if schedule changes rapidly (mitigated by tracking and stopping active transition tweens)
- NPC has `null` behavior during the 400ms tween, so `update()` must handle `currentBehavior === null` gracefully (it already does — line 345 checks `if (npc.currentBehavior)`)
- The 400ms delay means NPCs take slightly longer to start their new behavior

---

## Summary of Files to Modify

| File | Bugs |
|------|------|
| `index.html` | Bug 1, Bug 2 (Phase 3) |
| `src/scenes/WorldScene.ts` | Bug 2 (Phase 2), Bug 3, Bug 4 |
| `src/systems/NPCSystem.ts` | Bug 5 |

## Risk Summary

| Bug | Risk | Reason |
|-----|------|--------|
| Bug 1 | Low | Single CSS line removal, Phaser handles the rest |
| Bug 2 | Low-Medium | Phased approach limits risk; Phase 1 is assessment only |
| Bug 3 | Low | Visual-only change, conservative values |
| Bug 4 | Low | Standard lerp technique, easy to tune |
| Bug 5 | Medium | Async tween transitions add state complexity |
