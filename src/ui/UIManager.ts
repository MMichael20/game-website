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

export interface SettingsConfig {
  onClose: () => void;
  onFullscreen: () => void;
  onNewGame: () => void;
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
      <button class="hud__map-btn" title="Map">\uD83D\uDDFA</button>
      <button class="hud__settings-btn" title="Settings">\u2699</button>
    `;
    hudEl.querySelector('.hud__settings-btn')?.addEventListener('click', () => {
      this.settingsHandler?.();
    });
    hudEl.querySelector('.hud__map-btn')?.addEventListener('click', () => {
      if (!this.isDialogActive()) this.minimapHandler?.();
    });
    this.hud.appendChild(hudEl);
  }

  setSettingsHandler(handler: () => void): void {
    this.settingsHandler = handler;
  }

  setMinimapHandler(handler: (() => void) | null): void {
    this.minimapHandler = handler;
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
    panel.innerHTML = `
      <div class="settings-panel">
        <h2 class="settings-panel__title">Settings</h2>
        <button class="btn btn--secondary settings-panel__btn" data-action="fullscreen">Toggle Fullscreen</button>
        <button class="btn btn--secondary settings-panel__btn" data-action="newgame">New Game</button>
        <button class="btn btn--primary settings-panel__btn" data-action="close">Close</button>
      </div>
    `;
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
    const el = document.createElement('div');
    el.className = 'dialog-overlay';
    el.innerHTML = `
      <div class="dialog">
        <h2 class="dialog__title">${title}</h2>
        <p class="dialog__message">Score: ${score}</p>
        <button class="btn btn--primary" id="minigame-continue">Continue</button>
      </div>
    `;
    el.querySelector('#minigame-continue')?.addEventListener('click', onContinue);
    this.dialogContainer.appendChild(el);
  }
}

export const uiManager = new UIManager();
