/**
 * Prompt template for LLM-based query generation.
 *
 * Use this when you want an LLM to generate diverse, creative queries
 * beyond what the template-based generator produces. The LLM can
 * incorporate business context and generate more nuanced queries.
 *
 * Expected response format: JSON array of { text, intent, theme } objects.
 */
export function queryGenerationPrompt(input: {
  companyName: string;
  roleTitle: string;
  geography: string;
  industry?: string;
  businessContext?: string;
  competitors: string[];
}): string {
  const competitorSection =
    input.competitors.length > 0
      ? `\nKey competitors for talent: ${input.competitors.join(", ")}`
      : "";

  const contextSection = input.businessContext
    ? `\nBusiness context: ${input.businessContext}`
    : "";

  return `You are an expert in employer branding and talent acquisition intelligence.

Generate a comprehensive set of search queries that a candidate considering a ${input.roleTitle} role would use to evaluate ${input.companyName} as an employer.

Company: ${input.companyName}
Role: ${input.roleTitle}
Geography: ${input.geography}
Industry: ${input.industry ?? "Technology"}${competitorSection}${contextSection}

Generate queries across these themes:
1. **reputation** — Employer brand, company reviews, industry ranking
2. **compensation** — Salary, benefits, equity, total comp
3. **hiring_process** — Interview process, application, onboarding
4. **role_expectations** — Day-to-day work, tech stack, team structure
5. **culture** — Work-life balance, remote policy, DEI, career growth
6. **competitor_comparison** — Head-to-head employer comparisons

For each query, provide:
- text: The exact search query a candidate would type
- intent: What the candidate is trying to learn (one phrase)
- theme: One of the six themes above

Guidelines:
- Generate 5-8 queries per theme
- Include both branded queries (mentioning ${input.companyName}) and category queries
- Make queries realistic — how actual candidates search
- Vary query length and specificity
- For competitor_comparison, generate queries comparing ${input.companyName} to each competitor

Respond with a JSON array of objects with text, intent, and theme fields. No other text.`;
}
