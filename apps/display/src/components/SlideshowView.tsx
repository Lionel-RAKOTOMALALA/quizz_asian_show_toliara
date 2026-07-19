"use client";

import { QUIZ_CONFIG, SOCKET_EVENTS } from "@quizz/shared";
import type { LeaderboardEntry, Round2Phase } from "@quizz/shared";
import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

interface Props {
  finalists: LeaderboardEntry[];
  /** Permet de synchroniser le diaporama entre plusieurs écrans. */
  socket: Socket | null;
}

const TOTAL = QUIZ_CONFIG.round2ImageCount;

export function SlideshowView({ finalists, socket }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  /** Points du 2e tour, attribués à la main par l'animateur. */
  const [points, setPoints] = useState<Record<string, number>>({});

  /** Applique un changement localement puis le diffuse aux autres écrans. */
  const publish = useCallback(
    (nextIndex: number, phase: Round2Phase) => {
      setIndex(nextIndex);
      setRevealed(phase === "revealed");
      socket?.emit(SOCKET_EVENTS.ROUND2_IMAGE, {
        index: nextIndex,
        phase,
      });
    },
    [socket],
  );

  const prev = useCallback(
    () => publish(Math.max(0, index - 1), "silhouette"),
    [index, publish],
  );

  const next = useCallback(
    () => publish(Math.min(TOTAL - 1, index + 1), "silhouette"),
    [index, publish],
  );

  const reveal = useCallback(
    () => publish(index, revealed ? "silhouette" : "revealed"),
    [index, revealed, publish],
  );

  // Réception des commandes émises par un autre écran.
  useEffect(() => {
    if (!socket) return;

    function onImage(payload: { index: number; phase: Round2Phase }) {
      setIndex(payload.index);
      setRevealed(payload.phase === "revealed");
    }
    function onScore(payload: { ticket: string; points: number }) {
      setPoints((p) => ({ ...p, [payload.ticket]: payload.points }));
    }

    socket.on(SOCKET_EVENTS.ROUND2_IMAGE, onImage);
    socket.on(SOCKET_EVENTS.ROUND2_SCORE, onScore);
    return () => {
      socket.off(SOCKET_EVENTS.ROUND2_IMAGE, onImage);
      socket.off(SOCKET_EVENTS.ROUND2_SCORE, onScore);
    };
  }, [socket]);

  // Raccourcis clavier annoncés en pied de page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.code === "Space") {
        e.preventDefault();
        reveal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, reveal]);

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 px-8 pb-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {/* Diaporama */}
      <section className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="eyebrow">
            Reconnaissance d&apos;images · Image {index + 1} / {TOTAL}
          </h2>
          <p className="eyebrow !text-brand-amber">
            {revealed ? "Photo révélée" : "Phase silhouette"}
          </p>
        </div>

        <div className="mt-3 flex flex-1 items-center justify-center rounded-3xl border border-panel-border bg-black/25 p-6">
          <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-24 text-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted-dim"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-dim">
              {revealed
                ? `PHOTO — Idole K-pop n°${index + 1} (image réelle)`
                : `SILHOUETTE — Idole K-pop n°${index + 1} (PNG noir sur fond transparent/uni)`}
            </p>
            <p className="mt-1 text-[11px] text-muted-dim/60">
              Aucune image chargée — table Round2Image vide
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="rounded-full border border-panel-border bg-panel px-6 py-3 text-[13px] font-semibold transition enabled:hover:bg-white/10 disabled:opacity-35"
          >
            ← Précédente
          </button>
          <button
            type="button"
            onClick={reveal}
            className="rounded-full bg-gradient-to-r from-brand-pink to-brand-amber px-8 py-3 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            {revealed ? "Masquer la photo" : "Révéler la photo"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === TOTAL - 1}
            className="rounded-full border border-panel-border bg-panel px-6 py-3 text-[13px] font-semibold transition enabled:hover:bg-white/10 disabled:opacity-35"
          >
            Suivante →
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-dim/70">
          Raccourcis clavier : ←→ naviguer · Espace : révéler ·{" "}
          {socket ? "synchronisé via le serveur local (WebSocket)" : "hors ligne"}
        </p>
      </section>

      {/* Scores du 2e tour */}
      <section className="rounded-3xl border border-panel-border bg-panel p-6">
        <h2 className="eyebrow">Scores — 2e tour</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-dim">
          Attribution des points à affiner avec le client (main levée / via
          l&apos;app). Démo : +1 point au premier qui reconnaît l&apos;image.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {finalists.length === 0 ? (
            <li className="text-[12px] text-muted-dim">
              Aucun finaliste : le 1er tour n&apos;est pas terminé.
            </li>
          ) : (
            finalists.map((f) => (
              <li
                key={f.ticket}
                className="flex items-center gap-3 rounded-2xl border border-row-border bg-row px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">
                    {f.playerName ?? `Ticket ${f.ticket}`}
                  </p>
                  <p className="eyebrow mt-0.5 !text-[9px]">
                    Ticket {f.ticket}
                  </p>
                </div>

                <span className="tabular text-[17px] font-extrabold">
                  {points[f.ticket] ?? 0}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const value = (points[f.ticket] ?? 0) + 1;
                    setPoints((p) => ({ ...p, [f.ticket]: value }));
                    socket?.emit(SOCKET_EVENTS.ROUND2_SCORE, {
                      ticket: f.ticket,
                      points: value,
                    });
                  }}
                  aria-label={`Ajouter un point à ${f.playerName ?? f.ticket}`}
                  className="h-8 w-8 rounded-lg border border-panel-border bg-white/5 text-[15px] font-bold transition hover:bg-white/15"
                >
                  +
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
