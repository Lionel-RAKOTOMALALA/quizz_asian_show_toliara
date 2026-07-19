"use client";

import { PERFECT_SCORE, QUIZ_CONFIG, SOCKET_EVENTS } from "@quizz/shared";
import type { LeaderboardEntry, LeaderboardStats } from "@quizz/shared";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { apiBase, fetchSnapshot } from "./api";

export interface LiveData {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
  finalists: LeaderboardEntry[];
  connected: boolean;
  /** `true` tant que le socket n'est pas établi et qu'on retombe sur REST. */
  degraded: boolean;
  socket: Socket | null;
}

const EMPTY_STATS: LeaderboardStats = {
  participants: 0,
  bestScore: 0,
  total: PERFECT_SCORE,
  finished: 0,
};

/** Filet de sécurité si le WebSocket ne s'établit pas (proxy, pare-feu…). */
const FALLBACK_POLL_MS = 5000;

/**
 * Le serveur ne diffuse que le classement complet ; les finalistes s'en
 * déduisent, ce qui évite un aller-retour et garantit qu'ils restent
 * cohérents avec le classement affiché.
 */
function finalistsOf(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.filter((e) => e.qualified);
}

export function useLiveData(): LiveData {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>(EMPTY_STATS);
  const [connected, setConnected] = useState(false);
  const [degraded, setDegraded] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(apiBase(), {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setDegraded(false);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
      setDegraded(true);
    });

    socket.on(
      SOCKET_EVENTS.LEADERBOARD_UPDATE,
      (payload: { entries: LeaderboardEntry[]; stats: LeaderboardStats }) => {
        setEntries(payload.entries);
        setStats(payload.stats);
        setConnected(true);
      },
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Repli REST : premier chargement, puis relais tant que le socket est absent.
  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const snap = await fetchSnapshot();
        if (cancelled) return;
        setEntries(snap.entries);
        setStats(snap.stats);
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    void pull();

    if (!degraded) {
      return () => {
        cancelled = true;
      };
    }

    const id = setInterval(() => void pull(), FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [degraded]);

  return {
    entries,
    stats,
    finalists: finalistsOf(entries),
    connected,
    degraded,
    socket: socketRef.current,
  };
}
