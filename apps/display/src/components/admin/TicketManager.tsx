"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TicketEditor } from "./TicketEditor";

interface TicketRow {
  code: string;
  used_at: string | null;
}

type Filter = "all" | "free" | "used";

export function TicketManager() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("ticket")
      .select("code, used_at")
      .order("used_at", { ascending: true, nullsFirst: true })
      .order("code", { ascending: true });

    if (error) setError(error.message);
    else setTickets((data ?? []) as TicketRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(code: string): Promise<string | null> {
    const { error } = await supabase.from("ticket").insert({ code });

    if (error) {
      return error.code === "23505"
        ? `Le ticket ${code} existe déjà.`
        : error.message;
    }

    setCreating(false);
    await load();
    return null;
  }


  const visible = useMemo(() => {
    const needle = search.trim();
    return tickets.filter((t) => {
      if (filter === "free" && t.used_at) return false;
      if (filter === "used" && !t.used_at) return false;
      return !needle || t.code.includes(needle);
    });
  }, [tickets, search, filter]);

  const counts = useMemo(
    () => ({
      free: tickets.filter((t) => !t.used_at).length,
      used: tickets.filter((t) => t.used_at).length,
    }),
    [tickets],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <input
          type="search"
          inputMode="numeric"
          value={search}
          onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))}
          placeholder="Rechercher un numéro…"
          className="min-w-56 flex-1 rounded-xl border border-row-border bg-row px-4 py-2.5 text-[13px] outline-none focus:border-brand-pink"
        />

        <div className="flex gap-1 rounded-xl border border-row-border bg-row p-1">
          {(
            [
              ["all", `Tous (${tickets.length})`],
              ["free", `Libres (${counts.free})`],
              ["used", `Utilisés (${counts.used})`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition ${
                filter === f ? "bg-white text-ink" : "text-muted hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-gradient-to-r from-brand-pink to-brand-amber px-5 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
        >
          + Nouveau ticket
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-brand-pink/10 px-4 py-3 text-[12px] text-brand-pink">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-muted-dim">Chargement des tickets…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-muted-dim">
          Aucun ticket. Crée-en un pour que les participants puissent
          s&apos;inscrire — sans ticket émis, l&apos;application refuse toute
          inscription.
        </p>
      ) : (
        <>
          <p className="pb-2 text-[11px] text-muted-dim">
            {visible.length} ticket{visible.length > 1 ? "s" : ""} affiché
            {visible.length > 1 ? "s" : ""}
          </p>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((t) => (
              <li
                key={t.code}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  t.used_at
                    ? "border-row-border bg-row"
                    : "border-brand-green/30 bg-brand-green/5"
                }`}
              >
                <span
                  className={`h-7 w-[3px] shrink-0 rounded-full ${
                    t.used_at ? "bg-muted-dim" : "bg-brand-green"
                  }`}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`tabular text-[19px] font-extrabold tracking-widest ${
                      t.used_at ? "text-muted" : ""
                    }`}
                  >
                    {t.code}
                  </p>
                  <p
                    className={`eyebrow !text-[9px] ${
                      t.used_at ? "" : "!text-brand-green"
                    }`}
                  >
                    {t.used_at ? "Utilisé" : "Libre"}
                  </p>
                </div>

              </li>
            ))}
          </ul>
        </>
      )}

      {creating && (
        <TicketEditor onSave={create} onCancel={() => setCreating(false)} />
      )}
    </div>
  );
}
