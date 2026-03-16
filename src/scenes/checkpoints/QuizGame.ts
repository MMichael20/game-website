import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';
import { createPanel, createStyledButton, createStyledText, createCloseButton, createPillContainer, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface QuizConfig {
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
}

interface QuizData {
  checkpointId: string;
  config: QuizConfig;
}

export class QuizGame extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: QuizConfig['questions'];
  private currentQuestion = 0;
  private score = 0;
  private questionElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'QuizGame' });
  }

  init(data: QuizData): void {
    this.checkpointId = data.checkpointId;
    this.questions = data.config.questions;
    this.currentQuestion = 0;
    this.score = 0;
    this.questionElements = [];
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2a1a3e, 0x2a1a3e, 1);
    bg.fillRect(0, 0, width, height);

    // Quit button using createCloseButton
    createCloseButton(this, width - 24, 24, () => this.returnToWorld()).setDepth(999);

    // Scale-in transition
    this.cameras.main.setZoom(0.8);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    this.showQuestion();
  }

  private showQuestion(): void {
    // Clear only question-specific elements
    this.questionElements.forEach((el) => el.destroy());
    this.questionElements = [];

    const { width, height } = this.cameras.main;
    const q = this.questions[this.currentQuestion];

    // Progress pill
    const pill = createPillContainer(this, width / 2, 30, `Question ${this.currentQuestion + 1}/${this.questions.length}`, {
      color: UI_COLORS.purple,
      textColor: UI_COLORS.textHex,
      fontSize: '14px',
    });
    this.questionElements.push(pill.bg, pill.label);

    // Question text
    const questionText = createStyledText(this, width / 2, height / 3, q.question, {
      fontSize: '20px',
      color: UI_COLORS.textHex,
      wordWrap: { width: Math.min(600, width * 0.85) },
      align: 'center',
    }).setOrigin(0.5);
    this.questionElements.push(questionText);

    // Answer buttons using createStyledButton
    q.options.forEach((opt, i) => {
      const { container } = createStyledButton(this, width / 2, height / 2 + i * Math.min(60, height * 0.08), `${String.fromCharCode(65 + i)}) ${opt}`, {
        color: UI_COLORS.purple,
        textColor: UI_COLORS.textHex,
        fontSize: '16px',
        width: Math.min(500, width * 0.85),
        paddingY: 14,
      });
      container.on('pointerdown', () => this.handleAnswer(i));
      this.questionElements.push(container);
    });
  }

  private handleAnswer(selected: number): void {
    const q = this.questions[this.currentQuestion];
    if (selected === q.answer) {
      this.score++;
    }

    this.currentQuestion++;
    if (this.currentQuestion < this.questions.length) {
      this.showQuestion();
    } else {
      this.showResults();
    }
  }

  private showResults(): void {
    this.questionElements.forEach((el) => el.destroy());
    this.questionElements = [];

    const { width, height } = this.cameras.main;

    saveMiniGameScore(this.checkpointId, this.score);

    // Results panel
    const panelW = Math.min(360, width * 0.9);
    const panelH = Math.min(240, height * 0.4);
    createPanel(this, width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, {
      color: UI_COLORS.darkPanel,
      radius: 16,
      shadow: true,
      strokeColor: UI_COLORS.gold,
      strokeWidth: 2,
    });

    // Score in gold
    createStyledText(this, width / 2, height / 2 - 50, `You got ${this.score}/${this.questions.length}!`, {
      fontSize: '32px',
      color: UI_COLORS.goldHex,
    }).setOrigin(0.5);

    createStyledText(this, width / 2, height / 2, this.score === this.questions.length ? 'Perfect! You know us so well!' : 'Nice try!', {
      fontSize: '16px',
      color: UI_COLORS.mutedHex,
    }).setOrigin(0.5);

    const { container: backBtn } = createStyledButton(this, width / 2, height / 2 + 60, 'Back to Map', {
      color: UI_COLORS.success,
      textColor: UI_COLORS.textHex,
      fontSize: '18px',
    });
    backBtn.on('pointerdown', () => this.returnToWorld());
  }

  private returnToWorld(): void {
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) worldScene.refreshUI();
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
