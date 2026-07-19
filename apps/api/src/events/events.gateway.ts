import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SOCKET_EVENTS } from '@quizz/shared';
import type { Round2Phase } from '@quizz/shared';
import { Server, Socket } from 'socket.io';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

/**
 * Diffuse le classement en temps réel vers l'écran de projection, et relaie
 * les commandes du diaporama du 2e tour entre les clients connectés (ce qui
 * permet de piloter la projection depuis un autre appareil).
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  private server!: Server;

  /** Dernier état connu du diaporama, renvoyé aux nouveaux arrivants. */
  private round2 = { index: 0, phase: 'silhouette' as Round2Phase };

  constructor(private readonly leaderboard: LeaderboardService) {}

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Écran connecté : ${client.id}`);
    // Un client qui arrive doit voir l'état courant sans attendre le prochain
    // événement : on lui pousse immédiatement le classement et le diaporama.
    client.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, await this.snapshot());
    client.emit(SOCKET_EVENTS.ROUND2_IMAGE, this.round2State());
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Écran déconnecté : ${client.id}`);
  }

  /** Diffuse le classement à tous les écrans. Appelé à chaque fin d'épreuve. */
  async broadcastLeaderboard(): Promise<void> {
    if (!this.server) return;
    this.server.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, await this.snapshot());
  }

  /** Signale qu'un participant vient de terminer (pour une animation à l'écran). */
  broadcastPlayerFinished(ticket: string, score: number): void {
    this.server?.emit(SOCKET_EVENTS.PLAYER_FINISHED, { ticket, score });
  }

  /** Commande du diaporama émise par un client : on la relaie à tous. */
  @SubscribeMessage(SOCKET_EVENTS.ROUND2_IMAGE)
  onRound2Image(
    @MessageBody() body: { index: number; phase: Round2Phase },
    @ConnectedSocket() client: Socket,
  ): void {
    this.round2 = { index: body.index, phase: body.phase };
    // `broadcast` exclut l'émetteur, qui a déjà appliqué le changement.
    client.broadcast.emit(SOCKET_EVENTS.ROUND2_IMAGE, this.round2State());
  }

  @SubscribeMessage(SOCKET_EVENTS.ROUND2_SCORE)
  onRound2Score(
    @MessageBody() body: { ticket: string; points: number },
    @ConnectedSocket() client: Socket,
  ): void {
    client.broadcast.emit(SOCKET_EVENTS.ROUND2_SCORE, body);
  }

  private round2State() {
    return { ...this.round2, total: 5 };
  }

  private async snapshot() {
    const [entries, stats] = await Promise.all([
      this.leaderboard.get(),
      this.leaderboard.stats(),
    ]);
    return { entries, stats };
  }
}
