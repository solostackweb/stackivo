import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { acceptPortalInvitationAction } from "@/features/portals/actions";
import { portalClientHome } from "@/features/portals/routes";

export const metadata = { title: "Accept invitation" };
export const dynamic = "force-dynamic";

/**
 * Server-component shell for the invitation accept page. We accept
 * synchronously on first render because the layout has already verified
 * the user is signed in. If the token is bad / expired we render an
 * error explanation; if it's good we redirect into the portal.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <ErrorBox message="No invitation token in the URL." />;
  }

  const res = await acceptPortalInvitationAction({ token });
  if (res.ok) {
    // Bounce straight into the portal — the user just signed in to
    // accept, so there's no friction to skip.
    redirect(portalClientHome(res.data!.portalId));
  }

  return <ErrorBox message={res.error} />;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <Card className="mx-auto max-w-md border-destructive/30">
      <CardContent className="space-y-4 p-6 text-center">
        <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
        <h1 className="text-base font-semibold">
          We couldn&apos;t accept this invitation
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal">Back to portals</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

