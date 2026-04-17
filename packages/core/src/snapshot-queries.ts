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

export type DiscoveryTheme =
  | "general reputation"
  | "compensation"
  | "culture"
  | "career growth"
  | "work-life balance"
  | "remote & hybrid"
  | "diversity & inclusion"
  | "innovation"
  | "leadership"
  | "benefits";

export interface SnapshotQuery {
  text: string;
  category: "discovery" | "competitor_contrast" | "reputation" | "citation_source";
  /** Which competitor this query targets (contrast queries only). */
  competitorName?: string;
  /**
   * Theme tag for discovery queries — used by computeSnapshotSummary to build
   * themeBreakdown without falling back to keyword inference.
   * Required on all discovery queries (v2 shape).
   */
  theme?: DiscoveryTheme;
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

function d(text: string, theme: DiscoveryTheme = "general reputation"): SnapshotQuery {
  return { text, category: "discovery", theme };
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
    d(`best ${industry} companies to work for`, "general reputation"),
    d(`top companies hiring ${role} in ${industry}`, "general reputation"),
    d(`best companies for ${role}`, "general reputation"),
    d(`I'm a ${role} looking for my next job in ${industry}, what companies should be on my radar`, "general reputation"),
    d(`top rated ${industry} employers`, "general reputation"),
    // T4 — Career growth
    d(`best ${industry} companies for career growth`, "career growth"),
    d(`${industry} companies with the best career development programs`, "career growth"),
    d(`where should I work if I want to grow my career in ${industry}`, "career growth"),
    // T2 — Compensation
    d(`highest paying ${industry} companies for ${role}`, "compensation"),
    d(`which ${industry} companies pay ${role} the best right now`, "compensation"),
    d(`best paying employers in ${industry}`, "compensation"),
    // T5 — Work-life balance
    d(`best ${industry} companies for work life balance`, "work-life balance"),
    d(`${industry} companies known for good work life balance`, "work-life balance"),
    d(`where should I work in ${industry} if I want work life balance`, "work-life balance"),
    // T3 — Culture
    d(`best ${industry} companies for company culture`, "culture"),
    d(`which ${industry} companies have the best culture for ${role}`, "culture"),
    d(`I want to work somewhere with great culture in ${industry}, what are my options`, "culture"),
    // T6 — Innovation / technology
    d(`most innovative ${industry} companies to work for`, "innovation"),
    d(`${industry} companies known for cutting edge technology`, "innovation"),
    d(`best ${industry} companies for ${role} who want to work on interesting problems`, "innovation"),
    // T7 — Leadership / management
    d(`best managed ${industry} companies`, "leadership"),
    d(`${industry} companies with the best leadership`, "leadership"),
    // T8 — Diversity / inclusion
    d(`most diverse ${industry} companies to work for`, "diversity & inclusion"),
    d(`${industry} companies with the best diversity and inclusion programs`, "diversity & inclusion"),
    // T9 — Benefits / perks
    d(`best ${industry} companies for benefits and perks`, "benefits"),
    d(`which ${industry} companies have the best employee benefits`, "benefits"),
    // T10 — Remote / hybrid
    d(`best remote ${industry} companies for ${role}`, "remote & hybrid"),
    d(`${industry} companies that offer remote work for ${role}`, "remote & hybrid"),
    // T3 + T1 — Additional
    d(`which ${industry} companies have the happiest employees`, "culture"),
    d(`I'm looking for a ${role} job at a company that treats employees well in ${industry}`, "general reputation"),
  ];

  // ── Phrasing variants (D31–D45) ──────────────────────────
  const phrasings: SnapshotQuery[] = [
    d(`if I want to be a ${role} in ${industry}, which companies should be on my shortlist`, "general reputation"),
    d(`what are the top ${industry} companies that ${role} recommend working at`, "general reputation"),
    d(`companies in ${industry} where ${role} say they are happy`, "culture"),
    d(`best ${industry} employers for someone early in their ${role} career`, "career growth"),
    d(`which ${industry} companies promote ${role} the fastest`, "career growth"),
    d(`${industry} companies with the best compensation packages for ${role}`, "compensation"),
    d(`what ${industry} companies should I avoid as a ${role}`, "general reputation"),
    d(`most respected ${industry} companies to have on your resume`, "general reputation"),
    d(`${industry} companies with the best engineering culture`, "innovation"),
    d(`where do the best ${role} in ${industry} work`, "general reputation"),
    d(`top ${industry} companies for ${role} career opportunities right now`, "career growth"),
    d(`${industry} companies that invest in employee development`, "career growth"),
    d(`best ${industry} companies for women in ${role}`, "diversity & inclusion"),
    d(`which companies in ${industry} have the best remote work policies`, "remote & hybrid"),
    d(`I'm a senior ${role} considering ${industry}, which companies stand out`, "general reputation"),
  ];

