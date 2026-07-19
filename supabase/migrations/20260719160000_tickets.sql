-- Billetterie : les tickets sont désormais pré-générés par l'organisation.
--
-- Avant cette migration, n'importe quel nombre à 4 chiffres permettait de
-- jouer. Un participant sans ticket physique pouvait donc entrer `1234` et
-- fausser le concours.

create table public.ticket (
  -- Code imprimé sur le ticket physique : exactement 4 chiffres.
  code       text primary key,
  -- Libellé libre : nom du porteur, lot d'impression, point de vente…
  label      text,
  -- Date de consommation. `null` = ticket encore vierge.
  used_at    timestamptz,
  -- Session qui a consommé le ticket. On garde la trace pour l'audit.
  session_id uuid unique references public.session (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint ticket_code_format check (code ~ '^[0-9]{4}$')
);

-- L'écran d'administration liste d'abord les tickets non utilisés.
create index ticket_used_idx on public.ticket (used_at nulls first, code);

-- ---------------------------------------------------------------------------
-- Les parties déjà jouées doivent rester valides : on inscrit leurs tickets
-- comme déjà consommés avant de poser la contrainte d'intégrité.
-- ---------------------------------------------------------------------------
insert into public.ticket (code, label, used_at, session_id)
select s.ticket, 'Importé (partie antérieure)', s.created_at, s.id
  from public.session s
 where not exists (select 1 from public.ticket t where t.code = s.ticket)
on conflict (code) do nothing;

-- Une session ne peut plus exister sans ticket émis.
alter table public.session
  add constraint session_ticket_fkey
  foreign key (ticket) references public.ticket (code)
  on delete restrict;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.ticket enable row level security;

-- ⚠️ AUCUNE politique pour `anon` : la clé publique est embarquée dans l'app
-- mobile. Si les participants pouvaient lire cette table, ils y trouveraient
-- les codes non encore utilisés et joueraient sans ticket physique.
-- La validation se fait exclusivement dans l'Edge Function `session`.

create policy "admin lit les tickets"
  on public.ticket for select to authenticated using (true);

create policy "admin cree des tickets"
  on public.ticket for insert to authenticated with check (true);

create policy "admin modifie les tickets"
  on public.ticket for update to authenticated using (true) with check (true);

create policy "admin supprime des tickets"
  on public.ticket for delete to authenticated using (true);
