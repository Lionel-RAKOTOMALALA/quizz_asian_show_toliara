import { CATEGORIES, QUIZ_CONFIG, type Category } from '../_shared/quiz.ts';
import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

/**
 * Délai au-delà duquel un appareil est considéré comme parti.
 *
 * Court volontairement : l'épreuve ne dure qu'une minute, et un participant
 * dont l'application a planté doit pouvoir reprendre vite. Au-dessous de ce
 * délai, un second appareil est refusé — c'est ce qui empêche deux personnes
 * de jouer le même ticket en parallèle.
 */
const LOCK_SECONDS = 25;

/**
 * POST /session — ouvre une partie, ou **reprend** celle déjà associée au
 * ticket.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  let body: {
    ticket?: string;
    playerName?: string;
    category?: string;
    deviceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return fail('Corps de requête invalide.');
  }

  const ticket = (body.ticket ?? '').trim();
  if (!/^\d{4}$/.test(ticket)) {
    return fail('Le numéro de ticket doit comporter exactement 4 chiffres.');
  }

  const deviceId = (body.deviceId ?? '').trim();
  if (!deviceId) return fail('`deviceId` est requis.');

  const supabase = serviceClient();
  const now = new Date();

  // -------------------------------------------------------------------------
  // Le ticket doit avoir été émis par l'organisation.
  // -------------------------------------------------------------------------
  const { data: issued, error: ticketError } = await supabase
    .from('ticket')
    .select('code')
    .eq('code', ticket)
    .maybeSingle();

  if (ticketError) return fail(ticketError.message, 500);
  if (!issued) {
    return fail(
      `Le ticket n° ${ticket} n'existe pas. Vérifie le numéro imprimé sur ton ticket.`,
      404,
    );
  }

  // -------------------------------------------------------------------------
  // Une partie existe-t-elle déjà pour ce ticket ?
  // -------------------------------------------------------------------------
  const { data: existing, error: existingError } = await supabase
    .from('session')
    .select('id, ticket, player_name, category, device_id, last_seen_at, started_at')
    .eq('ticket', ticket)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);

  if (existing) {
    const { data: result } = await supabase
      .from('result')
      .select('score, answered, finished')
      .eq('session_id', existing.id)
      .maybeSingle();

    const finished = result?.finished ?? false;

    // Une épreuve terminée est consultable depuis n'importe quel appareil :
    // il n'y a plus rien à jouer, donc plus rien à verrouiller.
    if (!finished) {
      const heldByOther = existing.device_id && existing.device_id !== deviceId;
      const lastSeen = existing.last_seen_at
        ? new Date(existing.last_seen_at).getTime()
        : 0;
      const stillActive = now.getTime() - lastSeen < LOCK_SECONDS * 1000;

      if (heldByOther && stillActive) {
        return fail(
          `Le ticket n° ${ticket} est déjà en cours d'utilisation sur un autre appareil.`,
          409,
        );
      }

      // Reprise : cet appareil devient détenteur de la session.
      await supabase
        .from('session')
        .update({ device_id: deviceId, last_seen_at: now.toISOString() })
        .eq('id', existing.id);
    }

    return json({
      status: finished ? 'finished' : 'resumed',
      sessionId: existing.id,
      ticket: existing.ticket,
      playerName: existing.player_name,
      category: existing.category as Category,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      total: QUIZ_CONFIG.questionsPerSession,
      resumed: true,
      finished,
      answered: result?.answered ?? 0,
      score: result?.score ?? 0,
    });
  }

  // -------------------------------------------------------------------------
  // Première partie pour ce ticket.
  //
  // L'application interroge cette fonction dès la saisie du ticket, avant même
  // d'avoir demandé la catégorie : répondre `needs_category` lui indique
  // simplement quel écran afficher. Ce n'est pas une erreur.
  // -------------------------------------------------------------------------
  const category = body.category as Category;
  if (!CATEGORIES.includes(category)) {
    return json({
      status: 'needs_category',
      ticket,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      total: QUIZ_CONFIG.questionsPerSession,
    });
  }

  const rawName = (body.playerName ?? '').trim();
  if (rawName.length > 40) {
    return fail('Le pseudonyme doit faire au plus 40 caractères.');
  }
  const playerName = rawName.length > 0 ? rawName : null;

  const { data, error } = await supabase
    .from('session')
    .insert({
      ticket,
      player_name: playerName,
      category,
      device_id: deviceId,
      last_seen_at: now.toISOString(),
    })
    .select('id, ticket, player_name, category')
    .single();

  if (error) {
    // 23505 : deux appareils ont créé la session au même instant. Le perdant
    // rejoue la requête, qui passera cette fois par la branche « reprise ».
    if (error.code === '23505') {
      return fail(
        `Le ticket n° ${ticket} vient d'être ouvert sur un autre appareil. Réessaie.`,
        409,
      );
    }
    return fail(error.message, 500);
  }

  // Marque le ticket comme consommé (trace d'audit ; la réutilisation passe
  // désormais par la reprise de session, pas par un second `insert`).
  await supabase
    .from('ticket')
    .update({ used_at: now.toISOString(), session_id: data.id })
    .eq('code', ticket)
    .is('used_at', null);

  // Ligne de classement créée dès l'inscription : sans elle, le participant
  // n'apparaîtrait à l'écran de projection qu'à sa première réponse.
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

  if (resultError) {
    console.error('Création de la ligne de classement :', resultError.message);
  }

  return json(
    {
      status: 'created',
      sessionId: data.id,
      ticket: data.ticket,
      playerName: data.player_name,
      category: data.category as Category,
      secondsGlobal: QUIZ_CONFIG.secondsGlobal,
      total: QUIZ_CONFIG.questionsPerSession,
      resumed: false,
      finished: false,
      answered: 0,
      score: 0,
    },
    201,
  );
});
