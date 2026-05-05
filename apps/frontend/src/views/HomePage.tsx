import { BucketList } from "@/src/components/home/BucketList";
import { FeatureCard } from "@/src/components/home/FeatureCard";
import { Header } from "@/src/components/home/Header";
import { ProgressCard } from "@/src/components/home/ProgressCard";
import { Sidebar } from "@/src/components/home/Sidebar";

export function HomePage() {
  return (
    <main className="home-shell">
      <Sidebar activeHref="/home" />

      <section className="home-main">
        <Header />

        <section className="mt-8">
          <h1 className="font-serif text-7xl leading-[1.05] text-[#1F2B24]">Welcome back, Serra</h1>
          <p className="mt-4 max-w-3xl text-2xl text-[var(--color-ink-muted)]">
            Your garden of knowledge is growing beautifully. You have 3 resources
            waiting in your bucket list and one milestone within reach.
          </p>
        </section>

        <section className="home-core-grid">
          <ProgressCard />
          <BucketList />
        </section>

        <FeatureCard />
      </section>
    </main>
  );
}
