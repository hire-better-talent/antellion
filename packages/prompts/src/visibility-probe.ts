/**
 * Prompt template for probing AI models about employer visibility.
 * Used to assess how a company appears in AI-driven candidate discovery.
 */
export function visibilityProbe(companyName: string, query: string): string {
  return `You are a senior candidate evaluating potential employers.

A candidate searches: "${query}"

Based on your training data, how would you describe ${companyName} as an employer in the context of this search? Cover:
- Whether ${companyName} appears relevant to this query
- Key strengths and weaknesses as an employer for this role/skill area
- How ${companyName} compares to likely competitors
- Any notable signals (culture, compensation, growth, engineering reputation)

Be specific and evidence-based. If you have limited information, say so.`;
}
