/** Catégories de quiz disponibles. */
export type Category = 'kpop' | 'anime';

export const CATEGORIES: readonly Category[] = ['kpop', 'anime'] as const;

/** Libellé affiché pour chaque catégorie. */
export const CATEGORY_LABELS: Record<Category, string> = {
  kpop: 'K-pop',
  anime: 'Anime',
};

/**
 * Question telle que stockée côté serveur (avec la bonne réponse).
 * NE JAMAIS envoyer cette forme au mobile.
 */
export interface Question {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  /** Index (0-based) de la bonne réponse dans `choices`. Secret serveur. */
  correctIndex: number;
}

/**
 * Question telle qu'envoyée au client mobile — SANS la bonne réponse.
 * C'est le seul DTO de question qui doit sortir de l'API vers le joueur.
 */
export type PublicQuestion = Omit<Question, 'correctIndex'>;

/** Retire la bonne réponse d'une question avant envoi au client. */
export function toPublicQuestion(q: Question): PublicQuestion {
  const { correctIndex: _omit, ...rest } = q;
  return rest;
}

/** Une tentative de réponse d'un joueur à une question. */
export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  /** Index choisi par le joueur (null si temps écoulé). */
  chosenIndex: number | null;
  isCorrect: boolean;
  /** Temps de réponse en millisecondes. */
  answerMs: number;
  createdAt: string;
}

/**
 * Entrée du classement général. Toutes catégories confondues : la maquette
 * affiche un seul classement où K-pop et Anime se côtoient, distingués par
 * une pastille de couleur.
 */
export interface LeaderboardEntry {
  rank: number;
  /** Numéro du ticket physique (4 chiffres). */
  ticket: string;
  /** Pseudonyme choisi, ou `null` si le joueur n'en a pas saisi. */
  playerName: string | null;
  category: Category;
  /** Nombre de bonnes réponses (le score affiché est `score`/`total`). */
  score: number;
  total: number;
  qualified: boolean;
  /** Questions déjà répondues — le score est partiel tant que < `total`. */
  answered: number;
  /** `false` tant que l'épreuve est en cours. */
  finished: boolean;
}

/** Statistiques d'ensemble affichées sur l'écran de projection. */
export interface LeaderboardStats {
  participants: number;
  bestScore: number;
  total: number;
  finished: number;
}
