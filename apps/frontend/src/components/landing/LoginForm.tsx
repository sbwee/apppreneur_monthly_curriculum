"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sprout } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { setAccessToken } from "@/src/lib/auth";
import {
  type AuthMode,
  isSupabaseConfigured,
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "@/src/lib/authFlows";

type FeedbackState = "idle" | "invalid" | "success" | "config" | "info";

const DEMO_EMAIL = "demo@curio.space";
const DEMO_PASSWORD = "curio1234";

function resolveDestination(nextPath: string | null): string {
  if (
    nextPath &&
    (nextPath.startsWith("/home") ||
      nextPath.startsWith("/workspace") ||
      nextPath.startsWith("/settings"))
  ) {
    return nextPath;
  }
  return "/home";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInSource, setSignInSource] = useState<"form" | "demo" | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (mode === "sign-up") {
      return "Plant your first seed";
    }
    if (mode === "forgot-password") {
      return "Forgot your password?";
    }
    return "Your personal garden of knowledge awaits";
  }, [mode]);

  const subheading = useMemo(() => {
    if (mode === "sign-up") {
      return "Create an account to start building with Curio.";
    }
    if (mode === "forgot-password") {
      return "Enter your email and we will send a link to reset your password.";
    }
    return "Log in to tend to your digital collections and resume your learning journey.";
  }, [mode]);

  const helpText = useMemo(() => {
    if (feedbackState === "config") {
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    }

    if (feedbackState === "invalid") {
      return errorDetail ?? "Something went wrong. Please try again.";
    }

    if (feedbackState === "success") {
      if (mode === "sign-in") {
        return "Success. Redirecting to your home workspace…";
      }
      if (mode === "forgot-password") {
        return "If an account exists for that email, a reset link is on its way.";
      }
      return "Account created. Redirecting to your home workspace…";
    }

    if (feedbackState === "info") {
      return errorDetail;
    }

    if (mode === "sign-up") {
      return "We will use your display name in your garden profile.";
    }

    if (mode === "forgot-password") {
      return "Check your inbox — the link expires after a short time.";
    }

    return "Sign in with your Supabase account.";
  }, [feedbackState, errorDetail, mode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedbackState("idle");
    setErrorDetail(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function completeSignIn(accessToken: string) {
    setAccessToken(accessToken);
    await apiFetch("/api/health");
    await apiFetch("/api/folders", {}, accessToken);
    setFeedbackState("success");
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push(resolveDestination(searchParams.get("next")));
  }

  async function runSignIn(
    signInEmail: string,
    signInPassword: string,
    source: "form" | "demo" = "form",
  ) {
    setIsSubmitting(true);
    setSignInSource(source);
    setFeedbackState("idle");
    setErrorDetail(null);

    if (!isSupabaseConfigured()) {
      setFeedbackState("config");
      setIsSubmitting(false);
      setSignInSource(null);
      return;
    }

    try {
      const session = await signInWithPassword(signInEmail, signInPassword);
      await completeSignIn(session.access_token);
    } catch (error) {
      setErrorDetail(error instanceof Error ? error.message : "Request failed.");
      setFeedbackState("invalid");
      setIsSubmitting(false);
      setSignInSource(null);
    }
  }

  async function handleDemoSignIn() {
    await runSignIn(DEMO_EMAIL, DEMO_PASSWORD, "demo");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedbackState("idle");
    setErrorDetail(null);

    if (!isSupabaseConfigured()) {
      setFeedbackState("config");
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "forgot-password") {
        await requestPasswordReset(email);
        setFeedbackState("success");
        setIsSubmitting(false);
        return;
      }

      if (mode === "sign-up") {
        if (password.length < 6) {
          setErrorDetail("Password must be at least 6 characters.");
          setFeedbackState("invalid");
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorDetail("Passwords do not match.");
          setFeedbackState("invalid");
          setIsSubmitting(false);
          return;
        }

        const data = await signUpWithPassword(email, password, displayName);

        if (!data.session?.access_token) {
          setErrorDetail("Check your email to confirm your account, then sign in.");
          setFeedbackState("info");
          setMode("sign-in");
          setPassword("");
          setConfirmPassword("");
          setIsSubmitting(false);
          return;
        }

        await completeSignIn(data.session.access_token);
        return;
      }

      await runSignIn(email, password);
      return;
    } catch (error) {
      setErrorDetail(error instanceof Error ? error.message : "Request failed.");
      setFeedbackState("invalid");
      setIsSubmitting(false);
    }
  }

  const submitLabel =
    mode === "sign-in" ? "Sign In" : mode === "sign-up" ? "Create Account" : "Send Reset Link";

  return (
    <section className="w-full max-w-[430px]">
      <h1 className="brand-mark text-5xl">Curio</h1>

      <div className="mt-16">
        <h2 className="font-serif text-5xl leading-tight text-[var(--color-brand-forest)]">{heading}</h2>
        <p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">{subheading}</p>
      </div>

      <form className="mt-12 space-y-5" aria-label="Authentication form" onSubmit={handleSubmit}>
        {mode === "sign-up" && (
          <div>
            <label htmlFor="display-name" className="field-label">
              Display name
            </label>
            <input
              id="display-name"
              name="display-name"
              type="text"
              placeholder="Serra"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              className="field-input"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="field-label">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="hello@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="field-input"
            required
          />
        </div>

        {mode !== "forgot-password" && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="field-label mb-0">
                Password
              </label>
              {mode === "sign-in" && (
                <button
                  type="button"
                  className="auth-mode-link"
                  onClick={() => switchMode("forgot-password")}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              className="field-input tracking-[0.18em]"
              minLength={mode === "sign-up" ? 6 : undefined}
              required
            />
          </div>
        )}

        {mode === "sign-up" && (
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
        )}

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "sign-in" && signInSource !== "demo"
              ? "Signing In…"
              : mode === "sign-up"
                ? "Creating Account…"
                : mode === "forgot-password"
                  ? "Sending…"
                  : submitLabel
            : submitLabel}
        </button>

        {mode === "sign-in" && (
          <>
            <div className="auth-demo-divider" aria-hidden="true">
              <span>or</span>
            </div>
            <button
              type="button"
              className="btn-secondary auth-demo-btn"
              onClick={handleDemoSignIn}
              disabled={isSubmitting}
            >
              <Sprout className="auth-demo-icon" aria-hidden="true" />
              {isSubmitting && signInSource === "demo"
                ? "Entering demo garden…"
                : "Sign In as Guest / Demo"}
            </button>
          </>
        )}

        <div className="auth-mode-switch">
          {mode === "sign-in" ? (
            <p>
              New here?{" "}
              <button type="button" className="auth-mode-link" onClick={() => switchMode("sign-up")}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              {mode === "sign-up" ? "Already have an account?" : "Remember your password?"}{" "}
              <button type="button" className="auth-mode-link" onClick={() => switchMode("sign-in")}>
                Sign in
              </button>
            </p>
          )}
        </div>

        <p
          className={`auth-feedback ${
            feedbackState === "invalid" || feedbackState === "config"
              ? "auth-feedback-invalid"
              : feedbackState === "success"
                ? "auth-feedback-success"
                : feedbackState === "info"
                  ? "auth-feedback-info"
                  : ""
          }`}
          aria-live="polite"
        >
          {helpText}
        </p>
      </form>
    </section>
  );
}
