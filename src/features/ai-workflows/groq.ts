import "server-only";

import { requireServerEnv } from "@/config/env";

interface GroqChatMessage {
  role: "system" | "user";
  content: string;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function generateStructuredJson({
  messages,
  temperature = 0.2,
}: {
  messages: GroqChatMessage[];
  temperature?: number;
}): Promise<unknown | null> {
  const serverEnv = requireServerEnv();
  if (!serverEnv.groqApiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: serverEnv.groqModel,
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq request failed with status ${res.status}`);
  }

  const json = (await res.json()) as GroqChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
