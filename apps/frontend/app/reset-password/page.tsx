import { Suspense } from "react";
import { ResetPasswordForm } from "@/src/components/landing/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="landing-shell">
      <div className="landing-layout landing-layout-single">
        <section className="px-8 py-10 md:px-14 md:py-14">
          <Suspense fallback={<p className="text-lg text-[var(--color-ink-muted)]">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
