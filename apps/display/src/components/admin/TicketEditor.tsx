"use client";

import { useState } from "react";

interface Props {
  onSave: (code: string) => Promise<string | null>;
  onCancel: () => void;
}

/**
 * Création d'un ticket. Un ticket n'est qu'un numéro : il n'y a rien à
 * modifier ensuite, donc pas de mode édition — on crée ou on supprime.
 */
export function TicketEditor({ onSave, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Même règle que la contrainte SQL, vérifiée avant l'aller-retour.
    if (!/^\d{4}$/.test(code)) {
      return setError("Le numéro doit comporter exactement 4 chiffres.");
    }

    setBusy(true);
    const message = await onSave(code);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-panel-border bg-ink p-8"
      >
        <h2 className="text-[18px] font-extrabold">Nouveau ticket</h2>
        <p className="mt-1 text-[12px] text-muted-dim">
          Ce numéro devra être imprimé sur le ticket physique.
        </p>

        <label className="mt-6 block">
          <span className="eyebrow">Numéro à 4 chiffres</span>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="0000"
            autoFocus
            className="tabular mt-2 w-full rounded-xl border border-row-border bg-row px-4 py-3 text-center text-[30px] font-extrabold tracking-[0.35em] outline-none focus:border-brand-pink"
          />
        </label>

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
            {busy ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
