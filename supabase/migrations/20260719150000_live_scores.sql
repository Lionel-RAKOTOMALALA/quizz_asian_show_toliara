-- Classement en direct : jusqu'ici une ligne de `result` n'était créée qu'à la
-- toute dernière réponse, donc le classement ne bougeait qu'en fin d'épreuve.
-- On enregistre désormais la progression à chaque réponse.

alter table public.result
  -- Nombre de questions déjà répondues (0..20).
  add column if not exists answered smallint not null default 0,
  -- Épreuve terminée : distingue un score final d'un score en cours.
  add column if not exists finished boolean not null default false;

-- Les participants encore en cours ont un score partiel : on les classe après
-- ceux qui ont terminé à score égal, sinon un joueur à 5/20 après 5 questions
-- passerait devant un joueur ayant fini à 5/20.
create index if not exists result_live_ranking_idx
  on public.result (finished desc, score desc, total_ms asc, created_at asc);

-- Les lignes existantes proviennent d'épreuves déjà terminées.
update public.result set finished = true, answered = 20 where answered = 0;
