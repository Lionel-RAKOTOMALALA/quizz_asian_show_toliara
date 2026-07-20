"use client";

import { QUIZ_CONFIG } from "@quizz/shared";
import type { LeaderboardEntry } from "@quizz/shared";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRound2 } from "@/lib/useRound2";

interface Props {
  finalists: LeaderboardEntry[];
  /** L'arbitrage n'est proposé qu'à l'animateur connecté. */
  isAdmin: boolean;
}

const TOTAL = QUIZ_CONFIG.round2ImageCount;

export function SlideshowView({ finalists, isAdmin }: Props) {
  const { state, connected, goTo, reveal, hide, rejectAnswer } = useRound2();
  const [points, setPoints] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  /** Les points viennent de la base : ils survivent à un rechargement. */
  const loadPoints = useCallback(async () => {
    const { data } = await supabase
      .from("result")
      .select("ticket, round2_points")
      .eq("qualified", true);

    if (!data) return;
    setPoints(
      Object.fromEntries(
        (data as { ticket: string; round2_points: number }[]).map((r) => [
          r.ticket,
          r.round2_points,
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  const buzzed = finalists.find((f) => f.ticket === state.buzzedTicket);
  const revealed = state.phase === "revealed";

  const prev = useCallback(
    () => void goTo(Math.max(0, state.imageIndex - 1)),
    [state.imageIndex, goTo],
  );
  const next = useCallback(
    () => void goTo(Math.min(TOTAL - 1, state.imageIndex + 1)),
    [state.imageIndex, goTo],
  );
  const toggle = useCallback(
    () => void (revealed ? hide() : reveal()),
    [revealed, hide, reveal],
  );

  // Raccourcis clavier, réservés à l'animateur.
  useEffect(() => {
    if (!isAdmin) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, prev, next, toggle]);

  /**
   * Bonne réponse : le point est attribué et **tous les buzzers rouvrent**,
   * y compris celui du participant qui vient de répondre. La photo n'est pas
   * révélée automatiquement — c'est une décision distincte de l'animateur.
   */
  async function award(ticket: string) {
    setError(null);

    const value = (points[ticket] ?? 0) + 1;
    setPoints((p) => ({ ...p, [ticket]: value }));

    const { data: updated, error } = await supabase
      .from("result")
      .update({ round2_points: value })
      .eq("ticket", ticket)
      .select("ticket");

    if (error) {
      setError(error.message);
      void loadPoints();
      return;
    }

    // Une RLS manquante renverrait « succès » avec zéro ligne : sans ce
    // contrôle, le point paraîtrait attribué alors qu'il ne l'est pas.
    if ((updated ?? []).length === 0) {
      setError(
        "Point non enregistré : il manque la politique `admin modifie les points du 2e tour` en base.",
      );
      void loadPoints();
      return;
    }

    await rejectAnswer();
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 px-8 pb-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {/* Diaporama */}
      <section className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="eyebrow">
            Reconnaissance d&apos;images · Image {state.imageIndex + 1} / {TOTAL}
          </h2>
          <p className="eyebrow !text-brand-amber">
            {revealed ? "Photo révélée" : "Phase silhouette"}
          </p>
        </div>

        <div className="mt-3 flex flex-1 items-center justify-center rounded-3xl border border-panel-border bg-black/25 p-6">
          <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-24 text-center">
            <p className="text-[12px] leading-relaxed text-muted-dim">
              {revealed
                ? `PHOTO — image n°${state.imageIndex + 1}`
                : `SILHOUETTE — image n°${state.imageIndex + 1}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-dim/60">
              Aucune image chargée — table round2_image vide
            </p>
          </div>
        </div>

        {/* Bandeau du buzz : l'information la plus importante de l'épreuve,
            visible depuis le fond de la salle. */}
        <div
          className={`mt-4 rounded-2xl border px-6 py-5 text-center transition ${
            buzzed
              ? "border-brand-green/60 bg-brand-green/15"
              : "border-row-border bg-row"
          }`}
        >
          {buzzed ? (
            <>
              <p className="eyebrow !text-brand-green">
                A buzzé en premier · ticket {buzzed.ticket}
              </p>
              <p className="mt-1 text-[34px] font-extrabold leading-tight text-brand-green">
                {buzzed.playerName ?? `Ticket ${buzzed.ticket}`}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Les autres buzzers sont bloqués — réponse à l&apos;oral
              </p>
            </>
          ) : (
            <p className="text-[13px] text-muted-dim">
              {revealed
                ? "Photo révélée — buzzers fermés"
                : "Buzzers ouverts — en attente d'un finaliste"}
            </p>
          )}
        </div>

        {isAdmin && (
          <>
            {buzzed && !revealed && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void award(buzzed.ticket)}
                  className="rounded-full bg-brand-green px-10 py-3.5 text-[15px] font-extrabold text-white transition hover:opacity-90"
                >
                  ✓ Vrai
                </button>
                <button
                  type="button"
                  onClick={() => void rejectAnswer()}
                  className="rounded-full bg-brand-pink px-10 py-3.5 text-[15px] font-extrabold text-white transition hover:opacity-90"
                >
                  ✗ Faux
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={prev}
                disabled={state.imageIndex === 0}
                className="rounded-full border border-panel-border bg-panel px-6 py-3 text-[13px] font-semibold transition enabled:hover:bg-white/10 disabled:opacity-35"
              >
                ← Précédente
              </button>
              <button
                type="button"
                onClick={toggle}
                className="rounded-full bg-gradient-to-r from-brand-pink to-brand-amber px-8 py-3 text-[13px] font-bold text-white transition hover:opacity-90"
              >
                {revealed ? "Masquer la photo" : "Révéler la photo"}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={state.imageIndex === TOTAL - 1}
                className="rounded-full border border-panel-border bg-panel px-6 py-3 text-[13px] font-semibold transition enabled:hover:bg-white/10 disabled:opacity-35"
              >
                Suivante →
              </button>
            </div>
          </>
        )}

        <p className="mt-4 text-center text-[11px] text-muted-dim/70">
          {isAdmin
            ? "Raccourcis : ←→ naviguer · Espace : révéler"
            : "Épreuve pilotée par l'animateur"}
          {" · "}
          {connected ? "synchronisé en direct" : "reconnexion…"}
        </p>

        {error && (
          <p className="mt-3 rounded-xl bg-brand-pink/10 px-4 py-3 text-center text-[12px] text-brand-pink">
            {error}
          </p>
        )}
      </section>

      {/* Finalistes */}
      <section className="rounded-3xl border border-panel-border bg-panel p-6">
        <h2 className="eyebrow">Scores — 2e tour</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-dim">
          Le premier qui buzze bloque les autres. <strong>Vrai</strong> marque
          un point et rouvre tous les buzzers ; <strong>Faux</strong> les rouvre
          sans point. Dans les deux cas, celui qui vient de répondre peut
          rebuzzer.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {finalists.length === 0 ? (
            <li className="text-[12px] text-muted-dim">
              Aucun finaliste : le 1er tour n&apos;est pas terminé.
            </li>
          ) : (
            finalists.map((f) => {
              const isBuzzed = f.ticket === state.buzzedTicket;
              return (
                <li
                  key={f.ticket}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                    isBuzzed
                      ? "border-brand-green/50 bg-brand-green/10"
                      : "border-row-border bg-row"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">
                      {f.playerName ?? `Ticket ${f.ticket}`}
                    </p>
                    <p className="eyebrow mt-0.5 !text-[9px]">
                      Ticket {f.ticket}
                    </p>
                  </div>

                  {isBuzzed && (
                    <span className="eyebrow !text-[9px] !text-brand-green">
                      Buzz
                    </span>
                  )}

                  <span className="tabular text-[17px] font-extrabold">
                    {points[f.ticket] ?? 0}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
