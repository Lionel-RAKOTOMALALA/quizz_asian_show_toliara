"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // Message volontairement générique : ne pas révéler si le compte existe.
      setError("Identifiants incorrects.");
      setBusy(false);
    }
    // En cas de succès, `onAuthStateChange` bascule la page automatiquement.
  }

  return (
    <div className="flex flex-1 items-center justify-center px-8 pb-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-panel-border bg-panel p-8"
      >
        <h1 className="eyebrow">Administration</h1>
        <p className="mt-2 text-[20px] font-extrabold tracking-tight">
          Gestion des questions
        </p>
        <p className="mt-2 text-[12px] text-muted-dim">
          Réservé à l&apos;organisation. L&apos;écran de projection reste
          accessible sans connexion.
        </p>

        <label className="mt-6 block">
          <span className="eyebrow">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-row-border bg-row px-4 py-3 text-[14px] outline-none focus:border-brand-pink"
          />
        </label>

        <label className="mt-4 block">
          <span className="eyebrow">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-row-border bg-row px-4 py-3 text-[14px] outline-none focus:border-brand-pink"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-brand-pink/10 px-4 py-3 text-[12px] text-brand-pink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-brand-pink to-brand-amber py-3 text-[13px] font-bold text-white transition enabled:hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
