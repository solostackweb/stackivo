import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, MailQuestion } from "lucide-react";
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
    return (
      <ErrorBox
        title="This link looks incomplete"
        message="The invitation token is missing from the URL. Open the original email link again — make sure your inbox didn't trim the link."
      />
    );
  }

  const res = await acceptPortalInvitationAction({ token });
  if (res.ok) {
    // Bounce straight into the portal — the user just signed in to
    // accept, so there's no friction to skip.
    redirect(portalClientHome(res.data!.portalId));
  }

  // Surface the specific failure (expired / revoked / email mismatch /
  // already accepted) with friendlier copy. The action returns plain
  // strings, so we softly classify by keyword to pick a helpful nudge.
  const raw = res.error ?? "We couldn't accept this invitation.";
  const lower = raw.toLowerCase();
  const isExpired = lower.includes("expire");
  const isEmailMismatch =
    lower.includes("email") &&
    (lower.includes("match") || lower.includes("address"));
  const title = isExpired
    ? "This invitation has expired"
    : isEmailMismatch
      ? "Signed in with a different email"
      : "We couldn't accept this invitation";
  const message = isExpired
    ? "Invitations are time-limited. Ask the freelancer to re-send the link from their dashboard and try again."
    : isEmailMismatch
      ? "This invitation was sent to a specific email address. Sign out and sign back in using the email the invitation was sent to."
      : raw;

  return <ErrorBox title={title} message={message} />;
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-4 p-5 text-center sm:p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
        <div className="flex items-start gap-2.5 rounded-md bg-muted/40 p-3 text-left">
          <MailQuestion className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tip: re-open the original email from your freelancer and tap
            the &ldquo;Accept invitation&rdquo; link again. If it still
            doesn&apos;t work, ask them to send a fresh invite.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/portal">Back to portals</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

