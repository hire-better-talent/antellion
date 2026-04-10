/**
 * Citation Remediation Playbooks
 *
 * Multi-step, role-attributed remediation plans for each platform domain.
 * Each playbook has concrete steps with owner, effort, timeframe, and
 * optional prerequisites — designed to be printed as "Monday morning"
 * action cards in executive audit reports.
 *
 * Covers 20+ platforms with 2-4 steps each.
 */

import type { SourceType } from "./citation-taxonomy";
import { classifySource } from "./citation-taxonomy";

// ─── Types ──────────────────────────────────────────────────

export interface RemediationStep {
  action: string;
  owner: string;
  effort: string;
  timeframe: string;
  prerequisite?: string;
}

export interface CitationRemediation {
  steps: RemediationStep[];
  whyItMatters: string;
  expectedOutcome: string;
}

// ─── Platform playbooks ─────────────────────────────────────

const PLATFORM_PLAYBOOKS: Record<string, CitationRemediation> = {
  "glassdoor.com": {
    steps: [
      {
        action: "Claim and complete your Glassdoor employer profile with updated branding, photos, and benefits information",
        owner: "Employer Brand / HR",
        effort: "2-4 hours",
        timeframe: "Week 1",
        prerequisite: "Must have company email domain verified on Glassdoor",
      },
      {
        action: "Respond professionally to the 10 most recent reviews, both positive and negative",
        owner: "Employer Brand / HR",
        effort: "3-5 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Launch an internal campaign encouraging current employees to share honest reviews",
        owner: "People Operations",
        effort: "4-8 hours",
        timeframe: "Week 2-4",
        prerequisite: "Executive sign-off on review solicitation messaging",
      },
    ],
    whyItMatters:
      "Glassdoor is among the most frequently cited sources when AI models answer questions about company culture and employee satisfaction. Absence from Glassdoor means AI models rely on competitor review data to frame your employer category.",
    expectedOutcome:
      "AI models will have fresh, company-attributed employee sentiment data to cite when candidates ask about your workplace, reducing reliance on competitor-only review signals.",
  },

  "indeed.com": {
    steps: [
      {
        action: "Claim your Indeed employer profile and complete all available sections including company description and photos",
        owner: "Talent Acquisition",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Ensure all active job listings include employer value proposition language and accurate role descriptions",
        owner: "Talent Acquisition",
        effort: "2-4 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Respond to existing employee reviews and encourage balanced review submission from current employees",
        owner: "Employer Brand / HR",
        effort: "2-3 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Indeed is one of the largest indexed job platforms. AI models draw on Indeed employer data to inform candidate recommendations about which companies are actively hiring and how they treat employees.",
    expectedOutcome:
      "Updated employer presence provides AI models with current hiring activity and employee sentiment to include in candidate-facing answers.",
  },

  "levels.fyi": {
    steps: [
      {
        action: "Submit verified compensation data for key roles to Levels.fyi or verify existing entries for accuracy",
        owner: "Total Rewards / HR",
        effort: "2-4 hours",
        timeframe: "Week 1-2",
        prerequisite: "Internal approval to disclose compensation ranges",
      },
      {
        action: "Encourage recent hires and current employees to submit verified compensation data points",
        owner: "People Operations",
        effort: "1-2 hours",
        timeframe: "Week 2-4",
      },
      {
        action: "Monitor quarterly for data accuracy and submit corrections when ranges change materially",
        owner: "Total Rewards / HR",
        effort: "1 hour quarterly",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "Levels.fyi is the primary source AI models cite when candidates ask about compensation at specific companies. Without data, AI models compare you unfavorably or omit you entirely from compensation discussions.",
    expectedOutcome:
      "AI models will cite your specific compensation data when candidates evaluate offers, positioning you accurately in the talent market rather than relying on estimates or competitor-only comparisons.",
  },

  "comparably.com": {
    steps: [
      {
        action: "Complete your Comparably employer profile with culture details, leadership info, and workplace photos",
        owner: "Employer Brand / HR",
        effort: "2-3 hours",
        timeframe: "Week 1",
      },
      {
        action: "Participate in Comparably's annual awards cycles by encouraging employee participation in culture surveys",
        owner: "People Operations",
        effort: "4-8 hours",
        timeframe: "Next awards cycle",
        prerequisite: "Minimum employee count required for awards eligibility",
      },
    ],
    whyItMatters:
      "Comparably awards and culture scores are frequently cited by AI models when ranking employers. Absence means your company is excluded from AI-generated employer comparison lists.",
    expectedOutcome:
      "Presence on Comparably provides AI models with structured culture data and potential awards recognition to cite in discovery-stage queries.",
  },

  "linkedin.com": {
    steps: [
      {
        action: "Audit and refresh your LinkedIn Company Page with current employer brand messaging, banner, and Life tab content",
        owner: "Employer Brand / Marketing",
        effort: "4-6 hours",
        timeframe: "Week 1",
      },
      {
        action: "Publish 2-4 employer brand posts per month highlighting culture, team achievements, and thought leadership",
        owner: "Employer Brand / Marketing",
        effort: "2-3 hours per week",
        timeframe: "Ongoing",
      },
      {
        action: "Encourage employees to share company content and update their profiles with current role descriptions",
        owner: "People Operations",
        effort: "1-2 hours",
        timeframe: "Week 2-4",
      },
      {
        action: "Review and optimize job postings to include employer value proposition language and accurate seniority tags",
        owner: "Talent Acquisition",
        effort: "2-4 hours",
        timeframe: "Week 1-2",
      },
    ],
    whyItMatters:
      "LinkedIn is a primary source AI models use for company discovery. Company page content, employee profiles, and job postings all contribute to the employer signal AI models synthesize.",
    expectedOutcome:
      "Refreshed LinkedIn presence ensures AI models have current, company-controlled content to cite when candidates search for employers in your industry and role categories.",
  },

  "builtin.com": {
    steps: [
      {
        action: "Create or update your Built In company profile with tech stack, culture details, perks, and team information",
        owner: "Employer Brand / Engineering",
        effort: "3-4 hours",
        timeframe: "Week 1",
      },
      {
        action: "Ensure active job listings on Built In include detailed role descriptions and tech stack requirements",
        owner: "Talent Acquisition",
        effort: "2-3 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Apply for relevant Built In Best Places to Work lists based on your company size and location",
        owner: "Employer Brand / HR",
        effort: "2-4 hours",
        timeframe: "Next application cycle",
      },
    ],
    whyItMatters:
      "Built In profiles are frequently cited by AI models when candidates ask about tech companies hiring in specific cities. Best Places to Work lists directly influence AI discovery recommendations.",
    expectedOutcome:
      "A complete Built In profile provides AI models with structured employer data to cite in discovery-stage queries, especially for location-specific and tech-stack-specific searches.",
  },

  "wellfound.com": {
    steps: [
      {
        action: "Update your Wellfound company profile with current funding stage, team size, and company mission",
        owner: "Founder / Employer Brand",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Ensure all active roles have detailed descriptions with equity information and role expectations",
        owner: "Talent Acquisition",
        effort: "2-3 hours",
        timeframe: "Week 1-2",
      },
    ],
    whyItMatters:
      "Wellfound is the primary platform AI models reference for startup employers. Without a current profile, AI models may cite outdated or incomplete startup data when candidates ask about your company.",
    expectedOutcome:
      "Updated Wellfound presence ensures AI models cite current company details when candidates research startup opportunities in your space.",
  },

  "blind.app": {
    steps: [
      {
        action: "Set up monitoring for Blind discussions mentioning your company using keyword alerts",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Identify recurring negative themes and escalate systemic concerns to leadership for action",
        owner: "People Operations",
        effort: "2-4 hours monthly",
        timeframe: "Ongoing",
      },
      {
        action: "Address underlying concerns (compensation, management, culture) to organically improve sentiment over time",
        owner: "Executive Leadership",
        effort: "Varies",
        timeframe: "30-90 days",
      },
    ],
    whyItMatters:
      "Blind discussions heavily influence AI models' sentiment analysis of employers. Negative threads on Blind can become the dominant signal AI models cite when candidates ask about working at your company.",
    expectedOutcome:
      "While you cannot control Blind content directly, addressing root causes shifts the conversation. Improved real-world conditions lead to improved anonymous sentiment that AI models eventually reflect.",
  },

  "teamblind.com": {
    steps: [
      {
        action: "Set up monitoring for Blind discussions mentioning your company using keyword alerts",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Identify recurring negative themes and escalate systemic concerns to leadership for action",
        owner: "People Operations",
        effort: "2-4 hours monthly",
        timeframe: "Ongoing",
      },
      {
        action: "Address underlying concerns (compensation, management, culture) to organically improve sentiment over time",
        owner: "Executive Leadership",
        effort: "Varies",
        timeframe: "30-90 days",
      },
    ],
    whyItMatters:
      "Blind discussions heavily influence AI models' sentiment analysis of employers. Negative threads on Blind can become the dominant signal AI models cite when candidates ask about working at your company.",
    expectedOutcome:
      "While you cannot control Blind content directly, addressing root causes shifts the conversation. Improved real-world conditions lead to improved anonymous sentiment that AI models eventually reflect.",
  },

  "payscale.com": {
    steps: [
      {
        action: "Verify and correct your company's compensation data on PayScale if possible through their employer tools",
        owner: "Total Rewards / HR",
        effort: "2-3 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Participate in PayScale salary surveys to ensure your compensation ranges are accurately represented",
        owner: "Total Rewards / HR",
        effort: "2-4 hours",
        timeframe: "Next survey cycle",
      },
    ],
    whyItMatters:
      "PayScale compensation data is cited by AI models when candidates compare salary offers. Inaccurate or missing data means AI models may underrepresent your compensation competitiveness.",
    expectedOutcome:
      "Verified compensation data gives AI models accurate figures to cite when candidates evaluate your offer against competitors.",
  },

  "github.com": {
    steps: [
      {
        action: "Create or update your GitHub organization profile with company description, website, and pinned repositories",
        owner: "Engineering Leadership",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Identify internal projects suitable for open-source release and publish 1-2 repositories",
        owner: "Engineering",
        effort: "8-20 hours",
        timeframe: "30-60 days",
        prerequisite: "Legal review of open-source licensing",
      },
      {
        action: "Encourage engineering team to contribute to relevant open-source projects with company-attributed commits",
        owner: "Engineering Leadership",
        effort: "Ongoing",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "GitHub activity is a strong technical credibility signal. AI models cite open-source contributions when candidates ask about a company's engineering culture and technical depth.",
    expectedOutcome:
      "Visible GitHub presence provides AI models with evidence of technical investment to cite when candidates evaluate your engineering culture.",
  },

  "stackoverflow.com": {
    steps: [
      {
        action: "Encourage senior engineers to participate in Stack Overflow by answering questions in your technology domain",
        owner: "Engineering Leadership",
        effort: "1-2 hours per week",
        timeframe: "Ongoing",
      },
      {
        action: "Create Stack Overflow for Teams presence and link it to your company profile if eligible",
        owner: "Engineering / DevRel",
        effort: "2-4 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Stack Overflow expertise signals technical depth. AI models reference Stack Overflow participation when assessing a company's engineering credibility and technology leadership.",
    expectedOutcome:
      "Active participation builds a retrievable footprint that AI models can cite as evidence of engineering expertise when candidates ask about your technical team.",
  },

  "medium.com": {
    steps: [
      {
        action: "Create or refresh your company's Medium publication with branding and clear topic scope",
        owner: "Employer Brand / Engineering",
        effort: "2-3 hours",
        timeframe: "Week 1",
      },
      {
        action: "Publish 2-4 posts per month covering engineering challenges, culture stories, or product insights",
        owner: "Engineering / Content Marketing",
        effort: "4-8 hours per post",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "AI models index Medium content as first-party employer narrative. Engineering blogs and culture stories published on Medium directly shape how AI represents your company to candidates.",
    expectedOutcome:
      "Regular Medium publishing creates a body of indexed, company-controlled content that AI models cite when candidates search for employers in your domain.",
  },

  "crunchbase.com": {
    steps: [
      {
        action: "Claim your Crunchbase profile and update funding, employee count, leadership, and company description",
        owner: "Finance / Operations",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Monitor quarterly for data accuracy and submit corrections when funding rounds or leadership changes occur",
        owner: "Finance / Operations",
        effort: "30 minutes quarterly",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "AI models cite Crunchbase for company fundamentals — funding, growth trajectory, and leadership. Outdated Crunchbase data leads to AI representing your company with stale or inaccurate business details.",
    expectedOutcome:
      "Current Crunchbase data ensures AI models cite accurate company fundamentals when candidates research your business stability and growth trajectory.",
  },

  "fishbowlapp.com": {
    steps: [
      {
        action: "Monitor Fishbowl industry discussions for mentions of your company",
        owner: "Employer Brand / HR",
        effort: "1-2 hours monthly",
        timeframe: "Ongoing",
      },
      {
        action: "Address recurring concerns internally and communicate improvements through official channels",
        owner: "People Operations",
        effort: "Varies",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "Fishbowl discussions are cited by AI models alongside Blind when synthesizing anonymous workplace sentiment. Negative sentiment on Fishbowl reinforces negative signals from other anonymous sources.",
    expectedOutcome:
      "Monitoring allows early detection of emerging concerns before they become the dominant AI-cited narrative about your workplace.",
  },

  "fairygodboss.com": {
    steps: [
      {
        action: "Create or update your Fairygodboss employer profile with diversity initiatives, parental leave policies, and flexible work options",
        owner: "Employer Brand / HR",
        effort: "2-3 hours",
        timeframe: "Week 1",
      },
      {
        action: "Encourage female employees to share reviews highlighting workplace experience",
        owner: "People Operations / ERG Leaders",
        effort: "2-4 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Fairygodboss is cited by AI models when candidates ask specifically about workplace culture for women. Absence means AI models cannot speak to your company's inclusivity.",
    expectedOutcome:
      "Presence on Fairygodboss provides AI models with diversity-specific employer signals to cite when candidates research inclusive workplaces.",
  },

  "inhersight.com": {
    steps: [
      {
        action: "Claim your InHerSight employer profile and ensure workplace policies and benefits are accurately listed",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Encourage employees to submit ratings on the platform's satisfaction dimensions",
        owner: "People Operations",
        effort: "1-2 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "InHerSight ratings feed into AI models' understanding of workplace satisfaction metrics for women. Missing ratings mean AI cannot differentiate your employer brand on inclusion.",
    expectedOutcome:
      "Updated ratings provide structured satisfaction data AI models cite when candidates compare employers on inclusion and work-life balance.",
  },

  "dice.com": {
    steps: [
      {
        action: "Update your Dice employer profile with current tech stack, culture information, and office details",
        owner: "Talent Acquisition",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Ensure all technology job postings on Dice include detailed skill requirements and growth opportunities",
        owner: "Talent Acquisition",
        effort: "2-3 hours",
        timeframe: "Week 1-2",
      },
    ],
    whyItMatters:
      "Dice is a specialized technology job board that AI models reference when candidates search for tech-specific roles. Absence limits visibility in technology-focused candidate queries.",
    expectedOutcome:
      "Active Dice presence ensures AI models include your company when candidates search for technology employers hiring specific skill sets.",
  },

  "vault.com": {
    steps: [
      {
        action: "Verify your Vault employer listing is current with accurate industry classification and company details",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Participate in Vault employer surveys to be included in annual rankings",
        owner: "HR Leadership",
        effort: "2-4 hours",
        timeframe: "Next survey cycle",
      },
    ],
    whyItMatters:
      "Vault rankings are cited by AI models as authoritative employer quality signals. Inclusion in Vault rankings directly increases the likelihood of being mentioned in AI recommendations.",
    expectedOutcome:
      "Participation in Vault surveys creates the opportunity for rankings inclusion, which AI models cite as social proof in candidate-facing recommendations.",
  },
};

// ─── Fallback by source type ────────────────────────────────

const SOURCE_TYPE_FALLBACKS: Record<SourceType, CitationRemediation> = {
  review_site: {
    steps: [
      {
        action: "Claim or create your employer profile on this review platform",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Encourage current employees to share balanced, honest reviews",
        owner: "People Operations",
        effort: "2-4 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Review platforms are cited by AI models when candidates evaluate employer culture and employee satisfaction.",
    expectedOutcome:
      "Employer presence on review platforms provides AI models with employee sentiment data to include in candidate-facing responses.",
  },
  salary_database: {
    steps: [
      {
        action: "Verify or submit compensation data for key roles on this platform",
        owner: "Total Rewards / HR",
        effort: "2-4 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Encourage employees to submit compensation data points for accuracy",
        owner: "People Operations",
        effort: "1-2 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Compensation platforms are cited by AI models when candidates compare salary offers across employers.",
    expectedOutcome:
      "Accurate compensation data ensures AI models can cite specific figures rather than relying on estimates.",
  },
  job_board: {
    steps: [
      {
        action: "Ensure job listings on this platform include employer value proposition language",
        owner: "Talent Acquisition",
        effort: "2-3 hours",
        timeframe: "Week 1",
      },
      {
        action: "Complete employer profile with company culture and benefits information",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1-2",
      },
    ],
    whyItMatters:
      "Job boards are cited by AI models when candidates search for open roles and evaluate employers who are actively hiring.",
    expectedOutcome:
      "Updated job listings provide AI models with current hiring signals and employer brand information to cite.",
  },
  employer_listing: {
    steps: [
      {
        action: "Create or update your company profile on this employer directory",
        owner: "Employer Brand / Marketing",
        effort: "2-3 hours",
        timeframe: "Week 1",
      },
      {
        action: "Add tech stack, culture, and benefits details to differentiate from competitors",
        owner: "Employer Brand / Engineering",
        effort: "1-2 hours",
        timeframe: "Week 1-2",
      },
    ],
    whyItMatters:
      "Employer directories are cited by AI models in discovery-stage queries when candidates look for companies to consider.",
    expectedOutcome:
      "A complete employer listing provides AI models with structured data to cite when recommending companies in your industry.",
  },
  professional_network: {
    steps: [
      {
        action: "Refresh your company page with current employer brand content and team highlights",
        owner: "Employer Brand / Marketing",
        effort: "3-4 hours",
        timeframe: "Week 1",
      },
      {
        action: "Encourage employee advocacy through content sharing and profile updates",
        owner: "People Operations",
        effort: "1-2 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "Professional networks are primary sources AI models use to discover and recommend employers to candidates.",
    expectedOutcome:
      "Updated professional network presence ensures AI models have current, company-controlled signals to include in recommendations.",
  },
  anonymous_forum: {
    steps: [
      {
        action: "Set up monitoring for discussions mentioning your company on this platform",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "Address recurring concerns internally to organically improve sentiment over time",
        owner: "Executive Leadership",
        effort: "Varies",
        timeframe: "30-90 days",
      },
    ],
    whyItMatters:
      "Anonymous forums are cited by AI models for unfiltered employee sentiment. Negative sentiment here heavily weights AI recommendations.",
    expectedOutcome:
      "Addressing root-cause concerns shifts anonymous sentiment over time, improving the signal AI models cite about your workplace.",
  },
  tech_blog: {
    steps: [
      {
        action: "Publish engineering or thought leadership content on this platform",
        owner: "Engineering / Content Marketing",
        effort: "4-8 hours per post",
        timeframe: "Ongoing",
      },
      {
        action: "Encourage technical team members to participate actively in the community",
        owner: "Engineering Leadership",
        effort: "1-2 hours per week",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "Technical community presence signals engineering credibility. AI models cite technical content when candidates evaluate employers on technical depth.",
    expectedOutcome:
      "Active participation creates indexed content AI models cite as evidence of engineering culture and technical investment.",
  },
  news_publication: {
    steps: [
      {
        action: "Develop PR strategy targeting employer brand stories, hiring news, and culture features in this publication",
        owner: "Communications / PR",
        effort: "8-16 hours",
        timeframe: "30-60 days",
      },
      {
        action: "Pitch 1-2 stories per quarter focusing on workplace innovation, hiring milestones, or industry leadership",
        owner: "Communications / PR",
        effort: "4-8 hours per pitch",
        timeframe: "Ongoing",
      },
    ],
    whyItMatters:
      "Press coverage signals market relevance. AI models cite news publications when establishing employer credibility and industry positioning.",
    expectedOutcome:
      "Earned media coverage provides AI models with third-party validation to cite when positioning your company in candidate recommendations.",
  },
  company_owned: {
    steps: [
      {
        action: "Audit and refresh company-owned content (careers page, blog, social media) for AI indexability",
        owner: "Employer Brand / Marketing",
        effort: "4-8 hours",
        timeframe: "Week 1-2",
      },
      {
        action: "Ensure content is publicly accessible (not behind login walls) so AI models can index it",
        owner: "Engineering / Marketing",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
    ],
    whyItMatters:
      "Company-owned content is the highest-control signal. AI models can only cite it if it is publicly accessible and kept current.",
    expectedOutcome:
      "Refreshed, indexable company content ensures AI models have authoritative first-party information to cite.",
  },
  other: {
    steps: [
      {
        action: "Research this platform to determine if an employer profile or content presence is possible",
        owner: "Employer Brand / HR",
        effort: "1-2 hours",
        timeframe: "Week 1",
      },
      {
        action: "If presence is possible, create a profile or publish relevant content",
        owner: "Employer Brand",
        effort: "2-4 hours",
        timeframe: "Week 2-4",
      },
    ],
    whyItMatters:
      "This source was cited by AI models but could not be automatically classified. Investigate to determine if a proactive presence is possible and valuable.",
    expectedOutcome:
      "Establishing presence on cited sources expands the data AI models have available when generating candidate recommendations.",
  },
};

// ─── Public API ─────────────────────────────────────────────

/**
 * Returns a structured remediation playbook for a given domain.
 * Looks up platform-specific playbooks first, then falls back
 * to source-type-level playbooks based on the classification taxonomy.
 */
export function getRemediation(domain: string): CitationRemediation {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  // Platform-specific playbook
  const specific = PLATFORM_PLAYBOOKS[normalized];
  if (specific) return specific;

  // Fall back to source type
  const classification = classifySource(normalized);
  return SOURCE_TYPE_FALLBACKS[classification.sourceType];
}

/**
 * Expose the platform playbooks for iteration.
 */
export const REMEDIATION_PLAYBOOKS = PLATFORM_PLAYBOOKS;
