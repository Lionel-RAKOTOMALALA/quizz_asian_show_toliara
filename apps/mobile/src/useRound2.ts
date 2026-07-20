import { useCallback, useEffect, useState } from 'react';
import { SUPABASE_KEY, SUPABASE_URL } from './config';
import { supabase } from './supabase';

export type Round2Phase = 'silhouette' | 'revealed';

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
  phase: 'silhouette',
  buzzedTicket: null,
};

/**
 * État du 2e tour, synchronisé en temps réel.
 *
 * Le verrouillage doit apparaître instantanément : dès qu'un finaliste prend
 * le buzz, les autres téléphones doivent le refléter avant qu'ils n'appuient.
 */
export function useRound2(ticket: string) {
  const [state, setState] = useState<Round2State>(INITIAL);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('round2_state')
      .select('image_index, phase, buzzed_ticket')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data) {
      const row = data as Row;
      setState({
        imageIndex: row.image_index,
        phase: row.phase,
        buzzedTicket: row.buzzed_ticket,
      });
      setConnected(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel('round2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round2_state' },
        (payload) => {
          const row = payload.new as Row;
          setState({
            imageIndex: row.image_index,
            phase: row.phase,
            buzzedTicket: row.buzzed_ticket,
          });
        },
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  /**
   * Appuie sur le buzzer. L'arbitrage est fait par le serveur : la réponse dit
   * si ce téléphone a gagné la course.
   */
  const buzz = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/round2-buzz`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticket }),
      });

      const data = (await res.json().catch(() => null)) as {
        won?: boolean;
        buzzedTicket?: string | null;
        phase?: Round2Phase;
      } | null;

      // On applique immédiatement la réponse sans attendre la notification
      // temps réel : le retour visuel doit être instantané.
      if (data?.buzzedTicket !== undefined) {
        setState((s) => ({
          ...s,
          buzzedTicket: data.buzzedTicket ?? null,
          phase: data.phase ?? s.phase,
        }));
      }

      return data?.won === true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [ticket]);

  const mine = state.buzzedTicket === ticket;
  const locked =
    state.phase === 'revealed' ||
    (state.buzzedTicket !== null && !mine);

  return { state, connected, busy, buzz, mine, locked, refresh };
}
