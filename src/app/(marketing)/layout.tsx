import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { getMarketingAuthState } from "@/features/marketing/auth-state";
import { DashboardSupportLayer } from "@/features/support/dashboard-support";
import { StickyMobileCta } from "@/components/marketing/sticky-mobile-cta";
import { GlobalCtaTracker } from "@/components/marketing/global-cta-tracker";
import { ExitIntentModal } from "@/components/marketing/exit-intent-modal";

/**
 * Public-website route group. Wraps every marketing page in a sticky header
 * + footer; auth + dashboard + onboarding live in their own route groups
 * with their own chrome.
 *
 * The support layer (Crisp chat + floating help button) mounts here too so
 * marketing visitors can open chat / send a bug report without signing up
 * first. Identity is intentionally `null` for anon visitors — Crisp accepts
 * that and the dashboard layout re-identifies once they log in.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getMarketingAuthState();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader authState={authState} />
      <main className="flex-1">{children}</main>
      <MarketingFooter authState={authState} />
      <DashboardSupportLayer
        identity={{
          email: null,
          nickname: null,
          userId: null,
          plan: null,
          mrr: null,
        }}
      />
      <StickyMobileCta authState={authState} />
      <GlobalCtaTracker />
      <ExitIntentModal />
    </div>
  );
}
