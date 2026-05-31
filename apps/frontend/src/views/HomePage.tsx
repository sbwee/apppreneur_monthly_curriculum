"use client";



import { useEffect, useState } from "react";

import { BucketList } from "@/src/components/home/BucketList";

import { FeatureCard } from "@/src/components/home/FeatureCard";

import { Header } from "@/src/components/home/Header";

import { ProgressCard } from "@/src/components/home/ProgressCard";

import { Sidebar } from "@/src/components/home/Sidebar";

import { getAccessToken } from "@/src/lib/auth";

import { buildWelcomeMessage, fetchHomeDashboard, type HomeDashboard } from "@/src/lib/homeApi";



export function HomePage() {

  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);



  useEffect(() => {

    const token = getAccessToken();

    if (!token) {

      return;

    }



    let cancelled = false;



    (async () => {

      setIsLoading(true);

      setLoadError(null);



      try {

        const data = await fetchHomeDashboard(token);

        if (!cancelled) {

          setDashboard(data);

        }

      } catch (error) {

        if (!cancelled) {

          setLoadError(error instanceof Error ? error.message : "Could not load dashboard.");

        }

      } finally {

        if (!cancelled) {

          setIsLoading(false);

        }

      }

    })();



    return () => {

      cancelled = true;

    };

  }, []);



  const welcomeText =

    dashboard != null

      ? buildWelcomeMessage(dashboard)

      : isLoading

        ? "Loading your garden…"

        : "Welcome back. Sign in to see your learning progress.";



  const hasCurricula = (dashboard?.curriculumCount ?? 0) > 0;

  const greetingName = dashboard?.displayName ?? (isLoading ? "…" : "Learner");



  return (

    <main className="home-shell">

      <Sidebar
        activeHref="/home"
        showcaseSlug={dashboard?.showcaseSlug ?? null}
        displayName={dashboard?.displayName}
      />



      <section className="home-main">

        <Header />



        <section className="mt-8">

          <h1 className="font-serif text-7xl leading-[1.05] text-[#1F2B24]">

            Welcome back, {greetingName}

          </h1>

          {loadError ? (

            <p className="mt-4 max-w-3xl text-2xl text-[#9A504A]" role="alert">

              {loadError}

            </p>

          ) : (

            <p className="mt-4 max-w-3xl text-2xl text-[var(--color-ink-muted)]">{welcomeText}</p>

          )}

        </section>



        {!isLoading && !loadError && (

          <section className="home-core-grid">

            <ProgressCard

              completionPercent={dashboard?.mastery ?? 0}

              completionDone={dashboard?.completionDone ?? 0}

              completionTotal={dashboard?.completionTotal ?? 0}

              hasSchedule={dashboard?.hasSchedule ?? false}

              activeCurriculumTitle={dashboard?.activeCurriculumTitle ?? null}

              tracks={dashboard?.tracks ?? []}

              isEmpty={!hasCurricula}

            />

            <BucketList

              items={dashboard?.inboxItems ?? []}

              emptyReason={dashboard?.inboxEmptyReason ?? "no_curriculum"}

            />

          </section>

        )}



        <FeatureCard />

      </section>

    </main>

  );

}

