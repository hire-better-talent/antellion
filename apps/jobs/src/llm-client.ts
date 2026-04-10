import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Response interface ────────────────────────────────────────

export interface LLMCitation {
  url: string;
  title: string | null;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string; // "openai" | "anthropic" | "google"
  tokenCount: number;
  promptTokens: number;
  latencyMs: number;
  citations: LLMCitation[];
}

// ── Lazy client singletons ────────────────────────────────────

let _openaiClient: OpenAI | null = null;
let _anthropicClient: Anthropic | null = null;
let _googleClient: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

function getGoogleClient(): GoogleGenerativeAI {
  if (!_googleClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");
    _googleClient = new GoogleGenerativeAI(apiKey);
  }
  return _googleClient;
}

// ── Provider detection ────────────────────────────────────────

function getProviderForModel(model: string): "openai" | "anthropic" | "google" {
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) {
    return "openai";
  }
  if (model.startsWith("claude")) {
    return "anthropic";
  }
  if (model.startsWith("gemini")) {
    return "google";
  }
  return "openai";
}

// ── Retry helpers ─────────────────────────────────────────────

const RETRY_DELAYS_MS = [2000, 5000, 15000]; // exponential-ish backoff

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const status =
    "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : null;
  return status === 429;
}

// ── Per-provider implementations ──────────────────────────────

/**
 * Call OpenAI chat completions. Temperature 1 matches the ChatGPT default so
 * results reflect natural candidate experience rather than deterministic mode.
 */
async function queryOpenAI(
  prompt: string,
  model: string,
  temperature: number,
): Promise<LLMResponse> {
  const client = getOpenAIClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]!;
      console.log(`  [openai] Rate limited. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1})...`);
      await sleep(delayMs);
    }

    const startMs = Date.now();

    try {
      // Use the Responses API with web search enabled.
      // This matches the ChatGPT consumer experience where AI can cite
      // real sources — essential for the citation ecosystem analysis.
      const response = await client.responses.create(
        {
          model,
          temperature,
          input: prompt,
          tools: [{ type: "web_search_preview" as any }],
        },
        { timeout: 60_000 }, // web search takes longer
      );

      const latencyMs = Date.now() - startMs;

      // Extract text and citations from the response output items.
      // The Responses API returns url_citation annotations on output_text blocks
      // when web_search_preview is enabled.
      let text = "";
      const citations: LLMCitation[] = [];
      const seenUrls = new Set<string>();

      for (const item of response.output ?? []) {
        if (item.type === "message") {
          for (const content of (item as any).content ?? []) {
            if (content.type === "output_text") {
              text += content.text ?? "";
              // Extract url_citation annotations
              for (const ann of content.annotations ?? []) {
                if (ann.type === "url_citation" && ann.url && !seenUrls.has(ann.url)) {
                  seenUrls.add(ann.url);
                  citations.push({
                    url: ann.url,
                    title: ann.title ?? null,
                  });
                }
              }
            }
          }
        }
      }

      // Fallback: if no message output, try the legacy format
      if (!text && (response as any).output_text) {
        text = (response as any).output_text;
      }

      const usage = response.usage;

      return {
        text,
        model: response.model ?? model,
        provider: "openai",
        tokenCount: (usage?.total_tokens as number) ?? 0,
        promptTokens: (usage?.input_tokens as number) ?? 0,
        latencyMs,
        citations,
      };
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < RETRY_DELAYS_MS.length) continue;
      throw err;
    }
  }

  throw lastError;
}

/**
 * Call Anthropic messages API with web search enabled via the beta endpoint.
 * Web search returns BetaWebSearchToolResultBlock content blocks containing
 * BetaWebSearchResultBlock entries with url and title fields.
 */
