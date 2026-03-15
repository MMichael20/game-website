# Phase 1 Design Document: Touch Input, Fullscreen & Mobile Interaction

**Date:** 2026-03-16
**Status:** Ready for implementation
**Estimated effort:** ~60 lines of code across 2 files (`main.ts`, `WorldScene.ts`)
**Files modified:** `src/main.ts`, `src/scenes/WorldScene.ts`

---

## 1. Overview

Phase 1 makes "Our Places" playable on mobile devices. It adds three capabilities:
1. **Tap-to-move** — tap anywhere in the world, character walks there
2. **Fullscreen toggle** — a single UI button to enter/exit fullscreen mode
3. **Mobile checkpoint interaction** — tap the prompt text to interact with checkpoints (no keyboard required)

The third item was originally scoped for Phase 2 but has been pulled forward. Without it, mobile users can walk to checkpoints but cannot interact with them, making Phase 1 incomplete as a mobile experience. The implementation cost is minimal (~5 extra lines).

---

## 2. User Stories

### US-1: Tap-to-Move
As a mobile user, I can tap anywhere on the game world and my character walks to that position, so I can navigate without a keyboard.

**Acceptance criteria:**
- Tap sets a destination; character walks toward it at speed 160
- A new tap replaces the previous destination (last-tap-wins)
- Keyboard input immediately overrides and cancels any active tap destination
- Partner follows using the existing position history mechanism (no changes to `updatePartner()`)
- Movement stops when the character arrives within 4px of the target

### US-2: Fullscreen Toggle
As a user, I can tap a button to enter or exit fullscreen, so the game fills my screen.

**Acceptance criteria:**
- A `[ Fullscreen ]` / `[ Exit FS ]` button appears in the WorldScene UI
- Button uses `this.scale.toggleFullscreen()`
- Button label updates on fullscreen enter/leave events
- Button is hidden entirely if `this.scale.fullscreen.available` is false (e.g., some iOS Safari contexts)
- Game scales cleanly in fullscreen without letterboxing

### US-3: Mobile Checkpoint Interaction
As a mobile user near a checkpoint, I can tap the prompt text to interact, so I do not need a physical keyboard.

**Acceptance criteria:**
- When `activeCheckpointId` is set, `promptText` becomes interactive with text "Tap here to enter"
- Tapping the prompt calls `openMemoryCard(activeCheckpointId)`
- The E key continues to work in parallel for keyboard users
- When `activeCheckpointId` is null, prompt is hidden and non-interactive

### US-4: Input Coexistence
As a user, I can freely switch between tap and keyboard input without restarting or toggling a mode.

**Acceptance criteria:**
- Keyboard and tap input coexist at all times
- Pressing any movement key cancels the current tap destination
- No mode switch or toggle required

---

## 3. Technical Design

### 3.1 Tap-to-Move (WorldScene.ts)

**New state:**
```typescript
private moveTarget: Phaser.Math.Vector2 | null = null;
private moveMarker: Phaser.GameObjects.Arc | null = null;
```

**Pointer handler (added in `setupInput()`):**
```
this.input.on('pointerdown', callback)
```

On pointerdown:
1. Check if the pointer hit an interactive UI element (`this.input.hitTest(...)` or check `pointer.downElement`). If so, return early — do NOT set a move target.
2. Convert pointer position to world coordinates via `this.cameras.main.getWorldPoint(pointer.x, pointer.y)`.
3. Clamp the resulting position to world bounds (0..1280, 0..960).
4. Store as `this.moveTarget`.
5. Optionally show a small visual marker at the target position (subtle circle, alpha 0.3, auto-fade).

**Movement integration (in `handleMovement()`):**
After the existing keyboard velocity block, add:
```
if keyboard is active (any key down):
    clear moveTarget
else if moveTarget is set:
    calculate direction from player to moveTarget
    if distance > 4px:
        set velocity toward target at this.speed
        normalize if needed
    else:
        snap player to target
        clear moveTarget
```

The position history recording block (lines 209-214) already runs whenever velocity is non-zero, so partner following works automatically with no changes.

### 3.2 Mobile Checkpoint Interaction (WorldScene.ts)

**In `checkCheckpointOverlap()` (modify existing):**

