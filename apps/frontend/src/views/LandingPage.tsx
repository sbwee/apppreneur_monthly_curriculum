import { AppFooter } from "@/src/components/landing/AppFooter";
import { FeatureShowcase } from "@/src/components/landing/FeatureShowcase";
import { LoginForm } from "@/src/components/landing/LoginForm";

export function LandingPage() {
  return (
    <main className="landing-shell">
      <div className="landing-layout">
        <section className="px-8 py-10 md:px-14 md:py-14">
          <LoginForm />
        </section>

        <FeatureShowcase />
      </div>

      <AppFooter />
    </main>
  );
}
