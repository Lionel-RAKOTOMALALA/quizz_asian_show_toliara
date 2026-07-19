import { Body, Controller, Post } from '@nestjs/common';
import { QUIZ_CONFIG } from '@quizz/shared';
import type { Category } from '@quizz/shared';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /** Ouvre une partie pour un ticket dans une catégorie donnée. */
  @Post()
  async create(@Body() dto: CreateSessionDto): Promise<{
    sessionId: string;
    ticket: string;
    playerName: string | null;
    category: Category;
    secondsGlobal: number;
    total: number;
  }> {
    const session = await this.sessions.create(dto);
    return {
      sessionId: session.id,
      ticket: session.ticket,
      playerName: session.playerName,
      category: session.category as Category,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      total: QUIZ_CONFIG.questionsPerSession,
    };
  }
}
