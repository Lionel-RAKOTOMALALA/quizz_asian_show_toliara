"use client";

import { useEffect, useState } from "react";
import { Header, type Tab } from "@/components/Header";
import { RankingView } from "@/components/RankingView";
import { SlideshowView } from "@/components/SlideshowView";
import { supabase } from "@/lib/supabase";
import { useLiveData } from "@/lib/useLiveData";

export default function Home() {
  const [tab, setTab] = useState<Tab>("ranking");
  const { entries, stats, finalists, connected, degraded } = useLiveData();

  // L'écran de projection est public ; seul l'animateur connecté peut arbitrer
  // le 2e tour. On s'appuie sur la session Supabase ouverte via /admin.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => setIsAdmin(!!data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setIsAdmin(!!s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <Header
        tab={tab}
        onTab={setTab}
        connected={connected}
        degraded={degraded}
      />

      {tab === "ranking" ? (
        <RankingView
          entries={entries}
          stats={stats}
          finalists={finalists}
          onLaunchRound2={() => setTab("slideshow")}
        />
      ) : (
        <SlideshowView finalists={finalists} isAdmin={isAdmin} />
      )}
    </>
  );
}
