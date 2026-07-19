/**
 * Configuration métier du quiz — source de vérité partagée par les 3 apps.
 * Les valeurs suivent la maquette validée (édition Toliara).
 */
export const QUIZ_CONFIG = {
  /** Nombre de questions tirées par session. */
  questionsPerSession: 20,
  /** Nombre de choix par question (QCM). */
  choicesPerQuestion: 4,

  /**
   * Chrono **global** : 5 minutes pour l'ensemble des 20 questions
   * (et non un chrono par question).
   */
  secondsGlobal: 300,

  /** Nombre de qualifiés d'office pour le 2e tour (les N meilleurs scores). */
  qualifiedCount: 6,
  /**
   * Un sans-faute qualifie systématiquement, même hors du top N.
   * Règle affichée au joueur : « 20/20 ou les 6 meilleurs scores ».
   */
  perfectScoreQualifies: true,

  /** Nombre d'images du 2e tour (reconnaissance : silhouette puis photo). */
  round2ImageCount: 5,
} as const;

export type QuizConfig = typeof QUIZ_CONFIG;

/** Un score parfait vaut le nombre total de questions. */
export const PERFECT_SCORE = QUIZ_CONFIG.questionsPerSession;
