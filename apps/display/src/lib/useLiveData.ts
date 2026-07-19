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

interface ResultRow {
  ticket: string;
  player_name: string | null;
  category: Category;
  score: number;
  qualified: boolean;
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
  }));
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
    const [{ data: rows, error }, { count: participants }] = await Promise.all([
      supabase
        .from("result")
        .select("ticket, player_name, category, score, qualified")
        .order("score", { ascending: false })
        .order("total_ms", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("session").select("*", { count: "exact", head: true }),
    ]);

    if (error) {
      setConnected(false);
      return;
    }

    const list = toEntries((rows ?? []) as ResultRow[]);
    setEntries(list);
    setStats({
      // `session` est fermée à la clé publique : le compte revient `null`.
      // On retombe alors sur le nombre d'épreuves terminées.
      participants: participants ?? list.length,
      finished: list.length,
      bestScore: list.length > 0 ? list[0].score : 0,
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

  // Repli : tant que Realtime n'est pas actif, on interroge périodiquement.
  useEffect(() => {
    if (!degraded) return;
    const id = setInterval(() => void refresh(), FALLBACK_POLL_MS);
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
