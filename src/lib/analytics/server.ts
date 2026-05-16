import "server-only";

/**
 * Server-side PostHog wrapper.
 *
 * Used from server actions for events where the server knows the
 * truth (signup, login, billing webhooks) and we can't rely on the
 * browser being around to fire the event.
 *
 * Lazy-loads `posthog-node` so the module never pulls the dep into
 * cold-start memory when the key isn't set.
 */

import { env } from "@/config/env";
import { log } from "@/lib/logger";
import { redact, hashedEmail } from "@/lib/logger/redact";
import type { AnalyticsEvent, AnalyticsProps } from "./events";

type PostHogClient = {
  capture: (payload: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
    groups?: Record<string, string>;
  }) => void;
  identify: (payload: {
    distinctId: string;
    properties?: Record<string, unknown>;
  }) => void;
  shutdown: () => Promise<void>;
};

let clientPromise: Promise<PostHogClient | null> | null = null;

async function getClient(): Promise<PostHogClient | null> {
  if (!env.posthogKey) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import("posthog-node");
        const PostHog = (mod as unknown as { PostHog: new (
          key: string,
          opts: { host: string; flushAt?: number; flushInterval?: number },
        ) => PostHogClient }).PostHog;
        return new PostHog(env.posthogKey, {
          host: env.posthogHost,
          // Tune for server actions: flush quickly so events aren't lost
          // on serverless cold-shutdown.
          flushAt: 1,
          flushInterval: 0,
        });
      } catch (err) {
        log.warn("analytics.server.init_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    })();
  }
  return clientPromise;
}

/**
 * Record a server-side analytics event. Fire-and-forget — failures
 * are swallowed so analytics never breaks a business path.
 */
export async function trackServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  props?: AnalyticsProps,
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...(redact(props ?? {}) as Record<string, unknown>),
        $env: env.runtimeEnv,
        $commit: env.commitSha,
      },
    });
  } catch (err) {
    log.warn("analytics.server.capture_failed", {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Associate a distinctId with user properties. Called on signup +
 * login so PostHog's people view is populated without leaking PII.
 */
export async function identifyServer(
  userId: string,
  props: { email?: string; plan?: string; createdAt?: string },
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    client.identify({
      distinctId: userId,
      properties: {
        email_hash: props.email ? await hashedEmail(props.email) : undefined,
        plan: props.plan,
        created_at: props.createdAt,
      },
    });
  } catch (err) {
    log.warn("analytics.server.identify_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
