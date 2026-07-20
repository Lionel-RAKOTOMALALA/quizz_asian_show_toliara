import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

/**
 * POST /round2-buzz — un finaliste appuie sur son buzzer.
 *
 * L'arbitrage se fait par un `update … where buzzed_ticket is null`, exécuté
 * par Postgres de façon atomique : sur deux appuis simultanés, un seul modifie
 * la ligne. Le second reçoit zéro ligne et sait qu'il a perdu.
 *
 * Cette fonction est le seul chemin d'écriture ouvert aux participants : la
 * RLS leur interdit de toucher directement à `round2_state`, sinon n'importe
 * qui pourrait se déverrouiller ou buzzer à la place d'un autre.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  let body: { ticket?: string };
  try {
    body = await req.json();
  } catch {
    return fail('Corps de requête invalide.');
  }

  const ticket = (body.ticket ?? '').trim();
  if (!/^\d{4}$/.test(ticket)) return fail('Ticket invalide.');

  const supabase = serviceClient();

  // Seuls les qualifiés du 1er tour participent au 2e.
  const { data: finalist, error: finalistError } = await supabase
    .from('result')
    .select('ticket, qualified')
    .eq('ticket', ticket)
    .maybeSingle();

  if (finalistError) return fail(finalistError.message, 500);
  if (!finalist?.qualified) {
    return fail("Ce ticket n'est pas qualifié pour le 2e tour.", 403);
  }

  const { data: won, error } = await supabase
    .from('round2_state')
    .update({ buzzed_ticket: ticket, buzzed_at: new Date().toISOString() })
    .eq('id', 1)
    // La condition qui fait tout : seul un buzzer libre peut être pris.
    .is('buzzed_ticket', null)
    // On refuse aussi les buzz une fois la photo révélée.
    .eq('phase', 'silhouette')
    .select('buzzed_ticket');

  if (error) return fail(error.message, 500);

  if ((won ?? []).length === 0) {
    // Perdu la course, ou photo déjà révélée : on renvoie l'état courant pour
    // que le téléphone affiche qui a la main.
    const { data: current } = await supabase
      .from('round2_state')
      .select('buzzed_ticket, phase')
      .eq('id', 1)
      .maybeSingle();

    return json({
      won: false,
      buzzedTicket: current?.buzzed_ticket ?? null,
      phase: current?.phase ?? 'silhouette',
    });
  }

  return json({ won: true, buzzedTicket: ticket, phase: 'silhouette' });
});
