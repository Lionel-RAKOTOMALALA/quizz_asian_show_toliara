import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto): Promise<Session> {
    const playerName = dto.playerName?.trim();

    try {
      return await this.prisma.session.create({
        data: {
          ticket: dto.ticket,
          // Un pseudo vide après trim équivaut à pas de pseudo.
          playerName: playerName ? playerName : null,
          category: dto.category,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Le ticket n° ${dto.ticket} a déjà été utilisé. Le choix de catégorie est définitif.`,
        );
      }
      throw error;
    }
  }

  /** Récupère une session ou lève une 404 explicite. */
  async getOrFail(sessionId: string): Promise<Session> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session introuvable : ${sessionId}`);
    }
    return session;
  }
}
