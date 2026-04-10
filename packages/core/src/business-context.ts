/**
 * Builds a business context string from client profile fields.
 * Used by:
 * - The query generation form (auto-populates the business context textarea)
 * - The generateQueries action (fallback when form field is empty)
 * - The createClient action (auto-generates on creation)
 */

export interface BusinessContextInput {
  name: string;
  description?: string | null;
  industry?: string | null;
  revenueScale?: string | null;
  headquarters?: string | null;
  employeeCount?: number | null;
  knownFor?: string | null;
  nicheKeywords?: string | null;
  publiclyTraded?: boolean;
}

export function buildBusinessContext(client: BusinessContextInput): string {
  const parts: string[] = [];

  if (client.description) {
    // Use first 2 sentences of description
    const sentences = client.description
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(" ")
      .trim();
    if (sentences) parts.push(sentences);
  }

  const meta: string[] = [];
  if (client.revenueScale) {
    const label = client.revenueScale === "fortune500" ? "Fortune 500" : client.revenueScale;
    meta.push(label);
  }
  if (client.publiclyTraded) meta.push("publicly traded");
  if (client.industry) meta.push(`industry: ${client.industry}`);
  if (client.headquarters) meta.push(`HQ: ${client.headquarters}`);
  if (client.employeeCount) {
    meta.push(`~${client.employeeCount.toLocaleString()} employees`);
  }
  if (meta.length > 0) parts.push(meta.join(", ") + ".");

  if (client.knownFor) parts.push(`Known for: ${client.knownFor}.`);

  if (client.nicheKeywords) {
    const keywords = client.nicheKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    if (keywords.length > 0) {
      parts.push(`Niche: ${keywords.join(", ")}.`);
    }
  }

  return parts.join(" ");
}
