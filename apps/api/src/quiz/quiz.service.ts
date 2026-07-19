import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PERFECT_SCORE, QUIZ_CONFIG } from '@quizz/shared';
import type { Category } from '@quizz/shared';
import { Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import {
  QuestionsService,
  ServedQuestion,
} from '../questions/questions.service';
import { SessionService } from '../session/session.service';
import { AnswerDto } from './dto/answer.dto';

export interface QuizStartResponse {
  sessionId: string;
  ticket: string;
  playerName: string | null;
  category: Category;
  total: number;
  /** Chrono global, en secondes, pour l'ensemble des questions. */
  secondsGlobal: number;
  questions: ServedQuestion[];
}

export interface AnswerResponse {
  isCorrect: boolean;
  /** Index de la bonne réponse, révélé **après** que le joueur a répondu. */
  correctIndex: number;
  answered: number;
  total: number;
  finished: boolean;
  /** Nombre de bonnes réponses, à afficher sous la forme `score`/`total`. */
  score: number;
}

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questions: QuestionsService,
    private readonly sessions: SessionService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Tire les questions de la session. Le mobile les télécharge toutes d'un coup
   * pour que l'épreuve survive à une coupure Wi-Fi. Rejouable : le tirage est
   * déterministe.
   */
  async start(sessionId: string): Promise<QuizStartResponse> {
    const session = await this.sessions.getOrFail(sessionId);
    const category = session.category as Category;

    return {
      sessionId: session.id,
      ticket: session.ticket,
      playerName: session.playerName,
      category,
      total: QUIZ_CONFIG.questionsPerSession,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      questions: this.questions.drawForSession(category, session.id),
    };
  }

  async answer(dto: AnswerDto): Promise<AnswerResponse> {
    const session = await this.sessions.getOrFail(dto.sessionId);
    const category = session.category as Category;

    // La question doit appartenir au tirage de CETTE session : sinon un joueur
    // pourrait répondre à des questions qu'il n'a jamais reçues.
    const drawn = this.questions.drawForSession(category, session.id);
    const served = drawn.find((q) => q.id === dto.questionId);
    if (!served) {
      throw new BadRequestException(
        `La question ${dto.questionId} ne fait pas partie de cette session.`,
      );
    }

    const question = this.questions.findById(dto.questionId)!;
    const isCorrect = this.questions.isCorrect(
      dto.questionId,
      session.id,
      dto.chosenIndex,
    );

    try {
      await this.prisma.attempt.create({
        data: {
          sessionId: session.id,
          questionId: dto.questionId,
          chosenIndex: dto.chosenIndex,
          isCorrect,
          answerMs: dto.answerMs,
        },
      });
    } catch (error) {
      // Violation de la contrainte unique (sessionId, questionId).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Question ${dto.questionId} déjà répondue pour cette session.`,
        );
      }
      throw error;
    }

    const attempts = await this.prisma.attempt.findMany({
      where: { sessionId: session.id },
      select: { isCorrect: true, answerMs: true },
    });

    // Le score affiché est un nombre de bonnes réponses sur 20.
    const score = attempts.filter((a) => a.isCorrect).length;
    const finished = attempts.length >= QUIZ_CONFIG.questionsPerSession;

    if (finished) {
      await this.finalize(session, {
        score,
        totalMs: attempts.reduce((sum, a) => sum + a.answerMs, 0),
      });
    }

    return {
      isCorrect,
      // La bonne réponse est révélée dans l'ordre mélangé vu par le joueur.
      correctIndex: served.choices.indexOf(
        question.choices[question.correctIndex],
      ),
      answered: attempts.length,
      total: QUIZ_CONFIG.questionsPerSession,
      finished,
      score,
    };
  }

  /** Enregistre le résultat final puis recalcule les qualifiés. */
  private async finalize(
    session: { id: string; ticket: string; playerName: string | null },
    totals: { score: number; totalMs: number },
  ): Promise<void> {
    const category = (
      await this.prisma.session.findUniqueOrThrow({
        where: { id: session.id },
        select: { category: true },
      })
    ).category;

    await this.prisma.result.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        ticket: session.ticket,
        playerName: session.playerName,
        category,
        ...totals,
      },
      update: totals,
    });

    await this.recomputeQualified();

    // Le classement vient de changer : on le pousse aux écrans de projection.
    this.events.broadcastPlayerFinished(session.ticket, totals.score);
    await this.events.broadcastLeaderboard();
  }

  /**
   * Recalcule les qualifiés sur l'ensemble du classement (toutes catégories) :
   * « 20/20 ou les 6 meilleurs scores ». Rejoué à chaque fin de partie, car un
   * nouveau score peut faire sortir quelqu'un du top.
   */
  private async recomputeQualified(): Promise<void> {
    const ranked = await this.prisma.result.findMany({
      orderBy: [{ score: 'desc' }, { totalMs: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, score: true },
    });

    const qualifiedIds = ranked
      .filter(
        (r, i) =>
          (QUIZ_CONFIG.perfectScoreQualifies && r.score >= PERFECT_SCORE) ||
          i < QUIZ_CONFIG.qualifiedCount,
      )
      .map((r) => r.id);

    await this.prisma.$transaction([
      this.prisma.result.updateMany({
        where: { id: { notIn: qualifiedIds } },
        data: { qualified: false },
      }),
      this.prisma.result.updateMany({
        where: { id: { in: qualifiedIds } },
        data: { qualified: true },
      }),
    ]);
  }
}
