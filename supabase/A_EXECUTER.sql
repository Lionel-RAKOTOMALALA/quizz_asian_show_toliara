-- ===========================================================================
-- À exécuter dans le SQL Editor du dashboard Supabase :
--   https://supabase.com/dashboard/project/xtqcbpagxuemohsjxwke/sql/new
--
-- Copier TOUT ce fichier, coller, cliquer Run.
-- Les 300 questions ne sont jamais touchées.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Classement en direct
--
-- Une ligne de `result` est désormais créée dès l'inscription (score 0), puis
-- mise à jour à chaque réponse. Il faut donc distinguer un score en cours
-- d'un score final — sans quoi un participant à 0/20 qui vient de s'inscrire
-- serait affiché comme ayant échoué.
-- ---------------------------------------------------------------------------

alter table public.result
  -- Nombre de questions déjà répondues (0..20).
  add column if not exists answered smallint not null default 0,
  -- Épreuve terminée : false tant que le participant joue.
  add column if not exists finished boolean not null default false;

-- Les épreuves terminées passent devant : à score égal, un 5/20 final vaut
-- mieux qu'un 5/20 obtenu après seulement 5 questions.
create index if not exists result_live_ranking_idx
  on public.result (finished desc, score desc, total_ms asc, created_at asc);

-- Les lignes déjà en base proviennent d'épreuves terminées (ancien
-- fonctionnement : la ligne n'était créée qu'à la 20e réponse).
update public.result
   set finished = true, answered = 20
 where answered = 0;


-- ---------------------------------------------------------------------------
-- 2. Purge des participants
--
-- ⚠️ Efface TOUTES les parties jouées, y compris les vrais participants
--    (Lio, Mireilla…). Le `on delete cascade` nettoie `attempt` et `result`.
--
--    👉 Si tu veux CONSERVER les scores actuels, supprime la ligne ci-dessous
--       avant d'exécuter. Le reste du script fonctionne sans elle.
-- ---------------------------------------------------------------------------

delete from public.session;


-- ---------------------------------------------------------------------------
-- Vérification : doit afficher 300 questions, puis 0 / 0 après la purge.
-- ---------------------------------------------------------------------------

select
  (select count(*) from public.question) as questions,
  (select count(*) from public.session)  as sessions,
  (select count(*) from public.result)   as resultats;
