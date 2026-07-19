/**
 * Logique de jeu partagée par les Edge Functions.
 *
 * Les constantes doublent celles de `packages/shared` : Deno ne peut pas
 * importer depuis le workspace pnpm. Toute modification ici doit être
 * répercutée dans `packages/shared/src/config.ts`, et inversement.
 *
 * Les questions viennent désormais de la table `question`, lue avec la clé
 * `service_role` — jamais exposée au client.
 */

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type Category = 'kpop' | 'anime';

export const CATEGORIES: readonly Category[] = ['kpop', 'anime'];

export const QUIZ_CONFIG = {
  questionsPerSession: 20,
  choicesPerQuestion: 4,
  /** Chrono global pour l'ensemble des questions, en secondes. */
  secondsGlobal: 60,
  qualifiedCount: 6,
  /** Un sans-faute qualifie même hors du top N. */
  perfectScoreQualifies: true,
  round2ImageCount: 5,
} as const;

export const PERFECT_SCORE = QUIZ_CONFIG.questionsPerSession;

export interface Question {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  /** Index de la bonne réponse. Ne doit JAMAIS sortir vers le client. */
  correctIndex: number;
}

/** Question envoyée au joueur : propositions mélangées, réponse retirée. */
export interface ServedQuestion {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  index: number;
}

interface QuestionRow {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  correct_index: number;
}

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    category: row.category,
    prompt: row.prompt,
    choices: row.choices,
    correctIndex: row.correct_index,
  };
}

// ---------------------------------------------------------------------------
// Accès aux questions
// ---------------------------------------------------------------------------

/**
 * Charge le pool d'une catégorie, **trié par id**.
 *
 * Ce tri est indispensable : le tirage mélange ce tableau à partir d'un seed.
 * Sans ordre garanti, Postgres pourrait renvoyer les lignes différemment d'un
 * appel à l'autre et `quiz-answer` ne retrouverait plus l'ordre servi par
 * `quiz-start`.
 */
export async function loadPool(
  supabase: SupabaseClient,
  category: Category,
): Promise<Question[]> {
  const { data, error } = await supabase
    .from('question')
    .select('id, category, prompt, choices, correct_index')
    .eq('category', category)
    .order('id', { ascending: true });

  if (error) throw new Error(`Lecture des questions : ${error.message}`);
  return (data as QuestionRow[]).map(toQuestion);
}

export async function loadQuestion(
  supabase: SupabaseClient,
  questionId: string,
): Promise<Question | null> {
  const { data, error } = await supabase
    .from('question')
    .select('id, category, prompt, choices, correct_index')
    .eq('id', questionId)
    .maybeSingle();

  if (error) throw new Error(`Lecture de la question : ${error.message}`);
  return data ? toQuestion(data as QuestionRow) : null;
}

// ---------------------------------------------------------------------------
// Mélange déterministe
// ---------------------------------------------------------------------------

/** Hash une chaîne en entier 32 bits (xmur3). */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seededRandom(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Copie mélangée, reproductible pour un seed donné. C'est ce qui permet à
 * `quiz-answer` de retrouver l'ordre exact envoyé par `quiz-start` sans rien
 * stocker en base.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Ordre des propositions présenté au joueur pour une session donnée. */
function shuffledChoices(question: Question, sessionId: string): string[] {
  return seededShuffle(question.choices, `${sessionId}:${question.id}`);
}

// ---------------------------------------------------------------------------
// Tirage et correction
// ---------------------------------------------------------------------------

/**
 * Tire les questions d'une session. Déterministe : rejouer `quiz-start`
 * renvoie la même série, donc pas de re-tirage possible côté joueur.
 */
export function drawFromPool(
  pool: Question[],
  sessionId: string,
): ServedQuestion[] {
  return seededShuffle(pool, `${sessionId}:draw`)
    .slice(0, QUIZ_CONFIG.questionsPerSession)
    .map((q, index) => ({
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      choices: shuffledChoices(q, sessionId),
      index,
    }));
}

/**
 * Vérifie une réponse. `chosenIndex` est un index dans les propositions
 * **mélangées** telles qu'affichées ; on recalcule le même ordre pour le
 * comparer à la bonne réponse.
 */
export function isCorrect(
  question: Question,
  sessionId: string,
  chosenIndex: number | null,
): boolean {
  if (chosenIndex === null) return false;
  const shuffled = shuffledChoices(question, sessionId);
  return shuffled[chosenIndex] === question.choices[question.correctIndex];
}

/** Position de la bonne réponse dans l'ordre vu par le joueur. */
export function revealedIndex(question: Question, sessionId: string): number {
  const shuffled = shuffledChoices(question, sessionId);
  return shuffled.indexOf(question.choices[question.correctIndex]);
}

/** Règle affichée aux participants : « 20/20 ou les 6 meilleurs scores ». */
export function isQualified(score: number, rankIndex: number): boolean {
  if (QUIZ_CONFIG.perfectScoreQualifies && score >= PERFECT_SCORE) return true;
  return rankIndex < QUIZ_CONFIG.qualifiedCount;
}
