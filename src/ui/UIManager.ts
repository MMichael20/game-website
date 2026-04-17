// src/ui/UIManager.ts

export interface DialogConfig {
  title: string;
  message: string;
  buttons: Array<{ label: string; onClick: () => void }>;
}

export interface MinigameOverlayConfig {
  title: string;
  score?: number;
  timer?: number;
  maxScore?: number;
  progress?: string; // e.g. "2/5"
  onExit?: () => void;
}

export interface AudioSettingsConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
  onMasterVolume: (value: number) => void;
  onMusicVolume: (value: number) => void;
  onSFXVolume: (value: number) => void;
  onAmbientVolume: (value: number) => void;
  onMuteToggle: () => void;
}

export interface SettingsConfig {
  onClose: () => void;
  onFullscreen: () => void;
  onNewGame: () => void;
  audio?: AudioSettingsConfig;
}

export interface DressingRoomConfig {
  playerOutfitName: string;
  partnerOutfitName: string;
  onPrevPlayer: () => void;
  onNextPlayer: () => void;
  onPrevPartner: () => void;
  onNextPartner: () => void;
  onStart: () => void;
}

class UIManager {
  private container!: HTMLElement;
  private hud!: HTMLElement;
  private dialogContainer!: HTMLElement;
  private menuContainer!: HTMLElement;
  private settingsHandler: (() => void) | null = null;
  private minimapHandler: (() => void) | null = null;
  private albumHandler: (() => void) | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    this.hud = container.querySelector('#hud') as HTMLElement;
    this.dialogContainer = container.querySelector('#dialog-container') as HTMLElement;
    this.menuContainer = container.querySelector('#menu-container') as HTMLElement;
  }

  // --- Main Menu ---
  showMainMenu(onNewGame: () => void, onContinue: (() => void) | null): void {
    this.menuContainer.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <h1 class="main-menu__title">H&M Adventures</h1>
      <div class="main-menu__buttons">
        <button class="btn btn--primary" data-action="new">New Game</button>
        ${onContinue ? '<button class="btn btn--secondary" data-action="continue">Continue</button>' : ''}
      </div>
    `;
    menu.querySelector('[data-action="new"]')?.addEventListener('click', onNewGame);
    if (onContinue) {
      menu.querySelector('[data-action="continue"]')?.addEventListener('click', onContinue);
    }
    this.menuContainer.appendChild(menu);
  }

  hideMainMenu(): void {
    this.menuContainer.innerHTML = '';
  }

  // --- HUD ---
  showHUD(): void {
    this.hud.innerHTML = '';
    const hudEl = document.createElement('div');
    hudEl.className = 'hud';
    hudEl.innerHTML = `
      <div class="hud__top-right">
        <button class="hud__btn hud__map-btn" title="Map">\uD83D\uDDFA</button>
        <button class="hud__btn hud__album-btn" title="Photo Album">\uD83D\uDCF7</button>
        <button class="hud__btn hud__settings-btn" title="Settings">\u2699</button>
      </div>
    `;
    hudEl.querySelector('.hud__settings-btn')?.addEventListener('click', () => {
      this.settingsHandler?.();
    });
    hudEl.querySelector('.hud__map-btn')?.addEventListener('click', () => {
      if (!this.isDialogActive()) this.minimapHandler?.();
    });
    hudEl.querySelector('.hud__album-btn')?.addEventListener('click', () => {
      if (!this.isDialogActive()) this.albumHandler?.();
    });
    this.hud.appendChild(hudEl);
  }

  setSettingsHandler(handler: () => void): void {
    this.settingsHandler = handler;
  }

  setMinimapHandler(handler: (() => void) | null): void {
    this.minimapHandler = handler;
  }

  setAlbumHandler(handler: (() => void) | null): void {
    this.albumHandler = handler;
  }

  showPhotoAlbum(visitedIds: string[], labelMap: Record<string, string>): void {
    const LANDMARK_PHOTOS: Record<string, { name: string; desc: string }> = {
      bp_parliament: { name: 'Parliament', desc: 'Neo-Gothic masterpiece on the Danube' },
      bp_chain_bridge: { name: 'Chain Bridge', desc: 'First permanent bridge across the Danube' },
      bp_fishermans_bastion: { name: "Fisherman's Bastion", desc: 'Seven towers for seven tribes' },
      bp_liberty_bridge: { name: 'Liberty Bridge', desc: 'Art Nouveau ironwork, painted green' },
      bp_margaret_bridge: { name: 'Margaret Bridge', desc: 'Gateway to Margaret Island' },
      bp_gellert_hill: { name: 'Gellert Hill', desc: 'Panoramic view over all of Budapest' },
      bp_opera: { name: 'Opera House', desc: 'Neo-Renaissance gem on Andrássy Avenue' },
      bp_gellert_baths: { name: 'Gellért Baths', desc: 'Art Nouveau elegance, warm waters' },
      bp_szechenyi_baths: { name: 'Széchenyi Baths', desc: 'Warm waters, warm memories' },
      bp_heroes_square: { name: 'Heroes\' Square', desc: 'Where Hungary\'s story begins' },
      bp_st_stephens: { name: 'St. Stephen\'s Basilica', desc: '96 meters of spiritual grandeur' },
      bp_great_market: { name: 'Great Market Hall', desc: 'Paprika, sausages, and lángos' },
      bp_danube_cruise: { name: 'Danube Cruise', desc: 'City of light from the river' },
      bp_eye: { name: 'Budapest Eye', desc: 'The city from above' },
      bp_jewish_quarter: { name: 'Jewish Quarter', desc: 'History and vibrant street art' },
      bp_airbnb: { name: 'Our Apartment', desc: 'Home away from home' },
    };

    const allPhotos = Object.entries(LANDMARK_PHOTOS);
    const collected = allPhotos.filter(([id]) => visitedIds.includes(id));
    const missing = allPhotos.filter(([id]) => !visitedIds.includes(id));

    const photoHTML = collected.map(([, p]) =>
      `<div class="photo-item photo-item--collected">📸 <strong>${p.name}</strong><br><small>${p.desc}</small></div>`
    ).join('');

    const missingHTML = missing.map(([, p]) =>
      `<div class="photo-item photo-item--locked">🔒 <strong>???</strong><br><small>Visit to unlock</small></div>`
    ).join('');

    this.showDialog({
      title: `📷 Photo Album (${collected.length}/${allPhotos.length})`,
      message: (photoHTML || '<em>No photos yet! Visit landmarks to collect them.</em>') + missingHTML,
      buttons: [{ label: 'Close', onClick: () => this.hideDialog() }],
    });
  }

  hideHUD(): void {
    this.hud.innerHTML = '';
  }

  // --- Interaction Prompt ---
  showInteractionPrompt(text: string, onClick?: () => void): void {
    this.hideInteractionPrompt();
    const prompt = document.createElement('div');
    prompt.className = 'interaction-prompt';
    prompt.id = 'interaction-prompt';
    prompt.textContent = text;
    if (onClick) {
      prompt.classList.add('interaction-prompt--clickable');
      prompt.style.pointerEvents = 'auto';
      prompt.style.cursor = 'pointer';
      prompt.addEventListener('click', onClick);
    }
    this.hud.appendChild(prompt);
  }

  hideInteractionPrompt(): void {
    document.getElementById('interaction-prompt')?.remove();
  }

  // --- Dialog ---
  showDialog(config: DialogConfig): void {
    this.dialogContainer.innerHTML = '';
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <h2 class="dialog__title">${config.title}</h2>
        <p class="dialog__message">${config.message}</p>
        <div class="dialog__buttons">
          ${config.buttons.map((btn, i) => `
            <button class="btn btn--primary" data-btn="${i}">${btn.label}</button>
          `).join('')}
        </div>
      </div>
    `;
    config.buttons.forEach((btn, i) => {
      dialog.querySelector(`[data-btn="${i}"]`)?.addEventListener('click', btn.onClick);
    });
    this.dialogContainer.appendChild(dialog);
  }

  hideDialog(): void {
    this.dialogContainer.innerHTML = '';
  }

  isDialogActive(): boolean {
    return this.dialogContainer.children.length > 0;
  }

  showToast(message: string, durationMs = 3000): void {
    const hud = document.getElementById('hud');
    if (!hud) return;

    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.textContent = message;
    hud.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('hud-toast--visible'));

    setTimeout(() => {
      toast.classList.remove('hud-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  // --- Mini-game Overlay ---
  showMinigameOverlay(config: MinigameOverlayConfig): void {
    this.hideMinigameOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.id = 'minigame-overlay';
    overlay.innerHTML = `
      <div class="minigame-overlay__header">
        <span class="minigame-overlay__title">${config.title}</span>
        ${config.progress ? `<span class="minigame-overlay__progress">${config.progress}</span>` : ''}
        ${config.onExit ? '<button class="btn btn--icon minigame-overlay__exit" title="Exit game">\u2715</button>' : ''}
      </div>
      <div class="minigame-overlay__stats">
        ${config.score !== undefined ? `<span class="minigame-overlay__score">Score: <strong>${config.score}</strong></span>` : ''}
        ${config.timer !== undefined ? `<span class="minigame-overlay__timer">Time: <strong>${config.timer}s</strong></span>` : ''}
      </div>
    `;
    if (config.onExit) {
      overlay.querySelector('.minigame-overlay__exit')?.addEventListener('click', config.onExit);
    }
    this.hud.appendChild(overlay);
  }

  updateMinigameOverlay(data: Partial<MinigameOverlayConfig>): void {
    const overlay = document.getElementById('minigame-overlay');
    if (!overlay) return;
    if (data.score !== undefined) {
      const el = overlay.querySelector('.minigame-overlay__score strong');
      if (el) el.textContent = String(data.score);
    }
    if (data.timer !== undefined) {
      const el = overlay.querySelector('.minigame-overlay__timer strong');
      if (el) el.textContent = `${data.timer}s`;
    }
    if (data.progress) {
      const el = overlay.querySelector('.minigame-overlay__progress');
      if (el) el.textContent = data.progress;
    }
  }

  hideMinigameOverlay(): void {
    document.getElementById('minigame-overlay')?.remove();
  }

  // --- Completion Screen ---
  showCompletionScreen(scores: Record<string, number>): void {
    this.menuContainer.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'completion-screen';
    const scoreEntries = Object.entries(scores)
      .map(([name, score]) => `<li>${name}: ${score}</li>`)
      .join('');
    screen.innerHTML = `
      <div class="completion-screen__content">
        <h1 class="completion-screen__title">Adventure Complete!</h1>
        <p class="completion-screen__message">You visited all the places together!</p>
        <ul class="completion-screen__scores">${scoreEntries}</ul>
        <button class="btn btn--primary" id="completion-restart">Play Again</button>
      </div>
    `;
    this.menuContainer.appendChild(screen);
  }

  // --- Settings ---
  showSettings(config: SettingsConfig): void {
    this.dialogContainer.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'dialog-overlay';

    const audio = config.audio;
    const audioHTML = audio ? `
      <div class="settings-panel__audio">
        <div class="audio-slider">
          <span class="audio-slider__label">Master</span>
          <input type="range" class="audio-slider__input" data-vol="master" min="0" max="100" value="${Math.round(audio.masterVolume * 100)}">
        </div>
        <div class="audio-slider">
          <span class="audio-slider__label">Music</span>
          <input type="range" class="audio-slider__input" data-vol="music" min="0" max="100" value="${Math.round(audio.musicVolume * 100)}">
        </div>
        <div class="audio-slider">
          <span class="audio-slider__label">SFX</span>
          <input type="range" class="audio-slider__input" data-vol="sfx" min="0" max="100" value="${Math.round(audio.sfxVolume * 100)}">
        </div>
        <div class="audio-slider">
          <span class="audio-slider__label">Ambient</span>
          <input type="range" class="audio-slider__input" data-vol="ambient" min="0" max="100" value="${Math.round(audio.ambientVolume * 100)}">
        </div>
        <button class="btn btn--secondary settings-panel__mute-btn ${audio.muted ? 'settings-panel__mute-btn--muted' : ''}" data-action="mute">
          ${audio.muted ? 'Unmute Audio' : 'Mute Audio'}
        </button>
      </div>
    ` : '';

    panel.innerHTML = `
      <div class="settings-panel">
        <h2 class="settings-panel__title">Settings</h2>
        ${audioHTML}
        <button class="btn btn--secondary settings-panel__btn" data-action="fullscreen">Toggle Fullscreen</button>
        <button class="btn btn--secondary settings-panel__btn" data-action="newgame">New Game</button>
        <button class="btn btn--primary settings-panel__btn" data-action="close">Close</button>
      </div>
    `;

    // Wire audio sliders
    if (audio) {
      const volHandlers: Record<string, (v: number) => void> = {
        master: audio.onMasterVolume,
        music: audio.onMusicVolume,
        sfx: audio.onSFXVolume,
        ambient: audio.onAmbientVolume,
      };
      panel.querySelectorAll<HTMLInputElement>('.audio-slider__input').forEach(slider => {
        const key = slider.dataset.vol;
        if (key && volHandlers[key]) {
          slider.addEventListener('input', () => {
            volHandlers[key](parseInt(slider.value, 10) / 100);
          });
        }
      });
      panel.querySelector('[data-action="mute"]')?.addEventListener('click', () => {
        audio.onMuteToggle();
        // Update button text
        const btn = panel.querySelector('[data-action="mute"]');
        if (btn) {
          const nowMuted = btn.classList.toggle('settings-panel__mute-btn--muted');
          btn.textContent = nowMuted ? 'Unmute Audio' : 'Mute Audio';
        }
      });
    }

    panel.querySelector('[data-action="fullscreen"]')?.addEventListener('click', config.onFullscreen);
    panel.querySelector('[data-action="newgame"]')?.addEventListener('click', config.onNewGame);
    panel.querySelector('[data-action="close"]')?.addEventListener('click', config.onClose);
    this.dialogContainer.appendChild(panel);
  }

  // --- Dressing Room ---
  showDressingRoom(config: DressingRoomConfig): void {
    this.hideDressingRoom();
    const el = document.createElement('div');
    el.className = 'dressing-room-ui';
    el.id = 'dressing-room-ui';
    el.innerHTML = `
      <div class="dressing-room-ui__row">
        <div class="dressing-room-ui__picker">
          <span class="dressing-room-ui__label">Hadar</span>
          <div class="dressing-room-ui__controls">
            <button class="btn btn--icon" data-action="prev-player">\u25C0</button>
            <span class="dressing-room-ui__outfit-name" id="player-outfit-name">${config.playerOutfitName}</span>
            <button class="btn btn--icon" data-action="next-player">\u25B6</button>
          </div>
        </div>
        <div class="dressing-room-ui__picker">
          <span class="dressing-room-ui__label">Michael</span>
          <div class="dressing-room-ui__controls">
            <button class="btn btn--icon" data-action="prev-partner">\u25C0</button>
            <span class="dressing-room-ui__outfit-name" id="partner-outfit-name">${config.partnerOutfitName}</span>
            <button class="btn btn--icon" data-action="next-partner">\u25B6</button>
          </div>
        </div>
      </div>
      <button class="btn btn--primary dressing-room-ui__start" data-action="start">Start Adventure \u2665</button>
    `;
    el.querySelector('[data-action="prev-player"]')?.addEventListener('click', config.onPrevPlayer);
    el.querySelector('[data-action="next-player"]')?.addEventListener('click', config.onNextPlayer);
    el.querySelector('[data-action="prev-partner"]')?.addEventListener('click', config.onPrevPartner);
    el.querySelector('[data-action="next-partner"]')?.addEventListener('click', config.onNextPartner);
    el.querySelector('[data-action="start"]')?.addEventListener('click', config.onStart);
    this.menuContainer.appendChild(el);
  }

  updateDressingRoom(playerOutfitName: string, partnerOutfitName: string): void {
    const pEl = document.getElementById('player-outfit-name');
    const partEl = document.getElementById('partner-outfit-name');
    if (pEl) pEl.textContent = playerOutfitName;
    if (partEl) partEl.textContent = partnerOutfitName;
  }

  hideDressingRoom(): void {
    document.getElementById('dressing-room-ui')?.remove();
  }

  // --- Quiz-specific ---
  showQuizQuestion(question: string, options: string[], onAnswer: (index: number) => void): void {
    this.hideQuizQuestion();
    const el = document.createElement('div');
    el.className = 'quiz-overlay';
    el.id = 'quiz-overlay';
    el.innerHTML = `
      <div class="quiz-overlay__question">${question}</div>
      <div class="quiz-overlay__options">
        ${options.map((opt, i) => `
          <button class="btn btn--quiz" data-answer="${i}">${opt}</button>
        `).join('')}
      </div>
    `;
    options.forEach((_, i) => {
      el.querySelector(`[data-answer="${i}"]`)?.addEventListener('click', () => onAnswer(i));
    });
    this.dialogContainer.appendChild(el);
  }

  showQuizFeedback(correct: boolean, correctAnswer: string): void {
    const el = document.getElementById('quiz-overlay');
    if (!el) return;
    const feedback = document.createElement('div');
    feedback.className = `quiz-overlay__feedback quiz-overlay__feedback--${correct ? 'correct' : 'wrong'}`;
    feedback.textContent = correct ? '\u2713 Correct!' : `\u2717 It was: ${correctAnswer}`;
    el.appendChild(feedback);
  }

  hideQuizQuestion(): void {
    document.getElementById('quiz-overlay')?.remove();
  }

  // --- NPC Dialog ---
  showNPCDialog(lines: string[], onComplete: () => void): void {
    this.hideNPCDialog();
    let currentLine = 0;
    const el = document.createElement('div');
    el.className = 'npc-dialog';
    el.id = 'npc-dialog';
    el.innerHTML = `
      <div class="npc-dialog__box">
        <p class="npc-dialog__text" id="npc-dialog-text" dir="auto">${lines[0]}</p>
        <span class="npc-dialog__advance">${lines.length > 1 ? 'Tap ▶' : 'Tap ✕'}</span>
      </div>
    `;

    const advance = () => {
      currentLine++;
      if (currentLine >= lines.length) {
        this.hideNPCDialog();
        onComplete();
        return;
      }
      const textEl = document.getElementById('npc-dialog-text');
      if (textEl) textEl.textContent = lines[currentLine];
      const advEl = el.querySelector('.npc-dialog__advance');
      if (advEl) advEl.textContent = currentLine === lines.length - 1 ? 'Tap ✕' : 'Tap ▶';
    };

    el.addEventListener('click', advance);
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        advance();
      }
    };
    document.addEventListener('keydown', keyHandler);
    (el as any)._keyHandler = keyHandler;

    this.dialogContainer.appendChild(el);
  }

  hideNPCDialog(): void {
    const el = document.getElementById('npc-dialog');
    if (el) {
      const handler = (el as any)._keyHandler;
      if (handler) document.removeEventListener('keydown', handler);
      el.remove();
    }
  }

  // --- Minigame result screen ---
  showMinigameResult(title: string, score: number, onContinue: () => void): void {
    this.dialogContainer.innerHTML = '';

    // Star rating based on score thresholds
    const stars = score >= 300 ? 3 : score >= 150 ? 2 : score >= 50 ? 1 : 0;
    const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
    const ratingMsg = stars === 3 ? 'Amazing!' : stars === 2 ? 'Great job!' : stars === 1 ? 'Not bad!' : 'Try again!';

    const el = document.createElement('div');
    el.className = 'dialog-overlay';
    el.innerHTML = `
      <div class="dialog">
        <h2 class="dialog__title">${title}</h2>
        <div class="dialog__stars" style="font-size:32px;color:#FFD700;text-align:center;margin:8px 0;">${starStr}</div>
        <p class="dialog__message" style="text-align:center;">${ratingMsg}<br>Score: <strong>${score}</strong></p>
        <button class="btn btn--primary" id="minigame-continue">Continue</button>
      </div>
    `;
    el.querySelector('#minigame-continue')?.addEventListener('click', onContinue);
    this.dialogContainer.appendChild(el);
  }
}

export const uiManager = new UIManager();