async function queryAnthropic(
  prompt: string,
  model: string,
  temperature: number,
): Promise<LLMResponse> {
  const client = getAnthropicClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]!;
      console.log(`  [anthropic] Rate limited. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1})...`);
      await sleep(delayMs);
    }

    const startMs = Date.now();

    try {
      // Use the beta messages API with web_search tool enabled.
      // This gives Claude access to real-time web content and returns
      // structured citation data in web_search_tool_result blocks.
      const response = await client.beta.messages.create(
        {
          model,
          max_tokens: 8192,
          temperature,
          messages: [{ role: "user", content: prompt }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        },
        { timeout: 60_000 },
      );

      const latencyMs = Date.now() - startMs;

      // Extract text from text blocks and citations from web search result blocks
      let text = "";
      const citations: LLMCitation[] = [];
      const seenUrls = new Set<string>();

      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
        } else if (block.type === "web_search_tool_result") {
          // content is either an error or an array of web search results
          if (Array.isArray(block.content)) {
            for (const result of block.content) {
              if (result.type === "web_search_result" && result.url && !seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                citations.push({
                  url: result.url,
                  title: result.title ?? null,
                });
              }
            }
          }
        }
      }

      const promptTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        text,
        model: response.model ?? model,
        provider: "anthropic",
        tokenCount: promptTokens + outputTokens,
        promptTokens,
        latencyMs,
        citations,
      };
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < RETRY_DELAYS_MS.length) continue;
      throw err;
    }
  }

  throw lastError;
}

/**
 * Call Google Generative AI with Google Search grounding enabled.
 * Grounding returns source URLs in response.candidates[0].groundingMetadata.
 * Token counts may be absent — handle gracefully.
 */
async function queryGoogle(
  prompt: string,
  model: string,
  temperature: number,
): Promise<LLMResponse> {
  const client = getGoogleClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]!;
      console.log(`  [google] Rate limited. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1})...`);
      await sleep(delayMs);
    }

    const startMs = Date.now();

    try {
      // Enable Google Search grounding so Gemini cites real web sources.
      // The googleSearchRetrieval tool is the correct field name in SDK v0.24+.
      // tools[] is typed as Tool = FunctionDeclarationsTool | CodeExecutionTool | GoogleSearchRetrievalTool.
      const generativeModel = client.getGenerativeModel({
        model,
        generationConfig: { temperature },
        tools: [{ googleSearchRetrieval: {} }],
      });

      // The SDK RequestOptions accepts a timeout field — use it instead of Promise.race.
      const result = await generativeModel.generateContent(prompt, { timeout: 60_000 });
      const latencyMs = Date.now() - startMs;
      const response = result.response;
      const text = response.text();
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

      // Extract grounding citations from the first candidate's groundingMetadata.
      // groundingChunks holds { web: { uri, title } } entries — one per cited source.
      // Dedup by URL in case the same source appears in multiple chunks.
      const citations: LLMCitation[] = [];
      const seenUrls = new Set<string>();

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of groundingChunks) {
        const uri = chunk.web?.uri;
        if (uri && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          citations.push({
            url: uri,
            title: chunk.web?.title ?? null,
          });
        }
      }

      return {
        text,
        model,
        provider: "google",
        tokenCount: promptTokens + outputTokens,
        promptTokens,
        latencyMs,
        citations,
      };
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < RETRY_DELAYS_MS.length) continue;
      throw err;
    }
  }

  throw lastError;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Send a single prompt to the selected LLM provider and return the response
 * along with provenance metadata.
 *
 * Provider is selected automatically from the model name:
 *   gpt-* / o1-* / o3-* → OpenAI
 *   claude-*             → Anthropic
 *   gemini-*             → Google
 *   (default)            → OpenAI / gpt-4o
 *
 * Behaviour shared across all providers:
 * - Temperature defaults to 1 (matches ChatGPT default / candidate experience).
 * - Rate-limit (429) responses trigger up to 3 retries with exponential backoff.
 * - Per-request timeout of 30s; throws on timeout so callers can skip safely.
 * - Provider name is included in the response for evidence provenance.
 */
export async function queryLLM(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
  },
): Promise<LLMResponse> {
  const model = options?.model ?? "gpt-4o";
  const temperature = options?.temperature ?? 1;
  const provider = getProviderForModel(model);

  // Fail fast if the required API key is absent
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  if (provider === "google" && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not set");
  }

  switch (provider) {
    case "openai":
      return queryOpenAI(prompt, model, temperature);
    case "anthropic":
      return queryAnthropic(prompt, model, temperature);
    case "google":
      return queryGoogle(prompt, model, temperature);
  }
}

// ── Provider enum mapping ─────────────────────────────────────

/**
 * Map the provider string from LLMResponse to the Prisma LLMProvider enum value.
 */
export function mapProviderToEnum(provider: string): "OPENAI" | "ANTHROPIC" | "GOOGLE" | "MANUAL" {
  switch (provider) {
    case "openai":
      return "OPENAI";
    case "anthropic":
      return "ANTHROPIC";
    case "google":
      return "GOOGLE";
    default:
      return "MANUAL";
  }
}
