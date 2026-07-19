"use client";

import { useState } from "react";
import { Header, type Tab } from "@/components/Header";
import { RankingView } from "@/components/RankingView";
import { SlideshowView } from "@/components/SlideshowView";
import { useLiveData } from "@/lib/useLiveData";

export default function Home() {
  const [tab, setTab] = useState<Tab>("ranking");
  const { entries, stats, finalists, connected, degraded, socket } =
    useLiveData();

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
        <SlideshowView finalists={finalists} socket={socket} />
      )}
    </>
  );
}