When `foundCheckpoint` is truthy:
- Set `promptText` text to `'Tap here to enter'`
- Call `promptText.setInteractive({ useHandCursor: true })` if not already interactive
- Add a one-time pointerdown listener (or use a persistent one that checks `activeCheckpointId`)

When `foundCheckpoint` is null:
- Call `promptText.disableInteractive()`
- Keep text as `'Press E to enter'` (will be hidden anyway)

**Pointer handler for promptText (added once in `createUI()`):**
```typescript
this.promptText.on('pointerdown', () => {
    if (this.activeCheckpointId) {
        this.openMemoryCard(this.activeCheckpointId);
    }
});
```

Note: The prompt text must NOT propagate the pointer event to the world (which would trigger tap-to-move). This is handled by the hit-test guard in the tap-to-move pointer handler.

### 3.3 Fullscreen Toggle (WorldScene.ts)

**In `createUI()`, add after the Settings button:**
```typescript
if (this.scale.fullscreen.available) {
    const fsBtn = this.add.text(/* positioned left of Settings */)
        .setScrollFactor(0).setDepth(90000).setInteractive({ useHandCursor: true });

    fsBtn.on('pointerdown', () => this.scale.toggleFullscreen());

    this.scale.on('enterfullscreen', () => fsBtn.setText('[ Exit FS ]'));
    this.scale.on('leavefullscreen', () => fsBtn.setText('[ Fullscreen ]'));
}
```

Position: right-aligned, to the left of the Settings button with an 8px gap. Same styling as Settings for consistency.

### 3.4 Config Changes (main.ts)

Add to the existing `scale` config:
```typescript
scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.body,
},
input: {
    touch: {
        capture: true,
    },
},
```

`fullscreenTarget: document.body` ensures fullscreen applies to the whole page, not just the canvas. `input.touch.capture: true` prevents touch events from propagating to the browser (avoids scroll/zoom conflicts).

---

## 4. Edge Cases

| Scenario | Behavior |
|---|---|
| Tap on character's current position | Distance < 4px threshold, treated as arrived immediately (no-op) |
| Tap outside world bounds | Coordinates clamped to world bounds (0..1280, 0..960) |
| Rapid successive taps | Last tap wins — each new tap replaces `moveTarget` |
| Tap while overlay/UI is visible | UI element consumes the pointer event; tap-to-move handler exits early via hit-test |
| Tap very close to character (< 4px) | Immediately snapped, moveTarget cleared |
| Multi-touch | Phaser fires pointerdown for each touch; only the most recent one sets moveTarget (last-wins, same as rapid taps) |
| Keyboard pressed while walking to tap target | moveTarget cleared, keyboard takes over immediately |
| Fullscreen on iOS Safari | `this.scale.fullscreen.available` returns false; button is never created — no broken UI |
| Orientation change while in fullscreen | Phaser Scale.FIT handles this; no additional code needed |
| promptText tap while not near checkpoint | `activeCheckpointId` is null, handler is a no-op; also, text is hidden |

---

## 5. Gaps Identified During Synthesis

| Gap | Source | Resolution |
|---|---|---|
| Mobile users cannot interact with checkpoints | PM flagged, Architect solved | Included in this design (section 3.2) — pulled from Phase 2 into Phase 1 |
| Pointer events hitting UI AND triggering movement | Architect flagged as risk | Addressed via hit-test guard in tap-to-move handler (section 3.1) |
| Arrival jitter when character reaches tap target | Architect flagged | Snap-to-target when within 4px threshold, then clear moveTarget |
| QA calls for 44x44px touch targets | QA quality gate | Fullscreen button and promptText must meet this minimum. Settings button should also be verified (existing, but may be undersized) |
| Position history buffer growth | QA flagged for testing | Already capped at 30 entries in existing code (line 211) — no change needed |
| No visual feedback for tap destination | Not addressed by any persona | Added optional moveMarker (subtle dot at target) — low priority, can be cut |

---

## 6. Risks

These items were flagged by multiple personas or represent implementation concerns:

1. **Pointer event leakage (high):** A tap on the Fullscreen button, Settings button, or promptText must NOT also trigger tap-to-move. The hit-test guard in the pointerdown handler is the single point of defense. If this fails, every UI tap causes unwanted movement. Both the Architect and PM identified this.

