import kpopQuestions from '../_shared/data/kpop.json' with { type: 'json' };
import animeQuestions from '../_shared/data/anime.json' with { type: 'json' };
import { fail, json, preflight, serviceClient } from '../_shared/http.ts';

interface SourceQuestion {
  id: string;
  category: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

/**
 * Fonction utilitaire à usage unique : charge les 300 questions du JSON vers
 * la table `question`. À supprimer une fois la table peuplée.
 *
 * Elle est idempotente (upsert sur l'id) : la relancer ne crée pas de doublon
 * et remet simplement les valeurs du fichier source.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return fail('Méthode non autorisée.', 405);

  const source = [
    ...(kpopQuestions as SourceQuestion[]),
    ...(animeQuestions as SourceQuestion[]),
  ];

  const rows = source.map((q) => ({
    id: q.id,
    category: q.category,
    prompt: q.prompt,
    choices: q.choices,
    correct_index: q.correctIndex,
  }));

  const supabase = serviceClient();

  // Par lots : 300 lignes d'un coup passent, mais on reste prudent sur la
  // taille de la requête.
  const CHUNK = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('question')
      .upsert(chunk, { onConflict: 'id' });

    if (error) return fail(`Lot ${i / CHUNK + 1} : ${error.message}`, 500);
    inserted += chunk.length;
  }

  const { count } = await supabase
    .from('question')
    .select('*', { count: 'exact', head: true });

  return json({ upserted: inserted, totalInTable: count });
});
