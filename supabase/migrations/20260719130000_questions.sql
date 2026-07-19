-- Les questions passent du JSON embarqué dans les Edge Functions à une table,
-- pour être administrables (CRUD) sans redéploiement.
--
-- ⚠️ SÉCURITÉ : cette table contient `correct_index`.
--   - rôle `anon` (clé publique du mobile et de l'écran) : AUCUN accès.
--   - rôle `authenticated` (l'organisateur connecté) : CRUD complet.
--   - Edge Functions (`service_role`) : accès total, contourne la RLS.

create table public.question (
  -- Identifiant lisible, préfixé par catégorie : `kpop-1`, `anime-42`.
  id            text primary key,
  category      category not null,
  prompt        text not null,
  -- Exactement 4 propositions, dans l'ordre d'origine du fichier source.
  choices       text[] not null,
  -- Index (0-based) de la bonne réponse dans `choices`. SECRET.
  correct_index smallint not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint question_four_choices
    check (array_length(choices, 1) = 4),
  constraint question_correct_index_range
    check (correct_index between 0 and 3),
  constraint question_prompt_not_blank
    check (length(btrim(prompt)) > 0)
);

-- Le tirage d'une session ne lit qu'une catégorie à la fois, trié par id.
create index question_category_idx on public.question (category, id);

-- Horodate automatiquement les modifications faites depuis la page admin.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger question_touch_updated_at
  before update on public.question
  for each row
  execute function public.touch_updated_at();

alter table public.question enable row level security;

-- ---------------------------------------------------------------------------
-- Aucune politique pour `anon` : la clé publique embarquée dans le mobile et
-- l'écran ne peut NI lire NI écrire. C'est ce qui empêche un participant de
-- récupérer les bonnes réponses via l'API REST.
-- ---------------------------------------------------------------------------

-- L'organisateur connecté administre les questions depuis la page admin.
create policy "admin lit les questions"
  on public.question for select to authenticated using (true);

create policy "admin cree des questions"
  on public.question for insert to authenticated with check (true);

create policy "admin modifie les questions"
  on public.question for update to authenticated using (true) with check (true);

create policy "admin supprime des questions"
  on public.question for delete to authenticated using (true);

-- ⚠️ IMPORTANT : ces politiques ouvrent le CRUD à TOUT compte authentifié.
-- Il faut donc désactiver les inscriptions publiques, sinon n'importe qui
-- pourrait créer un compte et réécrire les réponses :
--   Dashboard → Authentication → Sign In / Providers → Email
--   → désactiver « Allow new users to sign up »
-- Puis créer le compte organisateur à la main dans Authentication → Users.
