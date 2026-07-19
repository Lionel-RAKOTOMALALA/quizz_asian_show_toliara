-- Reprise de session : un ticket peut être ressaisi sur le même appareil (ou
-- un autre après abandon) et reprend là où le participant s'était arrêté.
-- En revanche, deux appareils ne doivent jamais jouer la même session en même
-- temps — sinon un ticket partagé donnerait deux chances.

alter table public.session
  -- Identifiant de l'appareil qui détient la session actuellement.
  add column if not exists device_id    text,
  -- Dernier signe de vie de cet appareil : c'est ce qui fait office de verrou.
  add column if not exists last_seen_at timestamptz,
  -- Départ réel du chrono : posé au premier `quiz-start`, pas à l'inscription.
  -- Un participant qui hésite avant de commencer ne doit pas perdre de temps.
  add column if not exists started_at   timestamptz;

-- Les sessions existantes sont considérées comme démarrées à l'inscription.
update public.session
   set started_at = created_at
 where started_at is null;

create index if not exists session_ticket_lookup_idx
  on public.session (ticket);
