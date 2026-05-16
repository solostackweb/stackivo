import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { LogOut, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

/**
 * Layout for the client-facing Client Portal area at `/portal/*`.
 *
 * This is a stripped-down workspace shell: no app sidebar, no
 * Stackivo-internal navigation. Just a simple header so the recipient
 * client knows where they are and can sign out. Branding follows the
 * portal's `brand_color` per-page.
 *
 * Auth: every route under here requires a Supabase session. Unauthed
 * users get redirected to the login page with `?next=` so they bounce
 * back here after signing in.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`${AUTH_LOGIN_ROUTE}?next=${encodeURIComponent("/portal")}`);
  }

  return (
    <div className="min-h-svh bg-muted/20 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/portal"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <Workflow className="h-4 w-4 text-primary" />
            Client Portal
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={logoutAction}>
              <Button type="submit" size="sm" variant="ghost">
                <LogOut /> Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
