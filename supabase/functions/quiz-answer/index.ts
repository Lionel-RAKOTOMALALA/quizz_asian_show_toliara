import {
  PERFECT_SCORE,
  QUIZ_CONFIG,
  drawFromPool,
  isCorrect,
  loadPool,
  loadQuestion,
  revealedIndex,
  type Category,
} from '../_shared/quiz.ts';
import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

/**
 * POST /quiz-answer — enregistre une réponse, met à jour le score, et
 * finalise la session à la dernière question.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  let body: {
    sessionId?: string;
    questionId?: string;
    chosenIndex?: number | null;
    answerMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return fail('Corps de requête invalide.');
  }

  const { sessionId, questionId } = body;
  if (!sessionId || !questionId) {
    return fail('`sessionId` et `questionId` sont requis.');
  }

  const chosenIndex = body.chosenIndex ?? null;
  if (
    chosenIndex !== null &&
    (!Number.isInteger(chosenIndex) ||
      chosenIndex < 0 ||
      chosenIndex >= QUIZ_CONFIG.choicesPerQuestion)
  ) {
    return fail('`chosenIndex` hors bornes.');
  }

  const answerMs = body.answerMs ?? 0;
  if (!Number.isInteger(answerMs) || answerMs < 0) {
    return fail('`answerMs` doit être un entier positif.');
  }

  const supabase = serviceClient();

  const { data: session, error: sessionError } = await supabase
    .from('session')
    .select('id, ticket, player_name, category')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) return fail(sessionError.message, 500);
  if (!session) return fail(`Session introuvable : ${sessionId}`, 404);

  // Signe de vie : c'est ce qui maintient le verrou et empêche un second
  // appareil de reprendre la session tant que celui-ci répond.
  await supabase
    .from('session')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.id);

  const category = session.category as Category;

  // La question doit appartenir au tirage de CETTE session : sinon un joueur
  // pourrait répondre à des questions qu'il n'a jamais reçues.
  let question;
  try {
    const pool = await loadPool(supabase, category);
    const drawn = drawFromPool(pool, session.id);
    if (!drawn.some((q) => q.id === questionId)) {
      return fail(
        `La question ${questionId} ne fait pas partie de cette session.`,
      );
    }
    question = await loadQuestion(supabase, questionId);
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  if (!question) return fail(`Question introuvable : ${questionId}`, 404);

  const correct = isCorrect(question, session.id, chosenIndex);

  const { error: insertError } = await supabase.from('attempt').insert({
    session_id: session.id,
    question_id: questionId,
    chosen_index: chosenIndex,
    is_correct: correct,
    answer_ms: answerMs,
  });

  if (insertError) {
    // 23505 = contrainte unique (session_id, question_id).
    if (insertError.code === '23505') {
      return fail(
        `Question ${questionId} déjà répondue pour cette session.`,
        409,
      );
    }
    return fail(insertError.message, 500);
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from('attempt')
    .select('is_correct, answer_ms')
    .eq('session_id', session.id);

  if (attemptsError) return fail(attemptsError.message, 500);

  // Le score affiché est un nombre de bonnes réponses sur 20.
  const score = (attempts ?? []).filter((a) => a.is_correct).length;
  const answered = (attempts ?? []).length;
  const finished = answered >= QUIZ_CONFIG.questionsPerSession;
  const totalMs = (attempts ?? []).reduce((sum, a) => sum + a.answer_ms, 0);

  // Enregistré à CHAQUE réponse : c'est ce qui alimente le classement en
  // direct sur l'écran de projection, via Realtime.
  const { error: upsertError } = await supabase.from('result').upsert(
    {
      session_id: session.id,
      ticket: session.ticket,
      player_name: session.player_name,
      category,
      score,
      answered,
      finished,
      total_ms: totalMs,
    },
    { onConflict: 'session_id' },
  );

  if (upsertError) return fail(upsertError.message, 500);

  // Le recalcul des qualifiés touche TOUTES les lignes, donc génère un
  // événement Realtime par participant. On ne le fait qu'en fin d'épreuve,
  // sinon le canal serait saturé (N participants × 20 réponses).
  if (finished) {
    await recomputeQualified(supabase);
  }

  return json(
    {
      isCorrect: correct,
      // La bonne réponse n'est révélée qu'ici, après la réponse du joueur.
      correctIndex: revealedIndex(question, session.id),
      answered,
      total: QUIZ_CONFIG.questionsPerSession,
      finished,
      score,
    },
    201,
  );
});

/**
 * Recalcule les qualifiés sur tout le classement : « 20/20 ou les 6 meilleurs
 * scores ». Rejoué à chaque fin de partie, car un nouveau score peut faire
 * sortir quelqu'un du top.
 */
async function recomputeQualified(
  supabase: ReturnType<typeof serviceClient>,
): Promise<void> {
  // Seules les épreuves terminées peuvent qualifier : un score partiel n'est
  // pas comparable à un score final.
  const { data: ranked } = await supabase
    .from('result')
    .select('id, score')
    .eq('finished', true)
    .order('score', { ascending: false })
    .order('total_ms', { ascending: true })
    .order('created_at', { ascending: true });

  if (!ranked) return;

  const qualifiedIds: string[] = [];
  const unqualifiedIds: string[] = [];

  ranked.forEach((r, i) => {
    const qualified =
      (QUIZ_CONFIG.perfectScoreQualifies && r.score >= PERFECT_SCORE) ||
      i < QUIZ_CONFIG.qualifiedCount;
    (qualified ? qualifiedIds : unqualifiedIds).push(r.id);
  });

  if (qualifiedIds.length > 0) {
    await supabase
      .from('result')
      .update({ qualified: true })
      .in('id', qualifiedIds);
  }
  if (unqualifiedIds.length > 0) {
    await supabase
      .from('result')
      .update({ qualified: false })
      .in('id', unqualifiedIds);
  }
}
