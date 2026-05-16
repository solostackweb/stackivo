import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Compatibility shell retained for Tailwind/Turbopack dev-server file tracking.
 * The dashboard no longer renders pending payments because invoices are created
 * only after payment in the simplified workflow.
 */
export function PendingPayments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paid invoice workflow</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Invoices are generated after payment and delivered as PDF records.
      </CardContent>
    </Card>
  );
}
