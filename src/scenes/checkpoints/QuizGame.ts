import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

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

    // Persistent background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Quit button (persistent, not cleared between questions)
    const quitBtn = this.add.text(width - 16, 10, 'X', {
      fontSize: '18px',
      color: '#ef4444',
      backgroundColor: '#1e1b2e',
      padding: { x: 12, y: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(999);

    quitBtn.on('pointerdown', () => this.returnToWorld());

    this.showQuestion();
  }

  private showQuestion(): void {
    // Clear only question-specific elements
    this.questionElements.forEach((el) => el.destroy());
    this.questionElements = [];

    const { width, height } = this.cameras.main;
    const q = this.questions[this.currentQuestion];

    // Progress
    this.questionElements.push(
      this.add.text(width / 2, 30, `Question ${this.currentQuestion + 1}/${this.questions.length}`, {
        fontSize: '14px',
        color: '#64748b',
      }).setOrigin(0.5)
    );

    // Question
    this.questionElements.push(
      this.add.text(width / 2, height / 3, q.question, {
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: 600 },
        align: 'center',
      }).setOrigin(0.5)
    );

    // Options
    q.options.forEach((opt, i) => {
      const btn = this.add.text(width / 2, height / 2 + i * 55, `${String.fromCharCode(65 + i)}) ${opt}`, {
        fontSize: '18px',
        color: '#94a3b8',
        backgroundColor: '#2a2a4a',
        padding: { x: 20, y: 14 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#94a3b8'));
      btn.on('pointerdown', () => this.handleAnswer(i));

      this.questionElements.push(btn);
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

    this.add.text(width / 2, height / 3, `You got ${this.score}/${this.questions.length}!`, {
      fontSize: '32px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 50, this.score === this.questions.length ? 'Perfect! You know us so well!' : 'Nice try!', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 60, '[ Back to Map ]', {
      fontSize: '20px',
      color: '#22c55e',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.returnToWorld());
  }

  private returnToWorld(): void {
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) worldScene.refreshUI();
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
