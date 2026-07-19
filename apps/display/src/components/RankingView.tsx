"use client";

import { CATEGORY_LABELS, QUIZ_CONFIG } from "@quizz/shared";
import type { Category, LeaderboardEntry, LeaderboardStats } from "@quizz/shared";

interface Props {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
  finalists: LeaderboardEntry[];
  onLaunchRound2: () => void;
}

/** Pastille de couleur : rose pour la K-pop, ambre pour l'Anime. */
function categoryColor(category: Category): string {
  return category === "kpop" ? "bg-brand-pink" : "bg-brand-amber";
}

export function RankingView({
  entries,
  stats,
  finalists,
  onLaunchRound2,
}: Props) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-5 px-8 pb-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {/* Classement général */}
      <section className="rounded-3xl border border-panel-border bg-panel p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="eyebrow">Classement général</h2>
          <p className="text-[11px] text-muted-dim">
            Qualification : {QUIZ_CONFIG.questionsPerSession}/
            {QUIZ_CONFIG.questionsPerSession} ou les{" "}
            {QUIZ_CONFIG.qualifiedCount} meilleurs scores
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-[13px] text-muted-dim">
            Aucun résultat pour l&apos;instant. Le classement se remplit à mesure
            que les participant·e·s terminent leur épreuve.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-2">
            {entries.map((e) => (
              <li
                key={e.ticket}
                className="flex items-center gap-4 rounded-2xl border border-row-border bg-row px-4 py-3"
              >
                <span
                  className={`tabular w-7 text-[13px] font-extrabold ${
                    e.qualified ? "text-brand-green" : "text-muted-dim"
                  }`}
                >
                  {String(e.rank).padStart(2, "0")}
                </span>

                <span
                  className={`h-7 w-[3px] shrink-0 rounded-full ${categoryColor(e.category)}`}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">
                    {e.playerName ?? `Ticket ${e.ticket}`}
                  </p>
                  <p className="eyebrow mt-0.5 !text-[9px]">
                    Ticket {e.ticket} · {CATEGORY_LABELS[e.category]}
                  </p>
                </div>

                {!e.finished ? (
                  // Épreuve en cours : on montre l'avancement plutôt qu'un
                  // statut de qualification qui n'a pas encore de sens.
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-amber" />
                    <span className="eyebrow !text-[9px] !text-brand-amber">
                      En cours · {e.answered}/{e.total}
                    </span>
                  </span>
                ) : (
                  e.qualified && (
                    <span className="eyebrow !text-[9px] !text-brand-green">
                      Qualifié·e
                    </span>
                  )
                )}

                <span className="tabular w-16 text-right">
                  <span
                    className={`text-[19px] font-extrabold ${
                      e.finished ? "" : "text-muted"
                    }`}
                  >
                    {e.score}
                  </span>
                  <span className="text-[11px] text-muted-dim">
                    /{e.total}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Colonne de droite */}
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-3 gap-4 rounded-3xl border border-panel-border bg-panel p-6">
          <Stat
            value={String(stats.participants)}
            label="Participants"
            tone="text-brand-green"
          />
          <Stat
            value={`${stats.bestScore}/${stats.total}`}
            label="Meilleur score"
            tone="text-brand-amber"
          />
          <Stat
            value={String(stats.finished)}
            label="Épreuves finies"
            tone="text-white"
          />
        </section>

        <section className="flex flex-1 flex-col rounded-3xl border border-panel-border bg-panel p-6">
          <h2 className="eyebrow">Qualifié·e·s — 2e tour</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-dim">
            Les {QUIZ_CONFIG.qualifiedCount} premiers accèdent à l&apos;épreuve
            de reconnaissance d&apos;images : silhouette, puis révélation de la
            photo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {finalists.length === 0 ? (
              <p className="text-[12px] text-muted-dim">
                Personne n&apos;est encore qualifié·e.
              </p>
            ) : (
              finalists.map((f) => (
                <span
                  key={f.ticket}
                  className="rounded-xl border border-row-border bg-row px-3 py-2 text-[12px] font-semibold"
                >
                  {f.playerName ?? `Ticket ${f.ticket}`}{" "}
                  <span className="tabular text-brand-green">
                    {f.score}/{f.total}
                  </span>
                </span>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={onLaunchRound2}
            disabled={finalists.length === 0}
            className="mt-auto w-full rounded-full bg-gradient-to-r from-brand-pink to-brand-amber py-3.5 text-[13px] font-bold text-white transition enabled:hover:opacity-90 disabled:opacity-40"
          >
            Lancer le 2e tour →
          </button>
        </section>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="text-center">
      <p className={`tabular text-[26px] font-extrabold leading-none ${tone}`}>
        {value}
      </p>
      <p className="eyebrow mt-2 !text-[9px]">{label}</p>
    </div>
  );
}
