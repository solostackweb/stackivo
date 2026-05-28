"use server";

/**
 * Support system — server actions exposed to client components.
 *
 *   submitBugReportAction()     → creates a Zoho Desk ticket from the
 *                                  in-app `/help` form.
 *
 *   --- Admin-only actions (require requireAdmin()) ---
 *   updateThreadStatusAction()  → change status (open/resolved/etc.)
 *   updateThreadPriorityAction() → change priority
 *   updateThreadCategoryAction() → set category
 *   addThreadTagAction()        → append a tag (idempotent)
 *   removeThreadTagAction()     → remove a tag
 *   sendThreadReplyAction()     → send reply via Crisp + append note
 *
 * All actions are best-effort and return a typed envelope.
 */

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/features/email/service";
import { log } from "@/lib/logger";
import { requireAdmin } from "@/features/admin/server";
import { createZohoTicket, isZohoConfigured } from "./zoho-client";
import {
  listCrispConversations,
  sendCrispMessage,
  updateCrispState,
} from "./crisp-client";
import { upsertSupportThread } from "./webhooks";
import type { BugReportInput, BugReportResult, SupportCategory, SupportStatus, SupportPriority } from "./types";

const bugReportSchema = z.object({
  category: z.enum([
    "billing",
    "bug",
    "how-to",
    "feature-request",
    "account",
    "onboarding",
  ]),
  summary: z.string().min(5).max(250),
  details: z.string().min(10).max(5_000),
  page: z.string().max(500).optional(),
  email: z.string().email().max(254).optional(),
});

const ZOHO_PRIORITY: Record<SupportCategory, "Low" | "Medium" | "High"> = {
  billing: "High",
  bug: "High",
  account: "High",
  onboarding: "Medium",
  "how-to": "Low",
  "feature-request": "Low",
};

function zohoToPriority(p: "Low" | "Medium" | "High"): SupportPriority {
  switch (p) {
    case "High":
      return "high";
    case "Medium":
      return "normal";
    default:
      return "low";
  }
}

const ZOHO_CATEGORY: Record<SupportCategory, string> = {
  billing: "Billing",
  bug: "Issue",
  "how-to": "How To",
  "feature-request": "Feature",
  account: "Account",
  onboarding: "Onboarding",
};

