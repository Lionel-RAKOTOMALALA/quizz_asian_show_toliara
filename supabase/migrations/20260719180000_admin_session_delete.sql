-- L'organisateur doit pouvoir supprimer une partie : pour effacer un ticket
-- déjà utilisé, pour retirer un participant de test, ou pour remettre le
-- concours à zéro avant l'événement.
--
-- Sans cette politique, la RLS filtrait silencieusement le `delete` (zéro
-- ligne supprimée, aucune erreur), et la suppression du ticket échouait
-- ensuite sur la contrainte `session_ticket_fkey`.

-- La lecture permet à l'interface d'admin d'afficher les parties en cours.
create policy "admin lit les sessions"
  on public.session for select to authenticated using (true);

create policy "admin supprime des sessions"
  on public.session for delete to authenticated using (true);

-- Note : `attempt` et `result` n'ont pas besoin de politique de suppression.
-- Leur effacement passe par le `on delete cascade` de la clé étrangère, qui
-- est exécuté par le moteur Postgres et n'est pas soumis à la RLS.
