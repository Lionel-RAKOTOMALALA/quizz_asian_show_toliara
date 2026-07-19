import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Category,
  PublicQuestion,
  QUIZ_CONFIG,
  Question,
} from '@quizz/shared';
import animeQuestions from './data/anime.json';
import kpopQuestions from './data/kpop.json';
import { seededShuffle } from './shuffle';

/** Une question prête à être envoyée au joueur : propositions mélangées, réponse retirée. */
export interface ServedQuestion extends PublicQuestion {
  /** Position de la question dans la session (0-based). */
  index: number;
}

@Injectable()
export class QuestionsService implements OnModuleInit {
  private readonly logger = new Logger(QuestionsService.name);
  private readonly byCategory = new Map<Category, Question[]>();

  /** IDs déjà vus, toutes catégories confondues : ils servent de clé en base (Attempt.questionId). */
  private readonly seenIds = new Set<string>();

  onModuleInit(): void {
    this.load('kpop', kpopQuestions as Question[]);
    this.load('anime', animeQuestions as Question[]);
  }

  /** Charge et valide un lot de questions. Échoue au démarrage si la donnée est invalide. */
  private load(category: Category, questions: Question[]): void {
    const errors: string[] = [];

    for (const q of questions) {
      if (this.seenIds.has(q.id)) errors.push(`ID dupliqué : ${q.id}`);
      this.seenIds.add(q.id);

      if (q.category !== category) {
        errors.push(`${q.id} : catégorie "${q.category}" attendue "${category}"`);
      }
      if (q.choices.length !== QUIZ_CONFIG.choicesPerQuestion) {
        errors.push(
          `${q.id} : ${q.choices.length} choix, ${QUIZ_CONFIG.choicesPerQuestion} attendus`,
        );
      }
      if (
        !Number.isInteger(q.correctIndex) ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.choices.length
      ) {
        errors.push(`${q.id} : correctIndex hors bornes (${q.correctIndex})`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Questions "${category}" invalides :\n- ${errors.join('\n- ')}`,
      );
    }

    this.byCategory.set(category, questions);
    this.logger.log(`${questions.length} questions chargées (${category})`);
  }

  /** Nombre de questions disponibles dans une catégorie. */
  count(category: Category): number {
    return this.byCategory.get(category)?.length ?? 0;
  }

  /**
   * Tire les questions d'une session, mélangées et sans les bonnes réponses.
   * Le tirage est déterministe pour un `sessionId` donné : rejouer `/quiz/start`
   * renvoie exactement la même série (pas de re-tirage possible côté joueur).
   */
  drawForSession(category: Category, sessionId: string): ServedQuestion[] {
    const pool = this.byCategory.get(category) ?? [];
    const wanted = QUIZ_CONFIG.questionsPerSession;

    if (pool.length < wanted) {
      this.logger.warn(
        `Seulement ${pool.length} questions en "${category}" pour ${wanted} demandées.`,
      );
    }

    return seededShuffle(pool, `${sessionId}:draw`)
      .slice(0, wanted)
      .map((q, index) => ({
        id: q.id,
        category: q.category,
        prompt: q.prompt,
        choices: this.shuffledChoices(q, sessionId),
        index,
      }));
  }

  /** Retrouve une question par son id (toutes catégories confondues). */
  findById(questionId: string): Question | undefined {
    for (const pool of this.byCategory.values()) {
      const found = pool.find((q) => q.id === questionId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Vérifie une réponse. `chosenIndex` est un index dans les propositions
   * **mélangées** telles qu'affichées au joueur ; on recalcule le même ordre
   * à partir du seed pour le comparer à la bonne réponse.
   */
  isCorrect(
    questionId: string,
    sessionId: string,
    chosenIndex: number | null,
  ): boolean {
    if (chosenIndex === null) return false;

    const question = this.findById(questionId);
    if (!question) return false;

    const shuffled = this.shuffledChoices(question, sessionId);
    return shuffled[chosenIndex] === question.choices[question.correctIndex];
  }

  /**
   * Ordre des propositions présenté au joueur. Déterministe pour un couple
   * (session, question) — indispensable pour valider la réponse ensuite.
   */
  private shuffledChoices(question: Question, sessionId: string): string[] {
    return seededShuffle(question.choices, `${sessionId}:${question.id}`);
  }
}