export async function submitBugReportAction(
  input: BugReportInput,
): Promise<BugReportResult> {
  const parsed = bugReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const data = parsed.data;

  // Identity discovery. Logged-in users → email + name from auth +
  // user_profiles. Logged-out users → fall back to the email field on
  // the form.
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let email = data.email ?? null;
  let fullName: string | null = null;
  let userId: string | null = null;

  if (user) {
    userId = user.id;
    email = email ?? user.email ?? null;
    const prof = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    fullName = (prof.data as { full_name?: string | null } | null)?.full_name ?? null;
  }

  if (!email) {
    return { ok: false, error: "Email is required for support requests." };
  }

  const tags: string[] = [data.category];
  if (userId) tags.push("authenticated");
  else tags.push("guest");

  // Trace correlation — middleware sets a request id cookie we can
  // include in the ticket so support replies can be traced back to
  // server logs / Sentry events.
  const cookieStore = await cookies();
  const traceId = cookieStore.get("x-request-id")?.value ?? null;

  const subject = `[${data.category}] ${data.summary}`;
  const description = data.details;
  const metadata: Record<string, unknown> = {
    page: data.page ?? null,
    user_id: userId,
    trace_id: traceId,
    submitted_at: new Date().toISOString(),
  };

  if (isZohoConfigured()) {
    const res = await createZohoTicket({
      subject,
      description,
      contactEmail: email,
      contactName: fullName ?? undefined,
      category: ZOHO_CATEGORY[data.category],
      priority: ZOHO_PRIORITY[data.category],
      tags,
      metadata,
    });
    if (res.ok) {
      log.info("support.bug_report.zoho_ok", {
        ticket_id: res.ticketId,
        category: data.category,
        user_id: userId,
      });
      // Mirror into support_threads so /admin/support shows this request.
      await upsertSupportThread({
        externalSystem: "zoho_desk",
        externalId: res.ticketId ?? `zoho-${Date.now()}`,
        subject,
        status: "new",
        priority: zohoToPriority(ZOHO_PRIORITY[data.category]),
        category: data.category,
        tags,
        contactEmail: email,
        externalUrl: res.ticketId
          ? `https://desk.zoho.in/support/stackivo/ShowHomePage.do#Cases/dv/${res.ticketId}`
          : null,
        lastMessageAt: new Date().toISOString(),
      }).catch((err) =>
        log.warn("support.bug_report.thread_upsert_failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      return { ok: true, via: "zoho_desk", ticket_id: res.ticketId };
    }
    log.warn("support.bug_report.zoho_failed_fallback_email", {
      error: res.error,
    });
    // fall through to email fallback below
  }

  // Email fallback. We send the founder a one-shot email with the form
  // contents so the request is never silently dropped.
  try {
    await sendEmail({
      type: "support",
      to: { email: "support@stackivo.me", name: "Stackivo Support" },
      replyTo: { email, name: fullName ?? undefined },
      subject: `[${data.category.toUpperCase()}] ${data.summary}`,
      html: renderEmailHtml({
        email,
        fullName,
        userId,
        category: data.category,
        summary: data.summary,
        details: data.details,
        page: data.page ?? null,
        traceId,
      }),
      text: [
        `Bug report from ${email}${fullName ? ` (${fullName})` : ""}`,
        `Category: ${data.category}`,
        `User id: ${userId ?? "(guest)"}`,
        `Page: ${data.page ?? "(unknown)"}`,
        `Trace id: ${traceId ?? "(none)"}`,
        "",
        "Summary:",
        data.summary,
        "",
        "Details:",
        data.details,
      ].join("\n"),
      tags: ["bug-report", data.category, userId ? "authed" : "guest"],
    });
    log.info("support.bug_report.email_ok", {
      category: data.category,
      user_id: userId,
    });
    // Mirror into support_threads so /admin/support shows this request.
    await upsertSupportThread({
      externalSystem: "email",
      externalId: `email-${Date.now()}-${email.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`,
      subject,
      status: "new",
      priority: zohoToPriority(ZOHO_PRIORITY[data.category]),
      category: data.category,
      tags,
      contactEmail: email,
      lastMessageAt: new Date().toISOString(),
    }).catch((err) =>
      log.warn("support.bug_report.thread_upsert_failed", {
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: true, via: "email_fallback" };
  } catch (err) {
    log.error("support.bug_report.email_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "Could not deliver report. Please email support@stackivo.me directly." };
  }
}

// ---------------------------------------------------------------------------
// Admin-only thread management actions
// ---------------------------------------------------------------------------

export interface AdminActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function getThread(id: string) {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("support_threads")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as {
    id: string;
    external_system: string;
    external_id: string;
    status: SupportStatus;
    priority: SupportPriority;
    category: SupportCategory | null;
    tags: string[];
    user_id: string | null;
  };
}

export async function updateThreadStatusAction(
  threadId: string,
  status: SupportStatus,
): Promise<AdminActionResult> {
  await requireAdmin();
  const admin = getAdminSupabase();

  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "Thread not found" };

  const { error } = await admin
    .from("support_threads")
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) return { ok: false, error: error.message };

  // Mirror state to Crisp if this is a Crisp conversation
  if (thread.external_system === "crisp") {
    const crispState =
      status === "resolved" || status === "closed"
        ? "resolved"
        : status === "waiting"
          ? "pending"
          : "unresolved";
    await updateCrispState(thread.external_id, crispState).catch(() => null);
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function updateThreadPriorityAction(
  threadId: string,
  priority: SupportPriority,
): Promise<AdminActionResult> {
  await requireAdmin();
  const admin = getAdminSupabase();

  const { error } = await admin
    .from("support_threads")
    .update({ priority, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function updateThreadCategoryAction(
  threadId: string,
  category: SupportCategory | null,
): Promise<AdminActionResult> {
  await requireAdmin();
  const admin = getAdminSupabase();

  const { error } = await admin
    .from("support_threads")
    .update({ category, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function addThreadTagAction(
  threadId: string,
  tag: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  const admin = getAdminSupabase();

  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "Thread not found" };

  const trimmed = tag.trim().toLowerCase().slice(0, 50);
  if (!trimmed) return { ok: false, error: "Tag cannot be empty" };

  const newTags = Array.from(new Set([...thread.tags, trimmed]));
  const { error } = await admin
    .from("support_threads")
    .update({ tags: newTags, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function removeThreadTagAction(
  threadId: string,
  tag: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  const admin = getAdminSupabase();

  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "Thread not found" };

  const newTags = thread.tags.filter((t) => t !== tag);
  const { error } = await admin
    .from("support_threads")
    .update({ tags: newTags, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function sendThreadReplyAction(
  threadId: string,
  message: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const trimmed = message.trim();
  if (!trimmed || trimmed.length < 2) return { ok: false, error: "Message too short" };
  if (trimmed.length > 5000) return { ok: false, error: "Message too long (max 5000 chars)" };

  const thread = await getThread(threadId);
  if (!thread) return { ok: false, error: "Thread not found" };

  let sent = false;

  if (thread.external_system === "crisp") {
    const res = await sendCrispMessage(thread.external_id, trimmed);
    if (!res.ok) return { ok: false, error: res.error ?? "Crisp send failed" };
    sent = true;
  }

  if (!sent) {
    return { ok: false, error: "Replies are only supported for Crisp conversations currently." };
  }

  // Bump status to open (waiting → open means operator replied)
  const admin = getAdminSupabase();
  await admin
    .from("support_threads")
    .update({ status: "open", updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);

  revalidatePath(`/admin/support/${threadId}`);
  return { ok: true };
}

export async function syncCrispConversationsAction(): Promise<
  AdminActionResult<{ count: number }>
> {
  await requireAdmin();

  const conversations = await listCrispConversations({
    pageNumber: 1,
    filterResolved: false,
  });

  if (conversations.length === 0) {
    return {
      ok: false,
      error:
        "No Crisp conversations returned. Check CRISP_API_IDENTIFIER, CRISP_API_KEY, and NEXT_PUBLIC_CRISP_WEBSITE_ID.",
    };
  }

  let count = 0;
  for (const conversation of conversations) {
    const stateMap: Record<string, SupportStatus> = {
      pending: "new",
      unresolved: "open",
      resolved: "resolved",
    };
    const subject =
      conversation.meta?.subject ??
      conversation.last_message?.content?.slice(0, 200) ??
      conversation.meta?.email ??
      conversation.meta?.nickname ??
      "Crisp conversation";
    const lastMessageAt =
      conversation.last_message?.timestamp ??
      conversation.updated_at ??
      conversation.created_at;

    const result = await upsertSupportThread({
      externalSystem: "crisp",
      externalId: conversation.session_id,
      subject,
      status: stateMap[conversation.state] ?? "open",
      priority:
        conversation.unread?.operator && conversation.unread.operator > 0
          ? "high"
          : "normal",
      contactEmail: conversation.meta?.email ?? null,
      externalUrl: `https://app.crisp.chat/website/${process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID}/inbox/${conversation.session_id}/`,
      lastMessageAt: new Date(lastMessageAt).toISOString(),
    });

    if (result.ok) count += 1;
  }

  revalidatePath("/admin/support");
  return { ok: true, data: { count } };
}

// ---------------------------------------------------------------------------
// Private helpers (not admin actions)
// ---------------------------------------------------------------------------

function renderEmailHtml(args: {
  email: string;
  fullName: string | null;
  userId: string | null;
  category: SupportCategory;
  summary: string;
  details: string;
  page: string | null;
  traceId: string | null;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 4px;">${esc(args.summary)}</h1>
      <div style="color: #64748b; font-size: 12px; margin-bottom: 16px;">
        Category: <strong>${args.category}</strong>
        · From: <strong>${esc(args.email)}</strong>${args.fullName ? ` (${esc(args.fullName)})` : ""}
        ${args.userId ? `· User: <code>${esc(args.userId)}</code>` : "· (guest)"}
      </div>
      <div style="font-size: 14px; line-height: 1.5; white-space: pre-wrap; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc;">
        ${esc(args.details)}
      </div>
      <table style="width:100%; border-collapse: collapse; margin-top: 16px; font-size: 12px;">
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b;">Page</td>
          <td style="padding: 4px 0; color: #0f172a;"><code>${esc(args.page ?? "(unknown)")}</code></td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b;">Trace id</td>
          <td style="padding: 4px 0; color: #0f172a;"><code>${esc(args.traceId ?? "(none)")}</code></td>
        </tr>
      </table>
      <p style="color: #94a3b8; font-size: 11px; margin: 24px 0 0;">
        This email is the fallback path when Zoho Desk isn't configured. Reply
        directly to ${esc(args.email)}.
      </p>
    </div>
  `;
}
