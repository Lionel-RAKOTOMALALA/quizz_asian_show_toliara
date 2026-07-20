/**
 * Projet Supabase.
 *
 * Ces deux valeurs sont **publiques par conception** : elles tournent dans
 * l'app installée sur les téléphones des participants, donc extractibles. Ce
 * qui protège les données, c'est la RLS — avec cette clé on ne peut lire ni
 * les questions, ni les tickets, ni les sessions.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://xtqcbpagxuemohsjxwke.supabase.co';

export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_53NgxcJ69s5_BZ6gK0L7jQ_d5phgC2A';
