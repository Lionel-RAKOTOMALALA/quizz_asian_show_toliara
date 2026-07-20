-- 2e tour : diaporama de silhouettes et buzzer.
--
-- L'état est une ligne unique partagée par l'écran de projection, l'interface
-- de l'animateur et tous les téléphones des finalistes. Passer par la base
-- plutôt que par de simples messages diffusés garantit l'arbitrage : un
-- `update ... where buzzed_ticket is null` est atomique, donc un seul
-- participant peut gagner le buzz, même à quelques millisecondes d'écart.

create table public.round2_state (
  -- Ligne unique : il n'y a qu'une épreuve à la fois.
  id            smallint primary key default 1,
  -- Image affichée (0..N-1).
  image_index   smallint not null default 0,
  -- 'silhouette' = à deviner, 'revealed' = photo montrée.
  phase         text not null default 'silhouette',
  -- Ticket du participant qui a le buzz. `null` = buzzers ouverts.
  buzzed_ticket text,
  buzzed_at     timestamptz,
  updated_at    timestamptz not null default now(),

  constraint round2_single_row check (id = 1),
  constraint round2_phase_valid check (phase in ('silhouette', 'revealed'))
);

insert into public.round2_state (id) values (1)
on conflict (id) do nothing;

-- Points du 2e tour, attribués par l'animateur.
alter table public.result
  add column if not exists round2_points smallint not null default 0;

create or replace function public.touch_round2_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger round2_state_touch
  before update on public.round2_state
  for each row
  execute function public.touch_round2_state();

alter table public.round2_state enable row level security;

-- Tout le monde doit voir l'état : l'écran de projection comme les téléphones
-- des finalistes. Il ne contient rien de confidentiel.
create policy "etat du 2e tour lisible par tous"
  on public.round2_state for select
  to anon, authenticated using (true);

-- Seul l'animateur connecté pilote le diaporama. Les participants, eux,
-- passent par l'Edge Function `round2-buzz` : elle seule peut poser un buzz,
-- ce qui empêche un participant de se déverrouiller ou de buzzer à la place
-- d'un autre.
create policy "admin pilote le 2e tour"
  on public.round2_state for update
  to authenticated using (true) with check (true);

-- L'animateur ajuste les points du 2e tour.
create policy "admin modifie les points du 2e tour"
  on public.result for update
  to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.round2_state;
