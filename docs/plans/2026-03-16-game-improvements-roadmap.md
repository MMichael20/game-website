# Our Places — Game Improvements Roadmap

**Date:** 2026-03-16
**Scope:** Fullscreen mode, touch-to-move input, improved character design

---

## Phase 1: MVP — Touch Input & Fullscreen Toggle

**Goal:** Make the game playable on mobile devices by adding tap-to-move navigation and a fullscreen toggle, using the existing character visuals.

**Scope:**
- Tap/click-to-move: player character pathfinds (or walks directly) toward the tapped position
- Partner character continues to follow via existing position history interpolation
- Fullscreen toggle button in WorldScene UI (uses Phaser `scale.startFullscreen()` / browser Fullscreen API)
- Phaser scale mode updated to `Phaser.Scale.RESIZE` (or equivalent) so the game fills the viewport in fullscreen
- Touch and keyboard input coexist — keyboard is not removed
- NOT included: character visual improvements, virtual joystick, gesture controls, orientation lock, on-screen interaction button (E key equivalent for touch is Phase 2)

**Dependencies:** None — this is the starting phase.

**Success Criteria:**
- A user on a mobile browser can tap a location and their character walks to it
- A user can enter and exit fullscreen on both desktop and mobile browsers
- The game renders without letterboxing or cropping in fullscreen at common aspect ratios (16:9, 4:3, mobile portrait/landscape)
- Existing keyboard controls still work identically

---

## Phase 2: Touch UX Completeness

**Goal:** Make every game interaction accessible without a keyboard, so the game is fully playable on a touchscreen device.

**Scope:**
- On-screen interaction prompt when near a checkpoint (replaces the "Press E" mechanic for touch users)
- Touch-friendly UI scaling: buttons, overlays, and mini-game controls sized for finger targets (minimum 44x44 CSS px)
- Mini-game input audit — ensure all five mini-games (Quiz, Catch, Match, Puzzle, Cooking) work with touch/click only
- Close/back gesture or button for checkpoint overlays (replaces ESC)
- Responsive HUD layout that adapts to the actual viewport size (fullscreen, landscape, portrait)
- NOT included: character visual improvements, haptic feedback, swipe gestures, gamepad support

**Dependencies:** Phase 1 (fullscreen and basic touch movement must be in place).

**Success Criteria:**
- A user can complete the entire game flow — menu, avatar creation, world exploration, all five mini-games — using only touch input, with no keyboard attached
- All interactive elements meet minimum touch target size
- No UI elements are clipped or unreachable in fullscreen on a phone-sized viewport (360x640 logical pixels and up)

---

## Phase 3: Improved Character Design

**Goal:** Replace the primitive Graphics API characters with visually appealing sprite-based characters that respect the existing customization system.

**Scope:**
- Design and produce sprite assets for the player and partner characters (idle + walk animation frames, 4 or 8 directions)
- Sprites support the existing five customization axes: hair style (5), hair color, skin tone (6), outfit color (5), accessory (hat/glasses/none)
- Composited character rendering: layered sprite sheets (base body + hair + outfit + accessory) assembled at runtime, replacing `setTint()` with proper colored layers
- Updated AvatarScene preview to render the new sprites instead of Graphics API shapes
- BootScene updated to load sprite assets instead of generating placeholder textures
- Walk animation plays during movement, idle animation when stationary
- NOT included: new customization options beyond the existing set, character emotes, NPC characters, portrait/dialogue art

**Dependencies:** Phase 2 (all input and display work is settled so character art is designed for the final viewport behavior, not refactored after the fact).

**Success Criteria:**
- Characters are visually distinct, animated, and clearly better than the current circles-and-rectangles
- All 5 hair styles, 6 skin tones, 5 outfit colors, and 3 accessories render correctly in all combinations (150 combinations)
- Character sprites look correct at the existing 1.5x camera zoom and at fullscreen resolutions
- No regression in movement feel — walk speed, collision bounds, and partner-follow behavior match previous phase

---

## Phase 4: Hardening

**Goal:** Ensure the game is stable, performant, and accessible across target devices and browsers.

**Scope:**
- Performance profiling on low-end mobile devices (target: consistent 30+ FPS with new sprites)
- Sprite atlas optimization (texture packing, lazy loading if needed)
- Asset loading error handling and retry logic in BootScene
- Fullscreen edge cases: orientation changes, browser chrome toggling, tab switching, iOS Safari quirks
- Touch input edge cases: multi-touch conflicts, pinch-to-zoom prevention, accidental scrolling
- Accessibility pass: color contrast on UI elements, screen reader hints for menu/avatar screens, reduced motion option for character animations
- Cross-browser testing: Chrome, Safari (iOS), Firefox, Samsung Internet — document supported matrix
- localStorage quota handling and save data validation
- NOT included: new features, analytics, CI/CD pipeline, automated test suite (manual test plan is sufficient for this project size)

**Dependencies:** Phase 3 (all features complete; this phase stabilizes, it does not add functionality).

**Success Criteria:**
- No crash or unrecoverable state across 10 full playthroughs on each target browser
- Load time under 5 seconds on a 3G connection (or graceful loading screen if longer)
- Game state persists correctly across fullscreen toggle, orientation change, and page refresh
- Documented known issues list with zero P0/P1 items remaining
