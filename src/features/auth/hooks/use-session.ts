"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface UseSessionResult {
  status: SessionStatus;
  session: Session | null;
  user: User | null;
}

/**
 * Client-side session hook.
 *
 * Initial state is `loading` while the browser client restores the session
 * from cookies. Subsequent auth events (`SIGNED_IN`, `SIGNED_OUT`,
 * `TOKEN_REFRESHED`) keep the state in sync live.
 *
 * Most pages should get the user from the server (via RSC + `requireUser()`).
 * This hook is for client-only UI that needs to react to auth changes —
 * e.g. the user avatar in the top nav, or a "Sign out" button's loading state.
 */
export function useSession(): UseSessionResult {
  const [state, setState] = React.useState<UseSessionResult>({
    status: "loading",
    session: null,
    user: null,
  });

  React.useEffect(() => {
    const supabase = getBrowserSupabase();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({
        status: data.session ? "authenticated" : "unauthenticated",
        session: data.session,
        user: data.session?.user ?? null,
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          status: session ? "authenticated" : "unauthenticated",
          session,
          user: session?.user ?? null,
        });
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}
