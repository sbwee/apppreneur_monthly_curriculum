import { supabase } from "@/src/lib/supabase";

const ACCESS_TOKEN_KEY = "access_token";
export const AUTH_COOKIE_NAME = "ledger_session";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  setAuthCookie();
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  clearAuthCookie();
}

/** Sync cookie when sessionStorage still holds a token (e.g. legacy tab). */
export function ensureAuthCookie(): void {
  if (getAccessToken()) {
    setAuthCookie();
  } else {
    clearAuthCookie();
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export async function logout(): Promise<void> {
  clearAccessToken();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