  // ── Seniority variants (D46–D53) ─────────────────────────
  const seniority: SnapshotQuery[] = [
    d(`best ${industry} companies for junior ${role}`, "career growth"),
    d(`best ${industry} companies for senior ${role}`, "career growth"),
    d(`top ${industry} companies for ${role} managers`, "career growth"),
    d(`best places to work as a ${role} lead in ${industry}`, "career growth"),
    d(`${industry} companies hiring experienced ${role} right now`, "general reputation"),
    d(`where should a mid-career ${role} work in ${industry}`, "general reputation"),
    d(`best ${industry} companies for ${role} who want to move into management`, "career growth"),
    d(`top ${industry} companies for new grad ${role}`, "career growth"),
  ];

  // ── Conditional pool (D54–D65) ordered by priority ───────
  interface ConditionalTemplate {
    text: string;
    theme: DiscoveryTheme;
    condition: () => boolean;
    priority: number;
  }

  const conditionals: ConditionalTemplate[] = [
    { text: `best ${niche} companies to work for`, theme: "general reputation", condition: () => hasNiche, priority: 10 },
    { text: `top ${niche} companies for ${role}`, theme: "general reputation", condition: () => hasNiche, priority: 10 },
    {
      text: `${niche} companies known for treating employees well`,
      theme: "culture",
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `best companies to work for in ${niche} right now`,
      theme: "general reputation",
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `best ${industry} companies to work for in ${geo}`,
      theme: "general reputation",
      condition: () => hasGeo,
      priority: 8,
    },
    {
      text: `top ${industry} employers in ${geo} for ${role}`,
      theme: "general reputation",
      condition: () => hasGeo,
      priority: 8,
    },
    { text: `${industry} companies hiring ${role} in ${geo}`, theme: "general reputation", condition: () => hasGeo, priority: 7 },
    { text: `best Fortune 500 companies for ${role}`, theme: "general reputation", condition: () => true, priority: 9 },
    { text: `most respected Fortune 500 employers in ${industry}`, theme: "general reputation", condition: () => true, priority: 8 },
    {
      text: `best ${niche} startups to work for`,
      theme: "general reputation",
      condition: () => hasNiche,
      priority: 9,
    },
    {
      text: `which ${industry} companies in ${geo} have the best culture`,
      theme: "culture",
      condition: () => hasGeo,
      priority: 7,
    },
    {
      text: `${industry} companies known for ${niche} that are great employers`,
      theme: "general reputation",
      condition: () => hasNiche,
      priority: 8,
    },
  ];

  // ── Fallback pool (F1–F12) ────────────────────────────────
  const fallbacks: SnapshotQuery[] = [
    d(`which companies are considered the best employers in ${industry}`, "general reputation"),
    d(`${industry} companies with the highest employee satisfaction`, "culture"),
    d(`where do top ${role} talent go in ${industry}`, "general reputation"),
    d(`${industry} companies that are great places to work`, "culture"),
    d(`best ${industry} companies for ${role} compensation and equity`, "compensation"),
    d(`${industry} employers that ${role} rate highly`, "general reputation"),
    d(`top ${industry} companies for work flexibility and remote options`, "remote & hybrid"),
    d(`which ${industry} companies are known for strong mentorship programs`, "career growth"),
    d(`best ${industry} companies for people who care about social impact`, "diversity & inclusion"),
    d(`${industry} companies where ${role} say leadership is excellent`, "leadership"),
    d(`what are the fastest growing ${industry} companies to work for`, "general reputation"),
    d(`${industry} companies with the strongest employer brand`, "general reputation"),
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
    selected.push(d(c.text, c.theme));
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
