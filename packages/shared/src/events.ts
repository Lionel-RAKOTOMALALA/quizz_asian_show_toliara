import type { LeaderboardEntry, LeaderboardStats } from './types';

/**
 * Noms des événements de diffusion **Supabase Realtime**, échangés entre les
 * écrans de projection (canal `quiz-live`).
 *
 * Le classement, lui, ne passe pas par ces événements : il est poussé par
 * Realtime sur les changements de la table `result`.
 */
export const SOCKET_EVENTS = {
  /** Serveur -> écran : classement général mis à jour. */
  LEADERBOARD_UPDATE: 'leaderboard:update',
  /** Serveur -> écran : un participant a terminé son épreuve. */
  PLAYER_FINISHED: 'player:finished',

  /** Serveur -> écran : passage au 2e tour (diaporama). */
  ROUND2_START: 'round2:start',
  /** Serveur -> écran : image courante du diaporama. */
  ROUND2_IMAGE: 'round2:image',
  /** Serveur -> écran : révélation de la photo derrière la silhouette. */
  ROUND2_REVEAL: 'round2:reveal',
  /** Serveur -> écran : point attribué à un finaliste. */
  ROUND2_SCORE: 'round2:score',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Phase d'affichage d'une image du 2e tour. */
export type Round2Phase = 'silhouette' | 'revealed';

/** Payloads typés par événement. */
export interface SocketEventPayloads {
  [SOCKET_EVENTS.LEADERBOARD_UPDATE]: {
    entries: LeaderboardEntry[];
    stats: LeaderboardStats;
  };
  [SOCKET_EVENTS.PLAYER_FINISHED]: { ticket: string; score: number };
  [SOCKET_EVENTS.ROUND2_START]: { finalists: LeaderboardEntry[] };
  [SOCKET_EVENTS.ROUND2_IMAGE]: {
    index: number;
    total: number;
    phase: Round2Phase;
  };
  [SOCKET_EVENTS.ROUND2_REVEAL]: { index: number };
  [SOCKET_EVENTS.ROUND2_SCORE]: { ticket: string; points: number };
}
