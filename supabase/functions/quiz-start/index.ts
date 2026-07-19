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
 * Le mobile les télécharge toutes d'un coup pour que l'épreuve survive à une
 * coupure réseau. Rejouable : le tirage est déterministe.
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
    .select('id, ticket, player_name, category')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!session) return fail(`Session introuvable : ${sessionId}`, 404);

  const category = session.category as Category;

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
    questions: drawFromPool(pool, session.id),
  });
});
