"use client";

import { useEffect, useState } from "react";
import type { Category, QuestionRow } from "@/lib/supabase";

const EMPTY: QuestionRow = {
  id: "",
  category: "kpop",
  prompt: "",
  choices: ["", "", "", ""],
  correct_index: 0,
};

interface Props {
  /** `null` = création d'une nouvelle question. */
  question: QuestionRow | null;
  /** Proposition d'identifiant pour une création. */
  suggestedId: (category: Category) => string;
  onSave: (q: QuestionRow, isNew: boolean) => Promise<string | null>;
  onCancel: () => void;
}

export function QuestionEditor({
  question,
  suggestedId,
  onSave,
  onCancel,
}: Props) {
  const isNew = question === null;
  const [draft, setDraft] = useState<QuestionRow>(question ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // À la création, l'identifiant suit la catégorie choisie.
  useEffect(() => {
    if (isNew) {
      setDraft((d) => ({ ...d, id: suggestedId(d.category) }));
    }
    // `suggestedId` est stable, seule la catégorie compte ici.
  }, [isNew, draft.category, suggestedId]);

  function setChoice(index: number, value: string) {
    setDraft((d) => {
      const choices = [...d.choices];
      choices[index] = value;
      return { ...d, choices };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Mêmes règles que les contraintes SQL, vérifiées avant l'aller-retour.
    if (!draft.prompt.trim()) return setError("L'intitulé est obligatoire.");
    if (draft.choices.some((c) => !c.trim())) {
      return setError("Les 4 propositions doivent être remplies.");
    }
    const unique = new Set(draft.choices.map((c) => c.trim().toLowerCase()));
    if (unique.size !== 4) {
      return setError("Les 4 propositions doivent être différentes.");
    }

    setBusy(true);
    const message = await onSave(
      {
        ...draft,
        prompt: draft.prompt.trim(),
        choices: draft.choices.map((c) => c.trim()),
      },
      isNew,
    );
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <form
        onSubmit={submit}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-panel-border bg-ink p-8"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-extrabold">
            {isNew ? "Nouvelle question" : "Modifier la question"}
          </h2>
          <span className="eyebrow">{draft.id}</span>
        </div>

        <label className="mt-6 block">
          <span className="eyebrow">Catégorie</span>
          <select
            value={draft.category}
            onChange={(e) =>
              setDraft((d) => ({ ...d, category: e.target.value as Category }))
            }
            disabled={!isNew}
            className="mt-2 w-full rounded-xl border border-row-border bg-row px-4 py-3 text-[14px] outline-none focus:border-brand-pink disabled:opacity-50"
          >
            <option value="kpop">K-pop</option>
            <option value="anime">Anime</option>
          </select>
          {!isNew && (
            <span className="mt-1 block text-[11px] text-muted-dim">
              La catégorie est figée : l&apos;identifiant en dépend.
            </span>
          )}
        </label>

        <label className="mt-4 block">
          <span className="eyebrow">Intitulé</span>
          <textarea
            value={draft.prompt}
            onChange={(e) =>
              setDraft((d) => ({ ...d, prompt: e.target.value }))
            }
            rows={3}
            className="mt-2 w-full resize-y rounded-xl border border-row-border bg-row px-4 py-3 text-[14px] outline-none focus:border-brand-pink"
          />
        </label>

        <div className="mt-4">
          <span className="eyebrow">
            Propositions — coche la bonne réponse
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {draft.choices.map((choice, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition ${
                  draft.correct_index === i
                    ? "border-brand-green/60 bg-brand-green/10"
                    : "border-row-border bg-row"
                }`}
              >
                <input
                  type="radio"
                  name="correct"
                  checked={draft.correct_index === i}
                  onChange={() =>
                    setDraft((d) => ({ ...d, correct_index: i }))
                  }
                  className="accent-[#45d48a]"
                />
                <span className="w-4 text-[12px] font-bold text-muted-dim">
                  {["A", "B", "C", "D"][i]}
                </span>
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => setChoice(i, e.target.value)}
                  className="flex-1 bg-transparent text-[14px] outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-brand-pink/10 px-4 py-3 text-[12px] text-brand-pink">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-panel-border px-6 py-2.5 text-[13px] font-semibold hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-gradient-to-r from-brand-pink to-brand-amber px-7 py-2.5 text-[13px] font-bold text-white transition enabled:hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
