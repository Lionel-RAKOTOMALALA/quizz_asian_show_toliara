import type { LeaderboardEntry, LeaderboardStats } from "@quizz/shared";

/** Port de l'API sur le réseau local de la salle. */
const API_PORT = 3333;

/**
 * Adresse de l'API, résolue **à l'exécution** et non au build.
 *
 * `NEXT_PUBLIC_*` est figé au moment du `next build` : le définir au lancement
 * n'aurait aucun effet. Et une valeur en dur `localhost` désignerait la machine
 * qui *affiche* la page — donc rien du tout si l'écran est ouvert depuis un
 * autre appareil du réseau. On repart donc de l'hôte de la page courante, ce
 * qui marche aussi bien en `localhost:3000` qu'en `192.168.x.x:3000`.
 */
export function apiBase(): string {
  const override = process.env.NEXT_PUBLIC_API_URL;
  if (override) return override;

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }

  // Rendu serveur : jamais utilisé pour un appel réseau, valeur de repli.
  return `http://localhost:${API_PORT}`;
}

/** @deprecated préférer `apiBase()`, évalué côté navigateur. */
export const API_BASE = `http://localhost:${API_PORT}`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiBase() + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface Snapshot {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
  finalists: LeaderboardEntry[];
}

/** Un seul aller-retour pour tout ce qu'affiche l'écran. */
export async function fetchSnapshot(): Promise<Snapshot> {
  const [entries, stats, finalists] = await Promise.all([
    get<LeaderboardEntry[]>("/leaderboard"),
    get<LeaderboardStats>("/leaderboard/stats"),
    get<LeaderboardEntry[]>("/leaderboard/finalists"),
  ]);
  return { entries, stats, finalists };
}
