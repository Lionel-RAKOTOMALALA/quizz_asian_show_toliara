"use client";

import { PERFECT_SCORE, QUIZ_CONFIG } from "@quizz/shared";
import type { Category, LeaderboardEntry, LeaderboardStats } from "@quizz/shared";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface LiveData {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
  finalists: LeaderboardEntry[];
  connected: boolean;
  /** `true` tant que Realtime n'est pas établi et qu'on retombe sur le polling. */
  degraded: boolean;
  /** Canal de diffusion pour synchroniser le diaporama entre écrans. */
  channel: RealtimeChannel | null;
}

const EMPTY_STATS: LeaderboardStats = {
  participants: 0,
  bestScore: 0,
  total: PERFECT_SCORE,
  finished: 0,
};

/** Filet de sécurité si Realtime ne s'établit pas (proxy, pare-feu…). */
const FALLBACK_POLL_MS = 5000;

/** Cadence de fond quand Realtime fonctionne : sert au compteur d'inscrits. */
const HEARTBEAT_MS = 8000;

interface ResultRow {
  ticket: string;
  player_name: string | null;
  category: Category;
  score: number;
  qualified: boolean;
  /** Absentes tant que la migration « classement en direct » n'est pas passée. */
  answered?: number;
  finished?: boolean;
}

function toEntries(rows: ResultRow[]): LeaderboardEntry[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    ticket: r.ticket,
    playerName: r.player_name,
    category: r.category,
    score: r.score,
    total: PERFECT_SCORE,
    qualified: r.qualified,
    // Sans les colonnes, toute ligne présente correspond à une épreuve
    // terminée : c'était le comportement avant le classement en direct.
    answered: r.answered ?? PERFECT_SCORE,
    finished: r.finished ?? true,
  }));
}

const FULL_COLUMNS =
  "ticket, player_name, category, score, qualified, answered, finished";
const LEGACY_COLUMNS = "ticket, player_name, category, score, qualified";

/** Code PostgREST d'une colonne inconnue. */
const UNDEFINED_COLUMN = "42703";

/**
 * Lit le classement en tolérant une base pas encore migrée.
 *
 * Un écran de projection ne doit jamais se vider à cause d'un décalage de
 * schéma : on retente sans les colonnes récentes plutôt que d'échouer.
 */
async function fetchResults(): Promise<ResultRow[] | null> {
  const full = await supabase
    .from("result")
    .select(FULL_COLUMNS)
    // Les épreuves terminées passent devant : à score égal, un 5/20 final
    // vaut mieux qu'un 5/20 obtenu après seulement 5 questions.
    .order("finished", { ascending: false })
    .order("score", { ascending: false })
    .order("total_ms", { ascending: true })
    .order("created_at", { ascending: true });

  if (!full.error) return (full.data ?? []) as ResultRow[];
  if (full.error.code !== UNDEFINED_COLUMN) return null;

  const legacy = await supabase
    .from("result")
    .select(LEGACY_COLUMNS)
    .order("score", { ascending: false })
    .order("total_ms", { ascending: true })
    .order("created_at", { ascending: true });

  return legacy.error ? null : ((legacy.data ?? []) as ResultRow[]);
}

export function useLiveData(): LiveData {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>(EMPTY_STATS);
  const [connected, setConnected] = useState(false);
  const [degraded, setDegraded] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Recharge le classement complet.
   *
   * Realtime notifie ligne par ligne, mais le rang et la qualification
   * dépendent de **tout** le classement : une seule fin de partie peut
   * réordonner et disqualifier quelqu'un d'autre. On relit donc l'ensemble
   * plutôt que de patcher la ligne reçue.
   */
  const refresh = useCallback(async () => {
    const rows = await fetchResults();

    if (rows === null) {
      setConnected(false);
      return;
    }

    const list = toEntries(rows);
    const finished = list.filter((e) => e.finished);

    setEntries(list);
    setStats({
      // Une ligne est créée dès l'inscription : le nombre de lignes est donc
      // le nombre de participants, sans avoir à interroger `session` (fermée
      // à la clé publique).
      participants: list.length,
      finished: finished.length,
      // Le meilleur score ne compte que les épreuves terminées : un 3/20 en
      // cours de partie n'est pas un résultat.
      bestScore: finished.length > 0 ? finished[0].score : 0,
      total: PERFECT_SCORE,
    });
    setConnected(true);
  }, []);

  // Abonnement Realtime aux changements de la table `result`.
  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel("quiz-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "result" },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          setDegraded(false);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setDegraded(true);
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [refresh]);

  /**
   * Rafraîchissement périodique, maintenu **même quand Realtime fonctionne**.
   *
   * Realtime n'écoute que `result` : une inscription ne crée de ligne qu'à la
   * fin de l'épreuve. Le compteur de participants ne bougerait donc jamais en
   * direct. S'abonner à `session` est impossible — Realtime respecte la RLS,
   * qui ferme cette table à la clé publique.
   *
   * On ralentit simplement la cadence quand Realtime est actif.
   */
  useEffect(() => {
    const delay = degraded ? FALLBACK_POLL_MS : HEARTBEAT_MS;
    const id = setInterval(() => void refresh(), delay);
    return () => clearInterval(id);
  }, [degraded, refresh]);

  return {
    entries,
    stats,
    finalists: entries
      .filter((e) => e.qualified)
      .slice(0, QUIZ_CONFIG.qualifiedCount * 2),
    connected,
    degraded,
    channel: channelRef.current,
  };
}
