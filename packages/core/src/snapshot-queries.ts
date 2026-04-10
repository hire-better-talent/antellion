// ─── Types ───────────────────────────────────────────────────

export interface SnapshotQueryInput {
  prospectName: string;
  prospectDomain: string;
  industry: string;
  roleTitle: string;
  /** Pass at least 3 for full contrast coverage (3×6). */
  competitors: Array<{ name: string; domain: string }>;
  nicheKeywords?: string[];
  geography?: string;
}

export interface SnapshotQuery {
  text: string;
  category: "discovery" | "competitor_contrast" | "reputation" | "citation_source";
  /** Which competitor this query targets (contrast queries only). */
  competitorName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Return true if the role title belongs to an engineering / technical job
 * family. Used to choose the S2 citation probe variant.
 */
function isEngineeringRole(roleTitle: string): boolean {
  return /engineer|developer|devops|sre|sdet|qa |tester|architect|infrastructure|platform|security|frontend|backend|fullstack|full stack/i.test(
    roleTitle,
  );
}

function d(text: string): SnapshotQuery {
  return { text, category: "discovery" };
}

// ─── Category 1: Discovery Absence (65 queries) ──────────────
//
// Strategy:
//   D1–D53:  53 fixed templates (always included).
//   D54–D65: Conditional templates selected by priority when conditions match.
//   F1–F12:  Fallback pool used only if conditionals don't fill the 12 remaining slots.
//
// Total target: exactly 65 discovery queries.
// INVARIANT: No discovery query may contain the prospect company name.

function buildDiscoveryQueries(
  industry: string,
  role: string,
  nicheKeywords: string[] | undefined,
  geography: string | undefined,
): SnapshotQuery[] {
  const hasNiche = Array.isArray(nicheKeywords) && nicheKeywords.length > 0;
  const hasGeo = typeof geography === "string" && geography.trim() !== "";
  const niche = hasNiche ? nicheKeywords![0] : "";
  const geo = hasGeo ? geography! : "";

  // ── Fixed core (D1–D30) ──────────────────────────────────
  const fixed: SnapshotQuery[] = [
    // T1 — General reputation
    d(`best ${industry} companies to work for`),
    d(`top companies hiring ${role} in ${industry}`),
    d(`best companies for ${role}`),
    d(`I'm a ${role} looking for my next job in ${industry}, what companies should be on my radar`),
    d(`top rated ${industry} employers`),
    // T4 — Career growth
    d(`best ${industry} companies for career growth`),
    d(`${industry} companies with the best career development programs`),
    d(`where should I work if I want to grow my career in ${industry}`),
    // T2 — Compensation
    d(`highest paying ${industry} companies for ${role}`),
    d(`which ${industry} companies pay ${role} the best right now`),
    d(`best paying employers in ${industry}`),
    // T5 — Work-life balance
    d(`best ${industry} companies for work life balance`),
    d(`${industry} companies known for good work life balance`),
    d(`where should I work in ${industry} if I want work life balance`),
    // T3 — Culture
    d(`best ${industry} companies for company culture`),
    d(`which ${industry} companies have the best culture for ${role}`),
    d(`I want to work somewhere with great culture in ${industry}, what are my options`),
    // T6 — Innovation / technology
    d(`most innovative ${industry} companies to work for`),
    d(`${industry} companies known for cutting edge technology`),
    d(`best ${industry} companies for ${role} who want to work on interesting problems`),
    // T7 — Leadership / management
    d(`best managed ${industry} companies`),
    d(`${industry} companies with the best leadership`),
    // T8 — Diversity / inclusion
    d(`most diverse ${industry} companies to work for`),
    d(`${industry} companies with the best diversity and inclusion programs`),
    // T9 — Benefits / perks
    d(`best ${industry} companies for benefits and perks`),
    d(`which ${industry} companies have the best employee benefits`),
    // T10 — Remote / hybrid
    d(`best remote ${industry} companies for ${role}`),
    d(`${industry} companies that offer remote work for ${role}`),
    // T3 + T1 — Additional
    d(`which ${industry} companies have the happiest employees`),
    d(`I'm looking for a ${role} job at a company that treats employees well in ${industry}`),
  ];

  // ── Phrasing variants (D31–D45) ──────────────────────────
  const phrasings: SnapshotQuery[] = [
    d(`if I want to be a ${role} in ${industry}, which companies should be on my shortlist`),
    d(`what are the top ${industry} companies that ${role} recommend working at`),
    d(`companies in ${industry} where ${role} say they are happy`),
    d(`best ${industry} employers for someone early in their ${role} career`),
    d(`which ${industry} companies promote ${role} the fastest`),
    d(`${industry} companies with the best compensation packages for ${role}`),
    d(`what ${industry} companies should I avoid as a ${role}`),
    d(`most respected ${industry} companies to have on your resume`),
    d(`${industry} companies with the best engineering culture`),
    d(`where do the best ${role} in ${industry} work`),
    d(`top ${industry} companies for ${role} career opportunities right now`),
    d(`${industry} companies that invest in employee development`),
    d(`best ${industry} companies for women in ${role}`),
    d(`which companies in ${industry} have the best remote work policies`),
    d(`I'm a senior ${role} considering ${industry}, which companies stand out`),
  ];

  // ── Seniority variants (D46–D53) ─────────────────────────
  const seniority: SnapshotQuery[] = [
    d(`best ${industry} companies for junior ${role}`),
    d(`best ${industry} companies for senior ${role}`),
    d(`top ${industry} companies for ${role} managers`),
    d(`best places to work as a ${role} lead in ${industry}`),
    d(`${industry} companies hiring experienced ${role} right now`),
    d(`where should a mid-career ${role} work in ${industry}`),
    d(`best ${industry} companies for ${role} who want to move into management`),
    d(`top ${industry} companies for new grad ${role}`),
  ];

  // ── Conditional pool (D54–D65) ordered by priority ───────
  interface ConditionalTemplate {
    text: string;
    condition: () => boolean;
    priority: number;
  }

  const conditionals: ConditionalTemplate[] = [
    { text: `best ${niche} companies to work for`, condition: () => hasNiche, priority: 10 },
    { text: `top ${niche} companies for ${role}`, condition: () => hasNiche, priority: 10 },
    {
      text: `${niche} companies known for treating employees well`,
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `best companies to work for in ${niche} right now`,
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `best ${industry} companies to work for in ${geo}`,
      condition: () => hasGeo,
      priority: 8,
    },
    {
      text: `top ${industry} employers in ${geo} for ${role}`,
      condition: () => hasGeo,
      priority: 8,
    },
    { text: `${industry} companies hiring ${role} in ${geo}`, condition: () => hasGeo, priority: 7 },
    { text: `best Fortune 500 companies for ${role}`, condition: () => true, priority: 9 },
    { text: `most respected Fortune 500 employers in ${industry}`, condition: () => true, priority: 8 },
    {
      text: `best ${niche} startups to work for`,
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `which ${industry} companies in ${geo} have the best culture`,
      condition: () => hasGeo,
      priority: 7,
    },
    {
      text: `${industry} companies known for ${niche} that are great employers`,
      condition: () => hasNiche,
      priority: 8,
    },
  ];

  // ── Fallback pool (F1–F12) ────────────────────────────────
  const fallbacks: SnapshotQuery[] = [
    d(`which companies are considered the best employers in ${industry}`),
    d(`${industry} companies with the highest employee satisfaction`),
    d(`where do top ${role} talent go in ${industry}`),
    d(`${industry} companies that are great places to work`),
    d(`best ${industry} companies for ${role} compensation and equity`),
    d(`${industry} employers that ${role} rate highly`),
    d(`top ${industry} companies for work flexibility and remote options`),
    d(`which ${industry} companies are known for strong mentorship programs`),
    d(`best ${industry} companies for people who care about social impact`),
    d(`${industry} companies where ${role} say leadership is excellent`),
    d(`what are the fastest growing ${industry} companies to work for`),
    d(`${industry} companies with the strongest employer brand`),
  ];

  // ── Selection algorithm ───────────────────────────────────

  const base = [...fixed, ...phrasings, ...seniority]; // 53 queries

  // Fill 12 remaining slots from conditionals (eligible, sorted by priority desc).
  const eligible = conditionals
    .filter((c) => c.condition())
    .sort((a, b) => b.priority - a.priority);

  const selected: SnapshotQuery[] = [];
  for (const c of eligible) {
    if (selected.length >= 12) break;
    selected.push(d(c.text));
  }

  // If conditionals didn't fill all 12 slots, draw from fallback pool.
  let fallbackIdx = 0;
  while (selected.length < 12 && fallbackIdx < fallbacks.length) {
    selected.push(fallbacks[fallbackIdx++]);
  }

  return [...base, ...selected]; // exactly 65
}

// ─── Category 2: Competitor Contrast (18 queries) ────────────
//
// With 3+ competitors: top 3 each get 6 dimension queries = 18 total.
// With 2 competitors: each gets 6 dimension queries (12) + 6 phrasing variants.
// With 1 competitor: that competitor gets all 6 dimension queries + 12 phrasing variants.

function buildContrastQueries(
  prospectName: string,
  role: string,
  competitors: Array<{ name: string; domain: string }>,
): SnapshotQuery[] {
  const c = (text: string, competitorName: string): SnapshotQuery => ({
    text,
    category: "competitor_contrast",
    competitorName,
  });

  const c1 = competitors[0].name;

  // ── 6 dimension templates per competitor ─────────────────

  function sixDimensions(comp: string): SnapshotQuery[] {
    return [
      c(`should I work at ${prospectName} or ${comp}`, comp),
      c(`${prospectName} vs ${comp} for ${role}`, comp),
      c(`which company pays ${role} better, ${prospectName} or ${comp}`, comp),
      c(`is ${prospectName} or ${comp} better for career growth`, comp),
      c(`${prospectName} or ${comp}, which has better culture`, comp),
      c(`is the engineering better at ${prospectName} or ${comp}`, comp),
    ];
  }

  if (competitors.length >= 3) {
    // Full coverage: 3 × 6 = 18
    const comp3 = competitors[2].name;
    return [
      ...sixDimensions(c1),
      ...sixDimensions(competitors[1].name),
      c(`I'm deciding between ${prospectName} and ${comp3}, what should I know`, comp3),
      c(`${prospectName} vs ${comp3} for ${role}`, comp3),
      c(`does ${prospectName} or ${comp3} pay ${role} better`, comp3),
      c(`${prospectName} vs ${comp3} for career growth opportunities`, comp3),
      c(`is the culture better at ${prospectName} or ${comp3}`, comp3),
      c(`${prospectName} or ${comp3} for ${role}, which is more innovative`, comp3),
    ];
  }

  if (competitors.length === 2) {
    const c2 = competitors[1].name;
    // 6 + 6 = 12 dimension queries, then 6 phrasing variants split evenly.
    return [
      ...sixDimensions(c1),
      ...sixDimensions(c2),
      // 6 phrasing variants — 3 per competitor
      c(`I'm choosing between ${prospectName} and ${c1} for a ${role} role`, c1),
      c(`${prospectName} or ${c1}, which is the better fit for a ${role}`, c1),
      c(`which company has better technology, ${prospectName} or ${c1}`, c1),
      c(`I'm deciding between ${prospectName} and ${c2}, what should I know`, c2),
      c(`${prospectName} or ${c2}, which is the better fit for a ${role}`, c2),
      c(`which company has better technology, ${prospectName} or ${c2}`, c2),
    ];
  }

  // Single competitor: 6 dimension queries + 12 phrasing variants = 18
  return [
    ...sixDimensions(c1),
    c(`I'm deciding between ${prospectName} and ${c1}, what should I know`, c1),
    c(`${prospectName} or ${c1}, which is the better fit for a ${role}`, c1),
    c(`which company has better technology, ${prospectName} or ${c1}`, c1),
    c(`I'm choosing between ${prospectName} and ${c1} for a ${role} role`, c1),
    c(`${c1} vs ${prospectName}, which is better for ${role} engineers`, c1),
    c(`comparing ${prospectName} and ${c1} as employers`, c1),
    c(`${prospectName} or ${c1} — where would a ${role} be happier`, c1),
    c(`is ${c1} a step up from ${prospectName} for a ${role}`, c1),
    c(`${prospectName} benefits vs ${c1} benefits`, c1),
    c(`does ${c1} or ${prospectName} invest more in ${role} development`, c1),
    c(`which is more respected in ${role} circles, ${prospectName} or ${c1}`, c1),
    c(`${prospectName} or ${c1} for work life balance`, c1),
  ];
}

// ─── Category 3: Reputation Probe (10 queries) ───────────────

function buildReputationQueries(prospectName: string, role: string, industry: string): SnapshotQuery[] {
  const r = (text: string): SnapshotQuery => ({ text, category: "reputation" });
  return [
    r(`what is it like to work at ${prospectName}`),
    r(`is ${prospectName} a good company to work for`),
    r(`${prospectName} reviews as an employer`),
    r(`what do current employees say about ${prospectName}`),
    r(`${prospectName} culture and work environment`),
    r(`pros and cons of working at ${prospectName}`),
    r(`should I accept a job offer from ${prospectName}`),
    r(`${prospectName} employer reputation in ${industry}`),
    r(`what is ${prospectName} known for as an employer`),
    r(`${prospectName} career opportunities for ${role}`),
  ];
}

// ─── Category 4: Citation & Source Probe (7 queries) ─────────
//
// S2 uses the engineering blog variant for engineering / technical roles
// and falls back to the generic careers blog variant for all other roles.

function buildCitationProbeQueries(
  prospectName: string,
  roleTitle: string,
  competitors: Array<{ name: string; domain: string }>,
): SnapshotQuery[] {
  const s = (text: string): SnapshotQuery => ({ text, category: "citation_source" });

  const s2Text = isEngineeringRole(roleTitle)
    ? `${prospectName} engineering blog and tech culture`
    : `${prospectName} company culture and careers blog`;

  const comp1Name = competitors[0].name;

  return [
    s(`${prospectName} careers and employer reputation`),
    s(s2Text),
    s(`${prospectName} employee reviews and company culture`),
    s(`${prospectName} careers page and job opportunities`),
    s(`${prospectName} employer brand and hiring`),
    s(`what sources describe ${prospectName} as an employer`),
    s(`${prospectName} vs ${comp1Name} employer reputation sources`),
  ];
}

// ─── Main function ───────────────────────────────────────────

/**
 * Generate exactly 100 snapshot queries across 4 categories.
 *
 * Category breakdown:
 *   65  discovery          — list and recommendation queries that never mention the prospect
 *   18  competitor_contrast — head-to-head across top 3 competitors × 6 dimensions
 *   10  reputation          — direct employer perception probes
 *    7  citation_source     — triggers web citations for content gap analysis
 *
 * No LLM call is made — pure template substitution.
 *
 * @param input.competitors  Pass at least 3 for full 3×6 contrast coverage.
 *   Fallbacks:
 *   - 2 competitors: 12 dimension queries + 6 phrasing variants = 18
 *   - 1 competitor: 6 dimension queries + 12 phrasing variants = 18
 *   Only the first 3 are used regardless of how many are passed.
 */
export function generateSnapshotQueries(input: SnapshotQueryInput): SnapshotQuery[] {
  const { prospectName, industry, roleTitle, competitors, nicheKeywords, geography } = input;

  return [
    ...buildDiscoveryQueries(industry, roleTitle, nicheKeywords, geography),
    ...buildContrastQueries(prospectName, roleTitle, competitors),
    ...buildReputationQueries(prospectName, roleTitle, industry),
    ...buildCitationProbeQueries(prospectName, roleTitle, competitors),
  ];
}
