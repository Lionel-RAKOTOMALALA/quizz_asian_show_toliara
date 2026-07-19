import {
  QUIZ_CONFIG,
  drawFromPool,
  loadPool,
  type Category,
} from '../_shared/quiz.ts';
import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

/**
 * GET /quiz-start?sessionId=… — renvoie les 20 questions de la session,
 * propositions mélangées et **sans la bonne réponse**.
 *
 * Renvoie aussi ce qu'il faut pour reprendre une partie interrompue : les
 * questions déjà répondues et le temps restant.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return fail('Paramètre `sessionId` manquant.');

  const supabase = serviceClient();
  const { data: session, error } = await supabase
    .from('session')
    .select('id, ticket, player_name, category, started_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!session) return fail(`Session introuvable : ${sessionId}`, 404);

  const category = session.category as Category;
  const now = new Date();

  // Le chrono démarre au premier `quiz-start`, pas à l'inscription : un
  // participant qui lit les consignes ne doit pas perdre de temps.
  const startedAt = session.started_at
    ? new Date(session.started_at)
    : now;

  if (!session.started_at) {
    await supabase
      .from('session')
      .update({ started_at: now.toISOString() })
      .eq('id', session.id);
  }

  const elapsedSeconds = Math.floor(
    (now.getTime() - startedAt.getTime()) / 1000,
  );
  const secondsRemaining = Math.max(
    0,
    QUIZ_CONFIG.secondsGlobal - elapsedSeconds,
  );

  // Questions déjà traitées : le mobile reprendra à la première suivante.
  const { data: attempts } = await supabase
    .from('attempt')
    .select('question_id')
    .eq('session_id', session.id);

  const answeredIds = (attempts ?? []).map((a) => a.question_id as string);

  let pool;
  try {
    pool = await loadPool(supabase, category);
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  if (pool.length < QUIZ_CONFIG.questionsPerSession) {
    return fail(
      `Seulement ${pool.length} questions en « ${category} » pour ${QUIZ_CONFIG.questionsPerSession} demandées.`,
      503,
    );
  }

  return json({
    sessionId: session.id,
    ticket: session.ticket,
    playerName: session.player_name,
    category,
    total: QUIZ_CONFIG.questionsPerSession,
    secondsGlobal: QUIZ_CONFIG.secondsGlobal,
    /** Temps réellement restant, chrono déjà entamé si la partie reprend. */
    secondsRemaining,
    /** Identifiants déjà répondus, à sauter à la reprise. */
    answeredIds,
    questions: drawFromPool(pool, session.id),
  });
});
