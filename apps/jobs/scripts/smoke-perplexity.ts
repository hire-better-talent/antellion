import { queryLLM } from "../src/llm-client";

async function main() {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error("FAIL: PERPLEXITY_API_KEY not set in environment");
    process.exit(1);
  }

  const prompt =
    "What is it like to work at Stripe as a software engineer in 2026? Cite specific sources.";

  const t0 = Date.now();
  const response = await queryLLM(prompt, { model: "sonar-pro", temperature: 0.7 });
  const ms = Date.now() - t0;

  console.log("---");
  console.log(`provider:      ${response.provider}`);
  console.log(`model:         ${response.model}`);
  console.log(`latency_ms:    ${ms}`);
  console.log(`text_chars:    ${response.text.length}`);
  console.log(`text_preview:  ${response.text.slice(0, 240).replace(/\s+/g, " ")}...`);
  console.log(`citations:     ${response.citations?.length ?? 0}`);
  if (response.citations?.length) {
    for (const [i, c] of response.citations.slice(0, 3).entries()) {
      console.log(`  [${i + 1}] ${c.url ?? "(no url)"} — ${(c.title ?? "").slice(0, 60)}`);
    }
  }
  console.log("---");
  console.log("OK");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
