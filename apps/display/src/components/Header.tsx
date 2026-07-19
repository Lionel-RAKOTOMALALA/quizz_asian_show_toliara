"use client";

export type Tab = "ranking" | "slideshow";

interface Props {
  tab: Tab;
  onTab: (tab: Tab) => void;
  /** Passe au rouge quand l'API ne répond plus. */
  connected: boolean;
  /** Realtime absent : données encore affichées, mais via le repli périodique. */
  degraded?: boolean;
}

export function Header({ tab, onTab, connected, degraded }: Props) {
  const label = !connected
    ? "Serveur injoignable"
    : degraded
      ? "En différé · repli réseau"
      : "En direct · réseau local";
  return (
    <header className="flex items-center justify-between gap-6 px-8 py-5">
      <div className="flex items-center gap-4">
        <h1 className="text-[17px] font-extrabold tracking-tight">
          Quiz <span className="text-brand-pink">K-pop</span>
          <span className="text-white"> &amp; </span>
          <span className="text-brand-amber">Anime</span>
          <span className="ml-1 text-[13px] font-medium text-muted">
            · Édition Toliara
          </span>
        </h1>

        <span className="flex items-center gap-2 rounded-full border border-panel-border bg-panel px-3 py-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !connected
                ? "bg-brand-pink"
                : degraded
                  ? "bg-brand-amber"
                  : "bg-brand-green"
            }`}
          />
          <span className="eyebrow !text-[9px]">{label}</span>
        </span>
      </div>

      <nav className="flex items-center gap-2">
        <TabButton
          active={tab === "ranking"}
          onClick={() => onTab("ranking")}
          label="Classement — 1er tour"
        />
        <TabButton
          active={tab === "slideshow"}
          onClick={() => onTab("slideshow")}
          label="2e tour — Diaporama"
        />
        <span className="ml-3 text-[12px] text-muted-dim">
          App participant →
        </span>
      </nav>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-5 py-2.5 text-[12px] font-semibold transition ${
        active
          ? "bg-white text-ink"
          : "border border-panel-border bg-panel text-white/80 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
