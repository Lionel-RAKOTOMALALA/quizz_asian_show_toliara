import type { Category, LeaderboardEntry } from '@quizz/shared';
import { PERFECT_SCORE, QUIZ_CONFIG } from '@quizz/shared';

/**
 * Projet Supabase. Ces deux valeurs sont **publiques par conception** : la
 * protection vient de la RLS, pas du secret de la clé. Avec elle, on ne peut
 * lire ni les questions, ni les sessions, ni les tentatives des autres.
 *
 * Contrairement à l'ancienne API locale, l'adresse ne dépend plus du réseau :
 * inutile de renseigner l'IP du PC.
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://xtqcbpagxuemohsjxwke.supabase.co';

const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_53NgxcJ69s5_BZ6gK0L7jQ_d5phgC2A';

const FUNCTIONS = `${SUPABASE_URL}/functions/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export interface ServedQuestion {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  index: number;
}

/**
 * État renvoyé par la vérification du ticket.
 *
 * - `needs_category` : ticket valide et jamais joué → écran de catégorie
 * - `created`        : partie créée à l'instant
 * - `resumed`        : partie en cours → on reprend là où le joueur s'est arrêté
 * - `finished`       : épreuve terminée → écran de résultat
 */
export type SessionStatus =
  | 'needs_category'
  | 'created'
  | 'resumed'
  | 'finished';

export interface SessionResponse {
  status: SessionStatus;
  /** Absent tant que la catégorie n'a pas été choisie. */
  sessionId: string;
  ticket: string;
  playerName: string | null;
  category: Category;
  secondsGlobal: number;
  total: number;
  /** `true` si une partie existait déjà pour ce ticket. */
  resumed: boolean;
  /** `true` si l'épreuve est déjà terminée : on va droit aux résultats. */
  finished: boolean;
  answered: number;
  score: number;
}

export interface QuizStartResponse extends SessionResponse {
  questions: ServedQuestion[];
  /** Temps restant, chrono déjà entamé si la partie reprend. */
  secondsRemaining: number;
  /** Questions déjà répondues, à sauter à la reprise. */
  answeredIds: string[];
}

export interface AnswerResponse {
  isCorrect: boolean;
  correctIndex: number;
  answered: number;
  total: number;
  finished: boolean;
  score: number;
}

/** Erreur portant le message renvoyé par l'API, affichable tel quel. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  url: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: HEADERS,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Serveur injoignable. Vérifiez votre connexion Internet.',
      0,
    );
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message;
    throw new ApiError(message ?? 'Une erreur est survenue.', res.status);
  }

  return data as T;
}

/** Ligne brute de la table `result`, lisible publiquement. */
interface ResultRow {
  ticket: string;
  player_name: string | null;
  category: Category;
  score: number;
  qualified: boolean;
  answered: number;
  finished: boolean;
}

export const api = {
  /**
   * Ouvre une partie, ou reprend celle déjà associée au ticket. `category`
   * est ignorée à la reprise : le choix initial reste définitif.
   */
  createSession(input: {
    ticket: string;
    playerName?: string;
    /** Omise à la vérification : le serveur répond alors `needs_category`. */
    category?: Category;
    deviceId: string;
  }): Promise<SessionResponse> {
    return request<SessionResponse>(`${FUNCTIONS}/session`, {
      method: 'POST',
      body: input,
    });
  },

  startQuiz(sessionId: string): Promise<QuizStartResponse> {
    return request<QuizStartResponse>(
      `${FUNCTIONS}/quiz-start?sessionId=${encodeURIComponent(sessionId)}`,
    );
  },

  answer(input: {
    sessionId: string;
    questionId: string;
    chosenIndex: number | null;
    answerMs: number;
  }): Promise<AnswerResponse> {
    return request<AnswerResponse>(`${FUNCTIONS}/quiz-answer`, {
      method: 'POST',
      body: input,
    });
  },

  /**
   * Classement général, lu directement dans la table `result` (ouverte en
   * lecture par la RLS).
   *
   * On ne garde que les épreuves **terminées** : l'écran de résultat du joueur
   * présente un classement définitif, où afficher des scores partiels
   * (« 3/20 » après trois questions) induirait en erreur. L'écran de
   * projection, lui, montre la progression en direct.
   */
  async leaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    const query = [
      'select=ticket,player_name,category,score,qualified,answered,finished',
      'finished=eq.true',
      'order=score.desc,total_ms.asc,created_at.asc',
      limit ? `limit=${limit}` : '',
    ]
      .filter(Boolean)
      .join('&');

    const rows = await request<ResultRow[]>(`${REST}/result?${query}`);

    return rows.map((r, i) => ({
      rank: i + 1,
      ticket: r.ticket,
      playerName: r.player_name,
      category: r.category,
      score: r.score,
      total: PERFECT_SCORE,
      // `qualified` vient du serveur, qui applique « 20/20 ou top N ».
      qualified: r.qualified,
      answered: r.answered,
      finished: r.finished,
    }));
  },
};

export { QUIZ_CONFIG };
