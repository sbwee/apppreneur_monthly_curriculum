import { supabase } from "@/src/lib/supabase";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase);
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session?.access_token) {
    throw new Error("Sign-in failed.");
  }

  return data.session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedName = displayName?.trim();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: trimmedName ? { display_name: trimmedName } : undefined,
      emailRedirectTo: `${getSiteUrl()}/home`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function requestPasswordReset(email: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw error;
  }

  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!data.session?.access_token) {
    throw new Error("Could not establish a session after reset.");
  }

  return data.session;
}