2. **iOS Safari fullscreen (medium):** Safari on iOS does not support the Fullscreen API for arbitrary elements. The button-hiding logic (`fullscreen.available` check) prevents a broken button, but users on iOS Safari simply will not have fullscreen capability. This is acceptable for Phase 1.

3. **Arrival jitter (low):** Without the snap threshold, the character could oscillate around the target due to overshooting at high speed or low frame rate. The 4px threshold with position snap eliminates this.

4. **Performance on mobile (low):** QA set a 30 FPS floor for mobile. Phase 1 adds negligible computation (one distance check per frame, one pointer handler). No risk here, but worth verifying during testing.

---

## 7. Out of Scope (Phase 1)

- Virtual joystick / on-screen d-pad
- Pathfinding around obstacles (character walks in a straight line)
- Gesture controls (pinch, swipe)
- Orientation lock
- Character visual improvements
- Haptic feedback
- Gamepad support

---

## 8. Implementation Tasks

Ordered for incremental delivery. Each task is small enough for one focused session.

### Task 1: Config updates (`main.ts`)
- Add `fullscreenTarget: document.body` to `scale` config
- Add `input: { touch: { capture: true } }` to game config
- Verify game still loads and renders correctly

### Task 2: Tap-to-move state and pointer handler (`WorldScene.ts`)
- Add `moveTarget` and `moveMarker` properties
- Add `pointerdown` listener in `setupInput()` with world coordinate conversion
- Add bounds clamping (0..1280, 0..960)
- Add hit-test guard to skip taps on interactive UI elements
- Optional: add visual marker at tap target

### Task 3: Tap-to-move movement integration (`WorldScene.ts`)
- Modify `handleMovement()` to check `moveTarget` when no keyboard keys are down
- Calculate direction and set velocity toward target
- Implement 4px arrival threshold with snap-and-clear
- Clear `moveTarget` when any keyboard key is pressed
- Verify partner following works automatically (no changes to `updatePartner()`)

### Task 4: Mobile checkpoint interaction (`WorldScene.ts`)
- Make `promptText` interactive in `createUI()` with pointerdown handler
- Update `checkCheckpointOverlap()` to set text to "Tap here to enter" and enable/disable interactivity
- Verify E key still works in parallel
- Verify tapping promptText does NOT also trigger tap-to-move (hit-test guard)

### Task 5: Fullscreen toggle (`WorldScene.ts`)
- Add fullscreen button in `createUI()`, guarded by `this.scale.fullscreen.available`
- Wire up `toggleFullscreen()` on pointerdown
- Listen to `enterfullscreen` / `leavefullscreen` events to update button label
- Position to the left of Settings button, matching its style
- Verify button meets 44x44px minimum touch target

### Task 6: Testing and edge cases
- Test all edge cases from section 4
- Verify on desktop (Chrome, Firefox) with both mouse and keyboard
- Verify on mobile (Chrome Android, Safari iOS) with touch only
- Confirm 60 FPS desktop, 30 FPS mobile
- Confirm zero console errors
- Verify fullscreen button hidden on iOS Safari if API unavailable

---

## 9. Test Coverage Summary

Based on QA Lead's test strategy, prioritized for Phase 1:

**Critical path (must pass before merge):**
- TAP-01: Tap sets destination, character walks there
- TAP-02: New tap replaces old destination
- TAP-03: Keyboard cancels tap destination
- TAP-04: Tap outside bounds is clamped
- TAP-05: Tap on UI does not trigger movement
- TAP-06: Character stops at destination (no jitter)
- TAP-07: Partner follows during tap-to-move
- KEY-01: Keyboard still works identically after tap feature added
- KEY-02: Can switch freely between tap and keyboard
- FS-01: Fullscreen enters and exits
- FS-02: Button label updates correctly
- FS-03: Button hidden when API unavailable
- FS-04: Game scales correctly in fullscreen
- MOB-01: Tap prompt text to interact with checkpoint
- MOB-02: E key still works for checkpoint interaction

**Quality gates:**
- 60 FPS on desktop
- 30 FPS on mobile
- < 100ms input latency
- 44x44px minimum touch targets
- Zero console errors

---

## 10. Security

No meaningful security surface. This is a client-side-only game with no backend, authentication, or PII. The only hardening measure is bounds clamping on tap coordinates, which is already included for robustness (section 3.1). No additional security controls are warranted.
