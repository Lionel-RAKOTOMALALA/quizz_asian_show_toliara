import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { LeaderboardEntry, LeaderboardStats } from '@quizz/shared';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  /** Classement général, toutes catégories confondues. */
  @Get()
  get(@Query('limit') limit?: string): Promise<LeaderboardEntry[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    if (limit !== undefined && (Number.isNaN(parsed!) || parsed! < 1)) {
      throw new BadRequestException('`limit` doit être un entier positif.');
    }
    return this.leaderboard.get(parsed);
  }

  /** Compteurs affichés en haut de l'écran de projection. */
  @Get('stats')
  stats(): Promise<LeaderboardStats> {
    return this.leaderboard.stats();
  }

  /** Les qualifié·e·s pour le 2e tour. */
  @Get('finalists')
  finalists(): Promise<LeaderboardEntry[]> {
    return this.leaderboard.finalists();
  }
}
