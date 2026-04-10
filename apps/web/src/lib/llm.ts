import Anthropic from "@anthropic-ai/sdk";

export async function generateProse(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

/**
 * Call Claude Sonnet for structured JSON generation.
 *
 * Used by supplemental query generation and similar features that need
 * structured output with a larger token budget and explicit timeout.
 *
 * Returns the raw string response — callers are responsible for parsing
 * and validating the JSON.
 *
 * @param prompt      The user prompt (system prompt is hardcoded to JSON mode).
 * @param options.temperature  Defaults to 0.7 for diversity.
 * @param options.maxTokens    Defaults to 4096 (fits 25+ JSON items).
 * @param options.timeoutMs    Defaults to 30_000ms. If exceeded, returns "".
 */
export async function generateStructuredJSON(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  },
): Promise<string> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 4096;
  const timeoutMs = options?.timeoutMs ?? 30_000;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const call = client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    temperature,
    system:
      "You are a precise JSON generator. Always respond with valid JSON only — no markdown, no explanation, no text outside the JSON structure.",
    messages: [{ role: "user", content: prompt }],
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("LLM call timed out")), timeoutMs),
  );

  const response = await Promise.race([call, timeout]);
  return response.content[0]?.type === "text" ? response.content[0].text : "";
}
