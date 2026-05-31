"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { clearAuthCookie, ensureAuthCookie, getAccessToken } from "@/src/lib/auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

function subscribeToAuth() {
  return () => {};
}

function getAuthSnapshot() {
  return getAccessToken();
}

function getAuthServerSnapshot() {
  return null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthServerSnapshot);

  useEffect(() => {
    if (!token) {
      clearAuthCookie();
      router.replace("/");
      return;
    }

    ensureAuthCookie();
  }, [router, token]);

  if (!token) {
    return (
      <main className="home-shell">
        <section className="home-main flex min-h-[50vh] items-center justify-center">
          <p className="text-lg text-[var(--color-ink-muted)]">Opening your garden…</p>
        </section>
      </main>
    );
  }

  return children;
}
