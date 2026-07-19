"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LoginForm } from "@/components/admin/LoginForm";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { TicketManager } from "@/components/admin/TicketManager";
import { supabase, type Category, type QuestionRow } from "@/lib/supabase";

type Filter = "all" | Category;
type AdminTab = "questions" | "tickets";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<AdminTab>("questions");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<QuestionRow | null | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<QuestionRow | null>(null);

  // État de connexion.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("question")
      .select("id, category, prompt, choices, correct_index, updated_at")
      .order("category", { ascending: true })
      .order("id", { ascending: true });

    if (error) setError(error.message);
    else setQuestions((data ?? []) as QuestionRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  /**
   * Propose le prochain identifiant libre d'une catégorie : `kpop-101`.
   * On repart du plus grand suffixe numérique existant.
   */
  const suggestedId = useCallback(
    (category: Category) => {
      const max = questions
        .filter((q) => q.category === category)
        .map((q) => Number.parseInt(q.id.split("-")[1] ?? "0", 10))
        .filter((n) => Number.isFinite(n))
        .reduce((a, b) => Math.max(a, b), 0);
      return `${category}-${max + 1}`;
    },
    [questions],
  );

  async function save(q: QuestionRow, isNew: boolean): Promise<string | null> {
    const row = {
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      choices: q.choices,
      correct_index: q.correct_index,
    };

    const { error } = isNew
      ? await supabase.from("question").insert(row)
      : await supabase.from("question").update(row).eq("id", q.id);

    if (error) {
      return error.code === "23505"
        ? `L'identifiant ${q.id} existe déjà.`
        : error.message;
    }

    setEditing(undefined);
    await load();
    return null;
  }

  async function remove(q: QuestionRow) {
    setPendingDelete(null);

    const { error } = await supabase.from("question").delete().eq("id", q.id);
    if (error) setError(error.message);
    else await load();
  }

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (filter !== "all" && q.category !== filter) return false;
      if (!needle) return true;
      return (
        q.prompt.toLowerCase().includes(needle) ||
        q.id.toLowerCase().includes(needle) ||
        q.choices.some((c) => c.toLowerCase().includes(needle))
      );
    });
  }, [questions, search, filter]);

  const counts = useMemo(
    () => ({
      kpop: questions.filter((q) => q.category === "kpop").length,
      anime: questions.filter((q) => q.category === "anime").length,
    }),
    [questions],
  );

  if (!ready) {
    return <p className="p-8 text-[13px] text-muted-dim">Chargement…</p>;
  }

  if (!session) return <LoginForm />;

  return (
    <div className="flex flex-1 flex-col px-8 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight">
            Administration
          </h1>
          <p className="mt-1 text-[12px] text-muted-dim">
            {tab === "questions"
              ? `${counts.kpop} K-pop · ${counts.anime} Anime · ${questions.length} au total`
              : "Billetterie — un ticket doit être émis avant de pouvoir servir"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[12px] text-muted-dim underline-offset-4 hover:underline"
          >
            ← Écran de projection
          </a>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="rounded-full border border-panel-border px-4 py-2 text-[12px] font-semibold hover:bg-white/5"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex gap-1 self-start rounded-xl border border-row-border bg-row p-1">
        {(
          [
            ["questions", "Questions"],
            ["tickets", "Tickets"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
              tab === t ? "bg-white text-ink" : "text-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tickets" ? (
        <div className="mt-5 flex flex-1 flex-col">
          <TicketManager />
        </div>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un intitulé, un identifiant, une proposition…"
          className="min-w-64 flex-1 rounded-xl border border-row-border bg-row px-4 py-2.5 text-[13px] outline-none focus:border-brand-pink"
        />

        <div className="flex gap-1 rounded-xl border border-row-border bg-row p-1">
          {(["all", "kpop", "anime"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition ${
                filter === f ? "bg-white text-ink" : "text-muted hover:text-white"
              }`}
            >
              {f === "all" ? "Toutes" : f === "kpop" ? "K-pop" : "Anime"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="rounded-full bg-gradient-to-r from-brand-pink to-brand-amber px-5 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
        >
          + Nouvelle question
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-brand-pink/10 px-4 py-3 text-[12px] text-brand-pink">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-muted-dim">Chargement des questions…</p>
      ) : (
        <>
          <p className="pb-2 text-[11px] text-muted-dim">
            {visible.length} question{visible.length > 1 ? "s" : ""} affichée
            {visible.length > 1 ? "s" : ""}
          </p>

          <ul className="flex flex-col gap-2">
            {visible.map((q) => (
              <li
                key={q.id}
                className="rounded-2xl border border-row-border bg-row px-4 py-3"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`mt-1 h-6 w-[3px] shrink-0 rounded-full ${
                      q.category === "kpop" ? "bg-brand-pink" : "bg-brand-amber"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="eyebrow !text-[9px]">{q.id}</span>
                    </div>
                    <p className="mt-1 text-[14px] font-semibold">{q.prompt}</p>
                    <p className="mt-1 text-[12px] text-muted-dim">
                      {q.choices.map((c, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          <span
                            className={
                              i === q.correct_index
                                ? "font-bold text-brand-green"
                                : ""
                            }
                          >
                            {c}
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(q)}
                      className="rounded-lg border border-panel-border px-3 py-1.5 text-[12px] font-semibold hover:bg-white/10"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(q)}
                      className="rounded-lg border border-brand-pink/40 px-3 py-1.5 text-[12px] font-semibold text-brand-pink hover:bg-brand-pink/10"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
        </>
      )}

      {editing !== undefined && (
        <QuestionEditor
          question={editing}
          suggestedId={suggestedId}
          onSave={save}
          onCancel={() => setEditing(undefined)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Supprimer la question ${pendingDelete.id} ?`}
          message={`« ${pendingDelete.prompt} »`}
          warning="Cette question ne sera plus jamais tirée. L'action est irréversible."
          onConfirm={() => void remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
