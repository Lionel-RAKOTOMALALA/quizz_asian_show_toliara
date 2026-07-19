import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Le mobile et l'écran appellent ces fonctions depuis d'autres origines
 * (Expo, navigateur) : sans ces en-têtes, le navigateur bloque la requête.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ message }, status);
}

/** Réponse au pré-vol CORS, à renvoyer avant tout traitement. */
export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS'
    ? new Response('ok', { headers: CORS_HEADERS })
    : null;
}

/**
 * Client Supabase avec la clé `service_role`, qui contourne la RLS.
 *
 * C'est le cœur du modèle de sécurité : les tables `session` et `attempt`
 * sont fermées à la clé publique, et seules ces fonctions peuvent y écrire.
 * La variable est injectée automatiquement par Supabase à l'exécution.
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de l\'environnement.',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
