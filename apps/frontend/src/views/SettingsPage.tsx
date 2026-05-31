"use client";

import { useState } from "react";
import { Header } from "@/src/components/home/Header";
import { Sidebar } from "@/src/components/home/Sidebar";
import { ProfileSettingsForm } from "@/src/components/settings/ProfileSettingsForm";

export function SettingsPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  return (
    <main className="home-shell">
      <Sidebar activeHref="/home" displayName={displayName ?? undefined} />

      <section className="home-main">
        <Header />
        <div className="mt-8 max-w-xl">
          <ProfileSettingsForm onDisplayNameSaved={setDisplayName} />
        </div>
      </section>
    </main>
  );
}
