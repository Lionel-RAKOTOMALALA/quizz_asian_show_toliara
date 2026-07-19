import { Injectable } from '@nestjs/common';
import { PERFECT_SCORE, QUIZ_CONFIG } from '@quizz/shared';
import type { Category, LeaderboardEntry, LeaderboardStats } from '@quizz/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Classement **général** : toutes catégories confondues, comme sur l'écran
   * de projection. À score égal, le joueur le plus rapide passe devant —
   * sinon la qualification entre ex æquo serait arbitraire.
   */
  async get(limit?: number): Promise<LeaderboardEntry[]> {
    const results = await this.prisma.result.findMany({
      orderBy: [{ score: 'desc' }, { totalMs: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return results.map((r, i) => ({
      rank: i + 1,
      ticket: r.ticket,
      playerName: r.playerName,
      category: r.category as Category,
      score: r.score,
      total: PERFECT_SCORE,
      qualified: isQualified(r.score, i),
    }));
  }

  async stats(): Promise<LeaderboardStats> {
    const [participants, finished, best] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.result.count(),
      this.prisma.result.aggregate({ _max: { score: true } }),
    ]);

    return {
      participants,
      finished,
      bestScore: best._max.score ?? 0,
      total: PERFECT_SCORE,
    };
  }

  /** Les finalistes du 2e tour, dans l'ordre du classement. */
  async finalists(): Promise<LeaderboardEntry[]> {
    const all = await this.get();
    return all.filter((e) => e.qualified);
  }
}

/**
 * Règle affichée aux participants : « 20/20 ou les 6 meilleurs scores ».
 * Un sans-faute qualifie donc même en dehors du top 6.
 */
export function isQualified(score: number, rankIndex: number): boolean {
  if (QUIZ_CONFIG.perfectScoreQualifies && score >= PERFECT_SCORE) return true;
  return rankIndex < QUIZ_CONFIG.qualifiedCount;
}
