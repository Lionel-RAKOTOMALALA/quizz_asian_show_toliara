import { CATEGORIES, QUIZ_CONFIG, type Category } from '../_shared/quiz.ts';
import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

/**
 * POST /session — ouvre une partie pour un ticket dans une catégorie.
 * Le ticket est unique en base : rejouer ou changer de catégorie est refusé.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  let body: { ticket?: string; playerName?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return fail('Corps de requête invalide.');
  }

  const ticket = (body.ticket ?? '').trim();
  if (!/^\d{4}$/.test(ticket)) {
    return fail('Le numéro de ticket doit comporter exactement 4 chiffres.');
  }

  const category = body.category as Category;
  if (!CATEGORIES.includes(category)) {
    return fail(`La catégorie doit être : ${CATEGORIES.join(' ou ')}.`);
  }

  const rawName = (body.playerName ?? '').trim();
  if (rawName.length > 40) {
    return fail('Le pseudonyme doit faire au plus 40 caractères.');
  }
  // Un pseudo vide après trim équivaut à pas de pseudo.
  const playerName = rawName.length > 0 ? rawName : null;

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('session')
    .insert({ ticket, player_name: playerName, category })
    .select('id, ticket, player_name, category')
    .single();

  if (error) {
    // 23505 = violation de contrainte unique sur `ticket`.
    if (error.code === '23505') {
      return fail(
        `Le ticket n° ${ticket} a déjà été utilisé. Le choix de catégorie est définitif.`,
        409,
      );
    }
    return fail(error.message, 500);
  }

  // Ligne de classement créée dès l'inscription, avec un score à zéro : sans
  // elle, un participant n'apparaîtrait à l'écran de projection qu'à sa
  // première réponse. `finished: false` la distingue d'un score final.
  const { error: resultError } = await supabase.from('result').insert({
    session_id: data.id,
    ticket: data.ticket,
    player_name: data.player_name,
    category: data.category,
    score: 0,
    answered: 0,
    finished: false,
    total_ms: 0,
  });

  // Une session sans ligne de classement reste jouable : le premier envoi de
  // réponse la créera. On ne bloque donc pas l'inscription pour autant.
  if (resultError) {
    console.error('Création de la ligne de classement :', resultError.message);
  }

  return json(
    {
      sessionId: data.id,
      ticket: data.ticket,
      playerName: data.player_name,
      category: data.category,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      total: QUIZ_CONFIG.questionsPerSession,
    },
    201,
  );
});
