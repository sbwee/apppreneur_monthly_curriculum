"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mockAuthUser } from "@/src/data/mockAuth";

type AuthState = "idle" | "invalid" | "success";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("idle");

  const helpText = useMemo(() => {
    if (authState === "invalid") {
      return "Invalid credentials. Please check your email and password.";
    }

    if (authState === "success") {
      return "Success. Redirecting to your home workspace...";
    }

    return `Use ${mockAuthUser.email} / ${mockAuthUser.password}`;
  }, [authState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const isValid =
      email.trim().toLowerCase() === mockAuthUser.email.toLowerCase() &&
      password === mockAuthUser.password;

    if (!isValid) {
      setAuthState("invalid");
      setIsSubmitting(false);
      return;
    }

    setAuthState("success");

    // Mimic auth verification delay before redirecting.
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push("/home");
  }

  return (
    <section className="w-full max-w-[430px]">
      <h1 className="brand-mark text-5xl">Learning Ledger</h1>

      <div className="mt-16">
        <h2 className="font-serif text-5xl leading-tight text-[var(--color-brand-forest)]">
          Your personal garden of knowledge awaits
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-[var(--color-ink-muted)]">
          Log in to tend to your digital collections and resume your learning
          journey.
        </p>
      </div>

      <form className="mt-12 space-y-5" aria-label="Sign in form" onSubmit={handleSubmit}>
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

        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="password" className="field-label mb-0">
              Password
            </label>
            <button type="button" className="text-sm font-medium text-[#9A504A]">
              Forgot Password?
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="field-input tracking-[0.18em]"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>

        <button type="button" className="btn-secondary">
          Create Account
        </button>

        <p
          className={`auth-feedback ${
            authState === "invalid"
              ? "auth-feedback-invalid"
              : authState === "success"
                ? "auth-feedback-success"
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
