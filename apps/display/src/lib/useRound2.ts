"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Round2Phase = "silhouette" | "revealed";

export interface Round2State {
  imageIndex: number;
  phase: Round2Phase;
  /** Ticket qui détient le buzz. `null` = buzzers ouverts. */
  buzzedTicket: string | null;
}

interface Row {
  image_index: number;
  phase: Round2Phase;
  buzzed_ticket: string | null;
}

const INITIAL: Round2State = {
  imageIndex: 0,
  phase: "silhouette",
  buzzedTicket: null,
};

function toState(row: Row): Round2State {
  return {
    imageIndex: row.image_index,
    phase: row.phase,
    buzzedTicket: row.buzzed_ticket,
  };
}

/**
 * État partagé du 2e tour, synchronisé en temps réel entre l'écran de
 * projection, l'animateur et les téléphones des finalistes.
 */
export function useRound2() {
  const [state, setState] = useState<Round2State>(INITIAL);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("round2_state")
      .select("image_index, phase, buzzed_ticket")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) setState(toState(data as Row));
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel("round2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round2_state" },
        (payload) => setState(toState(payload.new as Row)),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  /** Écriture réservée à l'animateur connecté (RLS `authenticated`). */
  const patch = useCallback(
    async (values: Partial<Row>) => {
      const { error } = await supabase
        .from("round2_state")
        .update(values)
        .eq("id", 1);

      if (!error) await refresh();
      return error?.message ?? null;
    },
    [refresh],
  );

  return {
    state,
    connected,
    /** Change d'image et rouvre les buzzers. */
    goTo: (index: number) =>
      patch({
        image_index: index,
        phase: "silhouette",
        buzzed_ticket: null,
      }),
    /** Révèle la photo : les buzzers se ferment. */
    reveal: () => patch({ phase: "revealed", buzzed_ticket: null }),
    /** Repasse en silhouette sans changer d'image. */
    hide: () => patch({ phase: "silhouette", buzzed_ticket: null }),
    /** Mauvaise réponse : on rouvre les buzzers sur la même silhouette. */
    rejectAnswer: () => patch({ buzzed_ticket: null }),
    refresh,
  };
}
