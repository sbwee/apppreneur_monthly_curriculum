"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/src/lib/api";
import { setAccessToken } from "@/src/lib/auth";
import { isSupabaseConfigured, updatePassword } from "@/src/lib/authFlows";
import { supabase } from "@/src/lib/supabase";

type ResetState = "loading" | "ready" | "invalid" | "config" | "success";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetState, setResetState] = useState<ResetState>(() => (supabase ? "loading" : "config"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let cancelled = false;
    let resolved = false;

    const markReady = () => {
      if (!cancelled && !resolved) {
        resolved = true;
        setResetState("ready");
      }
    };

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        markReady();
      }
    });

    const timeout = window.setTimeout(async () => {
      if (cancelled || resolved) {
        return;
      }

      const { data: { session } } = await client.auth.getSession();
      if (session) {
        markReady();
        return;
      }

      if (!cancelled && !resolved) {
        setResetState("invalid");
      }
    }, 750);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorDetail(null);

    if (password.length < 6) {
      setErrorDetail("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorDetail("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setResetState("config");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await updatePassword(password);
      const token = session.access_token;

      setAccessToken(token);
      await apiFetch("/api/health", {}, token);

      setResetState("success");
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/home");
    } catch (error) {
      setErrorDetail(error instanceof Error ? error.message : "Could not update password.");
      setIsSubmitting(false);
    }
  }

  if (resetState === "loading") {
    return (
      <section className="w-full max-w-[430px]">
        <p className="text-lg text-[var(--color-ink-muted)]">Verifying your reset link…</p>
      </section>
    );
  }

  if (resetState === "config") {
    return (
      <section className="w-full max-w-[430px]">
        <h1 className="brand-mark text-5xl">Curio</h1>
        <p className="auth-feedback auth-feedback-invalid mt-8">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      </section>
    );
  }

  if (resetState === "invalid") {
    return (
      <section className="w-full max-w-[430px]">
        <h1 className="brand-mark text-5xl">Curio</h1>
        <div className="mt-16">
          <h2 className="font-serif text-5xl leading-tight text-[var(--color-brand-forest)]">
            This reset link is invalid or expired
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">
            Request a fresh link from the sign-in page and try again.
          </p>
        </div>
        <Link href="/" className="btn-primary mt-12 inline-block text-center">
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[430px]">
      <h1 className="brand-mark text-5xl">Curio</h1>

      <div className="mt-16">
        <h2 className="font-serif text-5xl leading-tight text-[var(--color-brand-forest)]">
          Choose a new password
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">
          Pick something you will remember — then we will bring you back to your garden.
        </p>
      </div>

      <form className="mt-12 space-y-5" aria-label="Reset password form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className="field-label">
            New password
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="field-input tracking-[0.18em]"
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="field-label">
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="field-input tracking-[0.18em]"
            minLength={6}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting || resetState === "success"}>
          {isSubmitting ? "Saving…" : resetState === "success" ? "Redirecting…" : "Update password"}
        </button>

        {errorDetail && (
          <p className="auth-feedback auth-feedback-invalid" role="alert">
            {errorDetail}
          </p>
        )}

        {resetState === "success" && (
          <p className="auth-feedback auth-feedback-success" aria-live="polite">
            Password updated. Redirecting to your home workspace…
          </p>
        )}
      </form>
    </section>
  );
}
