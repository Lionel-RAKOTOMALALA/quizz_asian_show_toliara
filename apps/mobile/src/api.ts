import type { Category, LeaderboardEntry } from '@quizz/shared';
import Constants from 'expo-constants';

/** Port de l'API sur le réseau local de la salle. */
const API_PORT = 3333;

/**
 * Adresse de l'API.
 *
 * Sur un téléphone, `localhost` désigne le téléphone lui-même : il faut l'IP
 * du PC. Plutôt que d'imposer une variable d'environnement, on déduit cette IP
 * de l'hôte du serveur Expo (`hostUri` vaut par exemple `192.168.7.9:8081`),
 * puisque le téléphone vient précisément de s'y connecter pour charger l'app.
 *
 * `EXPO_PUBLIC_API_URL` reste prioritaire pour forcer une autre adresse.
 */
function resolveApiBase(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)
      ?.debuggerHost;

  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  // Build autonome sans serveur Expo : dernier recours.
  return `http://localhost:${API_PORT}`;
}

export const API_BASE = resolveApiBase();

export interface ServedQuestion {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  index: number;
}

export interface SessionResponse {
  sessionId: string;
  ticket: string;
  playerName: string | null;
  category: Category;
  secondsGlobal: number;
  total: number;
}

export interface QuizStartResponse extends SessionResponse {
  questions: ServedQuestion[];
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
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Serveur injoignable. Vérifiez que vous êtes connecté au Wi-Fi de la salle.',
      0,
    );
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    // Nest renvoie `message` en string ou en tableau selon la validation.
    const raw = (data as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new ApiError(message ?? 'Une erreur est survenue.', res.status);
  }

  return data as T;
}

export const api = {
  createSession(input: {
    ticket: string;
    playerName?: string;
    category: Category;
  }): Promise<SessionResponse> {
    return request<SessionResponse>('/session', {
      method: 'POST',
      body: input,
    });
  },

  startQuiz(sessionId: string): Promise<QuizStartResponse> {
    return request<QuizStartResponse>(
      `/quiz/start?sessionId=${encodeURIComponent(sessionId)}`,
    );
  },

  answer(input: {
    sessionId: string;
    questionId: string;
    chosenIndex: number | null;
    answerMs: number;
  }): Promise<AnswerResponse> {
    return request<AnswerResponse>('/quiz/answer', {
      method: 'POST',
      body: input,
    });
  },

  leaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    return request<LeaderboardEntry[]>(
      `/leaderboard${limit ? `?limit=${limit}` : ''}`,
    );
  },
};
