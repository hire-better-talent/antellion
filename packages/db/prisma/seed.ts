import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Organization ────────────────────────────────────────────

  const org = await prisma.organization.upsert({
    where: { slug: "antellion-demo" },
    update: {},
    create: {
      name: "Antellion Demo",
      slug: "antellion-demo",
    },
  });

  // ── User ────────────────────────────────────────────────────

  const user = await prisma.user.upsert({
    where: { email: "demo@antellion.dev" },
    update: {},
    create: {
      organizationId: org.id,
      email: "demo@antellion.dev",
      name: "Alex Chen",
      role: "OWNER",
    },
  });

  // ── Client ──────────────────────────────────────────────────

  const client = await prisma.client.upsert({
    where: {
      organizationId_domain: {
        organizationId: org.id,
        domain: "meridiantech.com",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Meridian Technologies",
      domain: "meridiantech.com",
      industry: "Enterprise Software",
      description:
        "Meridian Technologies is a mid-market enterprise software company (~2,000 employees) " +
        "headquartered in Austin, TX. They build supply chain optimization and logistics " +
        "intelligence products for Fortune 500 manufacturers. Engineering org is ~400 people " +
        "across platform, data, and product teams. Recently raised Series D and are scaling " +
        "their AI/ML capabilities.",
    },
  });

  // ── Competitors ─────────────────────────────────────────────

  const [competitor1, competitor2, competitor3, competitor4] = await Promise.all([
    prisma.competitor.upsert({
      where: {
        clientId_domain: { clientId: client.id, domain: "apexcloudsystems.com" },
      },
      update: {},
      create: {
        clientId: client.id,
        name: "Apex Cloud Systems",
        domain: "apexcloudsystems.com",
        industry: "Enterprise Software",
        description:
          "Direct competitor in supply chain SaaS. Larger engineering org (~800), " +
          "strong Glassdoor presence (4.2 rating), known for competitive compensation " +
          "and remote-first culture. Heavy investment in employer branding content.",
      },
    }),
    prisma.competitor.upsert({
      where: {
        clientId_domain: { clientId: client.id, domain: "novabridge.io" },
      },
      update: {},
      create: {
        clientId: client.id,
        name: "NovaBridge Analytics",
        domain: "novabridge.io",
        industry: "Data & Analytics",
        description:
          "Competing for the same ML/data engineering talent. Smaller (~500 employees) " +
          "but strong technical reputation. Active engineering blog, open-source " +
          "contributions, and conference presence. Positioned as a technical-culture company.",
      },
    }),
    prisma.competitor.upsert({
      where: {
        clientId_domain: { clientId: client.id, domain: "velochain.com" },
      },
      update: {},
      create: {
        clientId: client.id,
        name: "VeloChain",
        domain: "velochain.com",
        industry: "Supply Chain Technology",
        description:
          "Fast-growing supply chain visibility platform. ~350 employees, Series C. " +
          "Strong presence on Built In and Wellfound. Aggressive hiring in Austin and " +
          "Denver. Known for transparent compensation and equity packages.",
      },
    }),
    prisma.competitor.upsert({
      where: {
        clientId_domain: { clientId: client.id, domain: "forgehq.io" },
      },
      update: {},
      create: {
        clientId: client.id,
        name: "Forge Industrial",
        domain: "forgehq.io",
        industry: "Industrial Technology",
        description:
          "Industrial IoT and logistics platform. ~600 employees. Weaker employer " +
          "brand but competitive on compensation. Limited online presence beyond " +
          "LinkedIn and Indeed listings.",
      },
    }),
  ]);

  // ── Role Profiles ───────────────────────────────────────────
  // Clean up existing data for idempotent re-runs

  await prisma.scanResult.deleteMany({ where: { scanRun: { clientId: client.id } } });
  await prisma.scanRun.deleteMany({ where: { clientId: client.id } });
  await prisma.query.deleteMany({ where: { queryCluster: { clientId: client.id } } });
  await prisma.queryCluster.deleteMany({ where: { clientId: client.id } });
  await prisma.roleProfile.deleteMany({ where: { clientId: client.id } });

  const [backendRole, mlRole] = await Promise.all([
    prisma.roleProfile.create({
      data: {
        clientId: client.id,
        title: "Senior Backend Engineer",
        department: "Platform Engineering",
        seniority: "Senior",
        description:
          "Core platform team building high-throughput data pipelines and APIs " +
          "for supply chain optimization. Go and TypeScript stack, event-driven architecture.",
      },
    }),
    prisma.roleProfile.create({
      data: {
        clientId: client.id,
        title: "ML Engineer",
        department: "AI/ML",
        seniority: "Mid-Senior",
        description:
          "Applied ML team building demand forecasting and route optimization models. " +
          "Python/PyTorch stack, deploying to production at scale. New team, high visibility.",
      },
    }),
  ]);

  // ── Query Clusters & Queries ────────────────────────────────
  // 6 clusters covering all assessment themes, 36 queries total

  const allCompetitors = [
    { name: competitor1.name, domain: competitor1.domain },
    { name: competitor2.name, domain: competitor2.domain },
    { name: competitor3.name, domain: competitor3.domain },
    { name: competitor4.name, domain: competitor4.domain },
  ];

  const engineeringCulture = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: backendRole.id,
      name: "Engineering Culture & Reputation",
      intent: "Candidate evaluating engineering team quality and culture",
      reviewStatus: "NEEDS_REVISION",
      reviewNotes:
        "Broad discovery prompts still over-index on ambient employer brand. Tighten before a report-bound rerun.",
      queries: {
        create: [
          { text: "best enterprise software companies for backend engineers in Austin", intent: "Geographic + role discovery" },
          { text: "companies with strong engineering culture in supply chain tech", intent: "Domain-specific culture evaluation" },
          { text: "what is it like to work as an engineer at Meridian Technologies", intent: "Direct employer research" },
          { text: "top engineering teams at mid-size enterprise software companies", intent: "Team quality evaluation" },
          { text: "best tech companies to work for in Austin Texas 2025", intent: "Geographic employer ranking" },
          { text: "enterprise software companies known for great developer experience", intent: "DevEx culture evaluation" },
        ],
      },
    },
    include: { queries: true },
  });

  const compensationPerks = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: backendRole.id,
      name: "Compensation & Benefits",
      intent: "Candidate evaluating pay, equity, and total rewards",
      reviewStatus: "NEEDS_REVISION",
      reviewNotes:
        "Strategically important gap area, but several prompts are still broad market lookups instead of Meridian-diagnostic comparisons.",
      queries: {
        create: [
          { text: "senior backend engineer salary enterprise SaaS Austin Texas", intent: "Compensation benchmarking" },
          { text: "best paying enterprise software companies for engineers", intent: "Compensation ranking" },
          { text: "companies with strong equity packages for mid-career engineers", intent: "Equity evaluation" },
          { text: "enterprise software companies with best engineering benefits", intent: "Benefits comparison" },
          { text: "how does Meridian Technologies compensation compare to competitors", intent: "Direct comp comparison" },
          { text: "supply chain tech companies that pay engineers well", intent: "Domain-specific comp" },
        ],
      },
    },
    include: { queries: true },
  });

  const hiringProcess = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: backendRole.id,
      name: "Hiring Process & Candidate Experience",
      intent: "Candidate evaluating the interview and hiring process",
      reviewStatus: "APPROVED",
      reviewNotes:
        "Strong direct and comparative coverage. Good enough for current scan use.",
      reviewedById: user.id,
      reviewedAt: new Date("2026-05-03T14:00:00Z"),
      queries: {
        create: [
          { text: "what is the interview process like at Meridian Technologies", intent: "Direct process inquiry" },
          { text: "enterprise software companies with fast hiring processes", intent: "Speed evaluation" },
          { text: "best interview experiences at Austin tech companies", intent: "Candidate experience ranking" },
          { text: "how long does it take to get hired at supply chain tech companies", intent: "Timeline benchmarking" },
          { text: "companies with transparent engineering interview processes", intent: "Transparency evaluation" },
          { text: "backend engineer interview questions at enterprise SaaS companies", intent: "Interview prep" },
        ],
      },
    },
    include: { queries: true },
  });

  const roleExpectations = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: backendRole.id,
      name: "Role Expectations & Impact",
      intent: "Candidate evaluating scope, autonomy, and impact of the role",
      reviewStatus: "APPROVED",
      reviewNotes:
        "Strong technical and ownership-oriented prompts. Fit for Meridian’s positioning.",
      reviewedById: user.id,
      reviewedAt: new Date("2026-05-03T14:00:00Z"),
      queries: {
        create: [
          { text: "what do backend engineers work on at supply chain software companies", intent: "Scope evaluation" },
          { text: "companies where engineers have high impact on product", intent: "Impact assessment" },
          { text: "best enterprise software companies for engineers who want ownership", intent: "Autonomy evaluation" },
          { text: "day in the life of an engineer at a supply chain tech company", intent: "Role clarity" },
          { text: "enterprise software companies with interesting technical challenges", intent: "Technical interest" },
          { text: "companies building AI-powered supply chain products for engineers", intent: "Technical domain interest" },
        ],
      },
    },
    include: { queries: true },
  });

  const cultureValues = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: mlRole.id,
      name: "Culture & Work-Life Balance",
      intent: "Candidate evaluating workplace culture, DEI, and work-life balance",
      reviewStatus: "NEEDS_REVISION",
      reviewNotes:
        "Important theme, but current prompts are too generic and competitor-biased for client-facing use.",
      queries: {
        create: [
          { text: "is Meridian Technologies a diverse workplace", intent: "DEI evaluation" },
          { text: "work-life balance at enterprise software companies in Austin", intent: "WLB assessment" },
          { text: "best company cultures in supply chain technology", intent: "Culture ranking" },
          { text: "remote work policies at mid-size enterprise software companies", intent: "Remote policy" },
          { text: "enterprise software companies with inclusive engineering teams", intent: "Inclusion assessment" },
          { text: "companies with good work-life balance for ML engineers", intent: "WLB for ML roles" },
        ],
      },
    },
    include: { queries: true },
  });

  const competitorComparison = await prisma.queryCluster.create({
    data: {
      clientId: client.id,
      roleProfileId: mlRole.id,
      name: "Competitor Comparison",
      intent: "Candidate directly comparing employers",
      reviewStatus: "APPROVED",
      reviewNotes:
        "Useful comparative framing with a few broad prompts still worth tightening later.",
      reviewedById: user.id,
      reviewedAt: new Date("2026-05-03T14:00:00Z"),
      queries: {
        create: [
          { text: "should I work at Meridian Technologies or Apex Cloud Systems", intent: "Head-to-head comparison" },
          { text: "Meridian Technologies vs NovaBridge Analytics for ML engineers", intent: "ML role comparison" },
          { text: "best supply chain tech companies to work for compared", intent: "Industry employer ranking" },
          { text: "how does Meridian Technologies compare to other Austin tech companies", intent: "Local market comparison" },
          { text: "top employers in logistics and supply chain technology", intent: "Industry employer discovery" },
          { text: "mid-size enterprise software companies vs startups for engineers", intent: "Stage comparison" },
        ],
      },
    },
    include: { queries: true },
  });

  // ── Content Assets ──────────────────────────────────────────

  await Promise.all([
    prisma.contentAsset.upsert({
      where: {
        clientId_url: { clientId: client.id, url: "https://meridiantech.com/careers" },
      },
      update: {},
      create: {
        clientId: client.id,
        url: "https://meridiantech.com/careers",
        title: "Careers at Meridian Technologies",
        assetType: "CAREERS_PAGE",
      },
    }),
    prisma.contentAsset.upsert({
      where: {
        clientId_url: { clientId: client.id, url: "https://meridiantech.com/blog/engineering" },
      },
      update: {},
      create: {
        clientId: client.id,
        url: "https://meridiantech.com/blog/engineering",
        title: "Meridian Engineering Blog",
        assetType: "BLOG_POST",
      },
    }),
  ]);

  // ── Completed Scan Run with Realistic Results ─────────────
  //
  // Target narrative:
  //   - Meridian: ~47% mention rate (moderate — urgency without hopelessness)
  //   - Apex Cloud: ~75% (the dominant competitor — the "wake-up call")
  //   - NovaBridge: ~58% (ahead, technical reputation advantage)
  //   - VeloChain: ~42% (similar to Meridian — peer benchmark)
  //   - Forge Industrial: ~28% (behind — proof that worse is possible)
  //
  // Theme-level story:
  //   - Role Expectations & Hiring Process: Meridian strong (67-83%)
  //   - Engineering Culture: Meridian moderate (50%)
  //   - Compensation: Meridian weak (17%)
  //   - Culture & WLB: Meridian weak (17%)
  //   - Competitor Comparison: Meridian moderate (50%)
  //
  // Citation story:
  //   - Shared: glassdoor.com, linkedin.com, indeed.com
  //   - Client-exclusive: meridiantech.com/blog, stackoverflow.com
  //   - Gap sources: levels.fyi, builtin.com, teamblind.com, comparably.com,
  //                  wellfound.com, blind.com, techcrunch.com

  const allQueries = [
    ...engineeringCulture.queries,
    ...compensationPerks.queries,
    ...hiringProcess.queries,
    ...roleExpectations.queries,
    ...cultureValues.queries,
    ...competitorComparison.queries,
  ];

  const scanRun = await prisma.scanRun.create({
    data: {
      clientId: client.id,
      triggeredById: user.id,
      status: "COMPLETED",
      model: "gpt-4o",
      queryCount: allQueries.length,
      resultCount: allQueries.length,
      startedAt: new Date("2026-03-15T09:00:00Z"),
      completedAt: new Date("2026-03-15T09:45:00Z"),
    },
  });

  // Define per-query scan result data for the narrative
  // Each entry: [clusterName, queryIndex, mentioned, visScore, sentScore, citeDomains[], competitorsMentioned]
  type ResultSpec = {
    queryId: string;
    mentioned: boolean;
    visibilityScore: number;
    sentimentScore: number;
    citations: string[];
    competitorsMentioned: string[]; // domains of competitors mentioned
    response: string;
  };

  // Helper to build competitor mention metadata
  function buildCompMentions(mentionedDomains: string[]) {
    return allCompetitors.map((c) => ({
      name: c.name,
      domain: c.domain,
      mentioned: mentionedDomains.includes(c.domain),
    }));
  }

  // ── Engineering Culture & Reputation (Meridian: 3/6 = 50%) ──
  const cultureResults: ResultSpec[] = [
    {
      queryId: engineeringCulture.queries[0].id, // "best enterprise software companies for backend engineers in Austin"
      mentioned: true, visibilityScore: 62, sentimentScore: 0.5,
      citations: ["glassdoor.com", "linkedin.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Austin has a growing enterprise software scene. Notable companies for backend engineers include Apex Cloud Systems, known for competitive compensation and a remote-first engineering culture. Meridian Technologies is building a platform engineering team focused on supply chain optimization with a Go and TypeScript stack. VeloChain is another option, offering strong equity packages. Sources: Glassdoor, LinkedIn, Built In Austin.",
    },
    {
      queryId: engineeringCulture.queries[1].id, // "companies with strong engineering culture in supply chain tech"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "builtin.com", "comparably.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io", "velochain.com"],
      response: "Several companies stand out for engineering culture in supply chain technology. Apex Cloud Systems has invested heavily in developer experience and maintains a 4.2 Glassdoor rating. NovaBridge Analytics is known for open-source contributions and conference presence. VeloChain has built a reputation for technical transparency. Sources: Glassdoor, Built In, Comparably.",
    },
    {
      queryId: engineeringCulture.queries[2].id, // "what is it like to work as an engineer at Meridian Technologies"
      mentioned: true, visibilityScore: 72, sentimentScore: 0.6,
      citations: ["glassdoor.com", "linkedin.com", "meridiantech.com"],
      competitorsMentioned: [],
      response: "Meridian Technologies is a mid-market enterprise software company in Austin building supply chain optimization products. Engineers report working on high-throughput data pipelines and event-driven architecture. The engineering blog highlights technical challenges in logistics intelligence. The company recently raised Series D and is scaling their AI/ML capabilities. Overall sentiment is positive, with engineers noting the balance of technical depth and product impact. Sources: Glassdoor, LinkedIn, Meridian Engineering Blog.",
    },
    {
      queryId: engineeringCulture.queries[3].id, // "top engineering teams at mid-size enterprise software companies"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["builtin.com", "levels.fyi", "glassdoor.com", "teamblind.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "Mid-size enterprise software companies with strong engineering reputations include Apex Cloud Systems, which has an 800-person engineering org with a focus on developer experience. NovaBridge Analytics is smaller but punches above its weight with active open-source contributions and a strong conference presence. Both are frequently mentioned on engineering forums. Sources: Built In, Levels.fyi, Glassdoor, Blind.",
    },
    {
      queryId: engineeringCulture.queries[4].id, // "best tech companies to work for in Austin Texas 2025"
      mentioned: true, visibilityScore: 45, sentimentScore: 0.4,
      citations: ["glassdoor.com", "builtin.com", "indeed.com", "comparably.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Austin continues to grow as a tech hub. Top employers for 2025 include well-known names alongside emerging players. In enterprise software and supply chain tech, Apex Cloud Systems leads with strong ratings across review sites. Meridian Technologies and VeloChain are also mentioned as growing employers in the space, though with less coverage on employer review platforms. Sources: Glassdoor, Built In, Indeed, Comparably.",
    },
    {
      queryId: engineeringCulture.queries[5].id, // "enterprise software companies known for great developer experience"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["levels.fyi", "teamblind.com", "glassdoor.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "Companies known for great developer experience tend to invest in internal tooling, documentation, and engineering culture. Apex Cloud Systems is frequently cited for their DevEx team and internal platform investments. NovaBridge Analytics is known for engineering autonomy and open-source-first culture. Sources: Levels.fyi, Blind, Glassdoor.",
    },
  ];

  // ── Compensation & Benefits (Meridian: 1/6 = 17% — the weak spot) ──
  const compResults: ResultSpec[] = [
    {
      queryId: compensationPerks.queries[0].id, // "senior backend engineer salary enterprise SaaS Austin Texas"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["levels.fyi", "glassdoor.com", "comparably.com", "payscale.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Senior backend engineers in enterprise SaaS in Austin typically earn $165K-$210K base, with total compensation including equity ranging from $200K-$300K. Apex Cloud Systems is among the higher-paying employers in this segment, with reported total comp around $250K for senior roles. VeloChain offers competitive equity packages for their stage. Sources: Levels.fyi, Glassdoor, Comparably, PayScale.",
    },
    {
      queryId: compensationPerks.queries[1].id, // "best paying enterprise software companies for engineers"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["levels.fyi", "teamblind.com", "glassdoor.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "The best-paying enterprise software companies for engineers tend to be those with strong venture funding or public market presence. Apex Cloud Systems is frequently mentioned for competitive compensation. NovaBridge Analytics, while smaller, offers strong equity packages that can rival larger companies for early-to-mid career engineers. Sources: Levels.fyi, Blind, Glassdoor.",
    },
    {
      queryId: compensationPerks.queries[2].id, // "companies with strong equity packages for mid-career engineers"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["levels.fyi", "wellfound.com", "teamblind.com"],
      competitorsMentioned: ["novabridge.io", "velochain.com"],
      response: "For mid-career engineers seeking strong equity, growth-stage companies often offer the best risk-adjusted packages. NovaBridge Analytics and VeloChain are both frequently mentioned for meaningful equity grants at the IC3-IC4 level. Sources: Levels.fyi, Wellfound, Blind.",
    },
    {
      queryId: compensationPerks.queries[3].id, // "enterprise software companies with best engineering benefits"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "comparably.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Engineering benefits at enterprise software companies vary widely. Apex Cloud Systems stands out for remote-first flexibility, generous PTO, and learning stipends. Most mid-market enterprise companies offer standard benefits packages. Sources: Glassdoor, Comparably, Built In.",
    },
    {
      queryId: compensationPerks.queries[4].id, // "how does Meridian Technologies compensation compare to competitors"
      mentioned: true, visibilityScore: 38, sentimentScore: -0.1,
      citations: ["glassdoor.com", "indeed.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Limited data is available on Meridian Technologies compensation specifically. Based on available Glassdoor reviews, the company appears to offer competitive base salaries for Austin, but there is less transparency around equity and total compensation compared to competitors like Apex Cloud Systems. Some reviews suggest benefits are standard but not standout. Sources: Glassdoor, Indeed.",
    },
    {
      queryId: compensationPerks.queries[5].id, // "supply chain tech companies that pay engineers well"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["levels.fyi", "glassdoor.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "In supply chain technology, Apex Cloud Systems leads on compensation with total packages around $250K for senior engineers. VeloChain is competitive for their stage, particularly on equity. Sources: Levels.fyi, Glassdoor, Built In.",
    },
  ];

  // ── Hiring Process (Meridian: 5/6 = 83% — a strength) ──
  const hiringResults: ResultSpec[] = [
    {
      queryId: hiringProcess.queries[0].id,
      mentioned: true, visibilityScore: 75, sentimentScore: 0.7,
      citations: ["glassdoor.com", "linkedin.com"],
      competitorsMentioned: [],
      response: "The interview process at Meridian Technologies typically involves a recruiter screen, a technical phone screen, and a virtual onsite with 3-4 rounds covering system design, coding, and a culture conversation. Candidates report the process takes about 2-3 weeks, which is faster than many enterprise companies. Sources: Glassdoor, LinkedIn.",
    },
    {
      queryId: hiringProcess.queries[1].id,
      mentioned: true, visibilityScore: 55, sentimentScore: 0.5,
      citations: ["glassdoor.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Enterprise software companies with fast hiring include Apex Cloud Systems (typically 3-4 weeks) and Meridian Technologies (2-3 weeks). VeloChain, as a smaller company, can move even faster for senior roles. Sources: Glassdoor, Built In.",
    },
    {
      queryId: hiringProcess.queries[2].id,
      mentioned: true, visibilityScore: 60, sentimentScore: 0.6,
      citations: ["glassdoor.com", "indeed.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Austin tech companies generally receive positive interview reviews. Meridian Technologies candidates highlight clear communication and relevant technical questions. Apex Cloud Systems receives praise for their structured process but some note it can be lengthy. Sources: Glassdoor, Indeed.",
    },
    {
      queryId: hiringProcess.queries[3].id,
      mentioned: true, visibilityScore: 50, sentimentScore: 0.4,
      citations: ["glassdoor.com", "linkedin.com", "indeed.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com", "forgehq.io"],
      response: "Hiring timelines at supply chain tech companies vary. Meridian Technologies averages 2-3 weeks. Apex Cloud Systems takes 3-4 weeks. VeloChain can be faster at 1-2 weeks for senior roles. Forge Industrial tends to be slower at 4-6 weeks. Sources: Glassdoor, LinkedIn, Indeed.",
    },
    {
      queryId: hiringProcess.queries[4].id,
      mentioned: true, visibilityScore: 65, sentimentScore: 0.6,
      citations: ["glassdoor.com", "meridiantech.com"],
      competitorsMentioned: ["novabridge.io"],
      response: "Companies with transparent engineering interviews include NovaBridge Analytics, which publishes their interview guide. Meridian Technologies shares expectations in their engineering blog and provides a clear rubric to candidates. Sources: Glassdoor, Meridian Technologies Blog.",
    },
    {
      queryId: hiringProcess.queries[5].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "leetcode.com", "levels.fyi"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Backend engineer interviews at enterprise SaaS companies typically include system design, coding challenges, and behavioral rounds. Apex Cloud Systems is known for practical, project-based assessments rather than algorithmic puzzles. Sources: Glassdoor, LeetCode, Levels.fyi.",
    },
  ];

  // ── Role Expectations & Impact (Meridian: 4/6 = 67% — moderate-strong) ──
  const roleResults: ResultSpec[] = [
    {
      queryId: roleExpectations.queries[0].id,
      mentioned: true, visibilityScore: 70, sentimentScore: 0.6,
      citations: ["glassdoor.com", "linkedin.com", "meridiantech.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Backend engineers at supply chain software companies work on data pipelines, API services, and integration layers. At Meridian Technologies, engineers focus on high-throughput logistics data processing using Go and TypeScript. Apex Cloud Systems engineers work on similar problems but at larger scale. Sources: Glassdoor, LinkedIn, Meridian Technologies.",
    },
    {
      queryId: roleExpectations.queries[1].id,
      mentioned: true, visibilityScore: 58, sentimentScore: 0.5,
      citations: ["glassdoor.com", "builtin.com"],
      competitorsMentioned: ["novabridge.io", "velochain.com"],
      response: "Mid-size companies where engineers have high product impact include NovaBridge Analytics, where IC engineers own features end-to-end. Meridian Technologies gives engineers significant ownership over their platform domain. VeloChain engineers report working closely with customers. Sources: Glassdoor, Built In.",
    },
    {
      queryId: roleExpectations.queries[2].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["builtin.com", "glassdoor.com", "wellfound.com"],
      competitorsMentioned: ["novabridge.io", "velochain.com"],
      response: "Enterprise software companies where engineers have strong ownership include NovaBridge Analytics and VeloChain, both of which have flatter organizational structures. Sources: Built In, Glassdoor, Wellfound.",
    },
    {
      queryId: roleExpectations.queries[3].id,
      mentioned: true, visibilityScore: 55, sentimentScore: 0.5,
      citations: ["glassdoor.com", "linkedin.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "A typical day for engineers at supply chain tech companies involves working with large-scale data systems, collaborating with operations teams, and solving logistics optimization problems. Meridian Technologies engineers describe working across data pipelines, API design, and ML model integration. Sources: Glassdoor, LinkedIn.",
    },
    {
      queryId: roleExpectations.queries[4].id,
      mentioned: true, visibilityScore: 60, sentimentScore: 0.6,
      citations: ["glassdoor.com", "stackoverflow.com", "meridiantech.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "Enterprise software companies with interesting technical challenges include Apex Cloud Systems (large-scale distributed systems), Meridian Technologies (supply chain optimization with AI), and NovaBridge Analytics (real-time data analytics). Sources: Glassdoor, Stack Overflow, Meridian Technologies.",
    },
    {
      queryId: roleExpectations.queries[5].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["builtin.com", "techcrunch.com", "linkedin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io", "velochain.com"],
      response: "Companies building AI-powered supply chain products include Apex Cloud Systems (predictive logistics), NovaBridge Analytics (demand forecasting), and VeloChain (real-time visibility). All three have been growing their AI/ML teams. Sources: Built In, TechCrunch, LinkedIn.",
    },
  ];

  // ── Culture & Work-Life Balance (Meridian: 1/6 = 17% — critical gap) ──
  const wlbResults: ResultSpec[] = [
    {
      queryId: cultureValues.queries[0].id, // "is Meridian Technologies a diverse workplace"
      mentioned: true, visibilityScore: 35, sentimentScore: 0.1,
      citations: ["glassdoor.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Limited data is available on diversity at Meridian Technologies. A few Glassdoor reviews mention the company is working on diversity initiatives but note the engineering team is not yet representative. Apex Cloud Systems has published diversity reports and has dedicated DEI programs. Sources: Glassdoor.",
    },
    {
      queryId: cultureValues.queries[1].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "comparably.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Enterprise software companies in Austin with strong work-life balance ratings include Apex Cloud Systems (known for remote-first flexibility) and VeloChain (4-day work week pilot). Sources: Glassdoor, Comparably, Built In.",
    },
    {
      queryId: cultureValues.queries[2].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["comparably.com", "glassdoor.com", "builtin.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "The best company cultures in supply chain technology tend to come from companies that invest in employer branding. Apex Cloud Systems and NovaBridge Analytics both score well on Comparably for culture. Sources: Comparably, Glassdoor, Built In.",
    },
    {
      queryId: cultureValues.queries[3].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["builtin.com", "glassdoor.com", "wellfound.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Remote work policies vary at mid-size enterprise companies. Apex Cloud Systems is fully remote-first. VeloChain offers hybrid with 3 days remote. Most companies in this segment have settled on hybrid arrangements post-pandemic. Sources: Built In, Glassdoor, Wellfound.",
    },
    {
      queryId: cultureValues.queries[4].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["comparably.com", "glassdoor.com", "teamblind.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io"],
      response: "Enterprise software companies with inclusive engineering teams include Apex Cloud Systems, which has ERGs and published inclusion metrics. NovaBridge Analytics is smaller but has a strong reputation for psychological safety. Sources: Comparably, Glassdoor, Blind.",
    },
    {
      queryId: cultureValues.queries[5].id,
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "levels.fyi", "builtin.com"],
      competitorsMentioned: ["novabridge.io"],
      response: "ML engineers looking for work-life balance often prefer mid-size companies over big tech. NovaBridge Analytics is frequently mentioned for maintaining reasonable hours despite fast growth. Sources: Glassdoor, Levels.fyi, Built In.",
    },
  ];

  // ── Competitor Comparison (Meridian: 3/6 = 50%) ──
  const compCompResults: ResultSpec[] = [
    {
      queryId: competitorComparison.queries[0].id, // "should I work at Meridian or Apex"
      mentioned: true, visibilityScore: 55, sentimentScore: 0.3,
      citations: ["glassdoor.com", "levels.fyi", "linkedin.com"],
      competitorsMentioned: ["apexcloudsystems.com"],
      response: "Comparing Meridian Technologies and Apex Cloud Systems: Apex is larger with more established employer branding and higher reported compensation. Meridian offers more ownership and a tighter engineering team, with the opportunity to shape the platform during a growth phase. Apex has a 4.2 Glassdoor rating vs Meridian at approximately 3.8. Both are building in the supply chain space. Sources: Glassdoor, Levels.fyi, LinkedIn.",
    },
    {
      queryId: competitorComparison.queries[1].id, // "Meridian vs NovaBridge for ML"
      mentioned: true, visibilityScore: 50, sentimentScore: 0.4,
      citations: ["glassdoor.com", "linkedin.com"],
      competitorsMentioned: ["novabridge.io"],
      response: "For ML engineers choosing between Meridian Technologies and NovaBridge Analytics: NovaBridge has a more established ML team with a track record of published research. Meridian is earlier in their ML journey but offers the opportunity to build from the ground up with a new AI/ML team and direct product impact. NovaBridge is stronger on technical reputation; Meridian offers more greenfield opportunity. Sources: Glassdoor, LinkedIn.",
    },
    {
      queryId: competitorComparison.queries[2].id, // "best supply chain tech companies compared"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "builtin.com", "comparably.com", "techcrunch.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io", "velochain.com"],
      response: "The top supply chain technology companies for engineers include Apex Cloud Systems (largest, strongest brand), NovaBridge Analytics (technical depth), and VeloChain (fastest growing). Each has distinct strengths depending on what an engineer values most. Sources: Glassdoor, Built In, Comparably, TechCrunch.",
    },
    {
      queryId: competitorComparison.queries[3].id, // "how does Meridian compare to other Austin tech"
      mentioned: true, visibilityScore: 48, sentimentScore: 0.3,
      citations: ["glassdoor.com", "builtin.com", "indeed.com"],
      competitorsMentioned: ["apexcloudsystems.com", "velochain.com"],
      response: "Among Austin tech companies in the enterprise and supply chain space, Meridian Technologies is a solid mid-tier option. They are less well-known than Apex Cloud Systems but offer more ownership than larger companies. VeloChain is a comparable alternative with a slightly different product focus. Meridian has less presence on employer review sites than competitors. Sources: Glassdoor, Built In, Indeed.",
    },
    {
      queryId: competitorComparison.queries[4].id, // "top employers in logistics and supply chain"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["glassdoor.com", "builtin.com", "wellfound.com", "techcrunch.com"],
      competitorsMentioned: ["apexcloudsystems.com", "novabridge.io", "velochain.com"],
      response: "Top employers in logistics and supply chain technology include Apex Cloud Systems, NovaBridge Analytics, and VeloChain, all of which have strong presence on employer review and career platforms. Sources: Glassdoor, Built In, Wellfound, TechCrunch.",
    },
    {
      queryId: competitorComparison.queries[5].id, // "mid-size vs startups for engineers"
      mentioned: false, visibilityScore: 0, sentimentScore: 0,
      citations: ["builtin.com", "levels.fyi", "wellfound.com"],
      competitorsMentioned: ["novabridge.io", "velochain.com"],
      response: "For engineers choosing between mid-size enterprise companies and startups, the tradeoffs are well-documented. Startups like VeloChain offer faster growth and larger equity grants. Mid-size companies like NovaBridge Analytics offer more stability while still providing meaningful technical ownership. Sources: Built In, Levels.fyi, Wellfound.",
    },
  ];

  // ── Create all scan results ──────────────────────────────────
  const allResults = [
    ...cultureResults,
    ...compResults,
    ...hiringResults,
    ...roleResults,
    ...wlbResults,
    ...compCompResults,
  ];

  for (const spec of allResults) {
    const scanResult = await prisma.scanResult.create({
      data: {
        scanRunId: scanRun.id,
        queryId: spec.queryId,
        response: spec.response,
        mentioned: spec.mentioned,
        visibilityScore: spec.visibilityScore,
        sentimentScore: spec.sentimentScore,
        metadata: {
          competitorMentions: buildCompMentions(spec.competitorsMentioned),
        },
      },
    });

    // Create citation sources
    if (spec.citations.length > 0) {
      await prisma.citationSource.createMany({
        data: spec.citations.map((domain) => ({
          scanResultId: scanResult.id,
          url: `https://${domain}`,
          domain,
          sourceType: null, // classified at report generation time
        })),
      });
    }
  }

  console.log("Seed complete.");
  console.log({
    organization: org.slug,
    user: user.email,
    client: client.name,
    competitors: [competitor1.name, competitor2.name, competitor3.name, competitor4.name],
    roleProfiles: [backendRole.title, mlRole.title],
    queryClusters: [
      engineeringCulture.name, compensationPerks.name, hiringProcess.name,
      roleExpectations.name, cultureValues.name, competitorComparison.name,
    ],
    scanRun: `${scanRun.id} (${allResults.length} results)`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
