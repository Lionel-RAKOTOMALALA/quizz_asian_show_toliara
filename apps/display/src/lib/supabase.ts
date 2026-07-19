"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * URL et clé publiable du projet.
 *
 * Ces deux valeurs sont **publiques par conception** : elles sont destinées à
 * tourner dans un navigateur et dans l'app mobile. Ce qui protège les données,
 * c'est la RLS — la clé publique ne peut lire ni les questions, ni les
 * sessions, ni les tentatives.
 *
 * Elles sont écrites en dur (avec surcharge possible par variable
 * d'environnement) parce que `NEXT_PUBLIC_*` est figé au build : un déploiement
 * sans ces variables produirait une app muette.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://xtqcbpagxuemohsjxwke.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_53NgxcJ69s5_BZ6gK0L7jQ_d5phgC2A";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Category = "kpop" | "anime";

export interface QuestionRow {
  id: string;
  category: Category;
  prompt: string;
  choices: string[];
  correct_index: number;
  updated_at?: string;
}
