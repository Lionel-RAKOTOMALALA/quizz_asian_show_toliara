-- Quiz K-pop & Anime — schéma initial (édition Toliara).
--
-- Modèle de sécurité : les participants n'écrivent JAMAIS directement en base.
-- Toute la logique de jeu passe par des Edge Functions qui détiennent la clé
-- `service_role` (laquelle contourne la RLS). Les politiques ci-dessous
-- n'ouvrent donc en lecture que ce qui doit être public : le classement.

create type category as enum ('kpop', 'anime');

-- ---------------------------------------------------------------------------
-- Sessions : une partie, rattachée à un ticket physique.
-- ---------------------------------------------------------------------------
create table public.session (
  id           uuid primary key default gen_random_uuid(),
  -- Numéro du ticket physique (4 chiffres) remis par l'organisation.
  ticket       text not null,
  -- Pseudonyme facultatif : le ticket seul suffit à identifier le joueur.
  player_name  text,
  category     category not null,
  created_at   timestamptz not null default now(),

  -- Un ticket ne joue qu'une fois : le choix de catégorie est définitif.
  constraint session_ticket_key unique (ticket),
  constraint session_ticket_format check (ticket ~ '^[0-9]{4}$')
);

create index session_category_idx on public.session (category);

-- ---------------------------------------------------------------------------
-- Tentatives : une réponse à une question. `question_id` référence le JSON
-- statique embarqué dans les Edge Functions, pas une table.
-- ---------------------------------------------------------------------------
create table public.attempt (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.session (id) on delete cascade,
  question_id  text not null,
  -- null = temps écoulé sans réponse.
  chosen_index smallint check (chosen_index between 0 and 3),
  is_correct   boolean not null default false,
  answer_ms    integer not null check (answer_ms >= 0),
  created_at   timestamptz not null default now(),

  -- Une seule réponse par question et par session : empêche de rejouer une
  -- question déjà répondue pour accumuler des points.
  constraint attempt_session_question_key unique (session_id, question_id)
);

create index attempt_session_idx on public.attempt (session_id);

-- ---------------------------------------------------------------------------
-- Résultats : classement général, toutes catégories confondues.
-- ---------------------------------------------------------------------------
create table public.result (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null unique references public.session (id) on delete cascade,
  ticket      text not null,
  player_name text,
  category    category not null,
  -- Nombre de bonnes réponses, affiché sous la forme `score`/20.
  score       integer not null default 0,
  total_ms    integer not null default 0,
  qualified   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Sert le tri du classement : score décroissant, puis le plus rapide devant.
create index result_ranking_idx on public.result (score desc, total_ms asc, created_at asc);

-- ---------------------------------------------------------------------------
-- Images du 2e tour : silhouette affichée d'abord, photo révélée ensuite.
-- ---------------------------------------------------------------------------
create table public.round2_image (
  id             uuid primary key default gen_random_uuid(),
  position       integer not null unique,
  category       category not null,
  silhouette_url text not null,
  photo_url      text not null,
  answer         text not null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.session      enable row level security;
alter table public.attempt      enable row level security;
alter table public.result       enable row level security;
alter table public.round2_image enable row level security;

-- `session` et `attempt` : aucune politique = aucun accès public.
-- Seules les Edge Functions (service_role) peuvent y lire et écrire.
-- C'est ce qui empêche un participant de lire les réponses des autres ou
-- d'insérer des tentatives à la main.

-- Le classement est public en lecture : c'est ce qu'affiche l'écran de
-- projection et l'écran de résultat du mobile.
create policy "classement lisible par tous"
  on public.result
  for select
  to anon, authenticated
  using (true);

-- Les images du 2e tour sont affichées par l'écran de projection.
-- La colonne `answer` reste visible : l'écran est côté animateur.
create policy "images du 2e tour lisibles par tous"
  on public.round2_image
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime : l'écran de projection s'abonne aux changements du classement.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.result;
