import { LeadCaptureForm } from "./lead-form";

// ─── Inline CTA ─────────────────────────────────────────────

function InlineCTA({ label }: { label: string }) {
  return (
    <div className="mt-12 text-center">
      <a
        href="#lead-form"
        className="btn-gradient btn-glow inline-block rounded-full px-10 py-4 text-base font-semibold text-white transition-all"
      >
        {label}
      </a>
    </div>
  );
}


// ─── Section 1: Hero ────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-gradient-hero relative overflow-hidden pb-28 pt-24 sm:pb-36 sm:pt-32">
      {/* Subtle decorative gradient orbs */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <p className="mb-6 text-sm font-medium uppercase tracking-widest text-brand-600">
          AI Employer Visibility Platform
        </p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          When candidates ask AI where to work,{" "}
          <span className="text-gradient">what does it say about you?</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
          Candidates ask ChatGPT, Claude, and Gemini which companies to join.
          AI synthesizes Glassdoor, Blind, Levels.fyi, press coverage, and
          dozens of other sources into one answer. That answer recommends some
          employers by name. Others never appear.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-500">
          Antellion runs 100 candidate-intent queries the way your candidates
          do, across 10 employer reputation themes, and delivers your mention
          rate, your competitor gap, and the exact sources shaping the answer.
          In 48 hours. For free.
        </p>
        <div className="mt-10">
          <a
            href="#lead-form"
            className="btn-gradient btn-glow inline-block rounded-full px-10 py-4 text-lg font-semibold text-white transition-all sm:px-12 sm:py-5 sm:text-lg"
          >
            Get My Visibility Snapshot
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          No cost. No obligation. No sales call required. Delivered to your
          inbox within 48 hours.
        </p>
      </div>
    </section>
  );
}

// ─── Section 2: Problem ─────────────────────────────────────

function ProblemSection() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">
            Your employer brand has a channel{" "}
            <span className="text-gradient">you have never measured</span>
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              You manage Glassdoor. You invest in your careers page. You run
              LinkedIn campaigns. But when a candidate asks AI &ldquo;best
              companies to work for in fintech&rdquo; or &ldquo;should I join
              [Competitor] or stay where I am?&rdquo;, AI does not link to your
              careers page.
            </p>
            <p>
              It synthesizes Glassdoor, Blind, Built In, Levels.fyi, press
              coverage, and dozens of other sources into a single recommendation.
              That recommendation names some companies and ignores others. It
              frames employers as leaders or afterthoughts.
            </p>
            <p className="font-semibold text-gray-900">
              You have never seen this recommendation. Your top competitor for
              talent may already be in it. Every week you do not check, the gap
              compounds. The candidates you never hear from are the ones AI sent
              somewhere else.
            </p>
          </div>
        </div>

        {/* AI chat-style query cards */}
        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          <QueryCard
            model="ChatGPT"
            query={
              "\u201CBest enterprise software companies for backend engineers\u201D"
            }
            subtext="AI names 3-5 companies. If you are not one of them, the candidate never considers you."
          />
          <QueryCard
            model="Claude"
            query={
              "\u201CShould I join [Competitor] or [Your Company]?\u201D"
            }
            subtext="AI picks a side. You have never seen which side it picks."
          />
          <QueryCard
            model="Gemini"
            query={
              "\u201CCompanies with the best engineering culture in [your city]\u201D"
            }
            subtext="AI ranks employers by synthesized reputation. You do not know where you rank."
          />
        </div>

        <InlineCTA label="See What AI Says About My Company" />
      </div>
    </section>
  );
}

function QueryCard({
  model,
  query,
  subtext,
}: {
  model: string;
  query: string;
  subtext: string;
}) {
  return (
    <div className="chat-bubble rounded-2xl p-6 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
          AI
        </div>
        <span className="text-xs font-medium tracking-wider text-gray-500">
          {model}
        </span>
      </div>
      <p className="font-mono text-sm font-medium leading-snug text-gray-200">
        {query}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-500">{subtext}</p>
    </div>
  );
}

// ─── Section 3: What You Get ────────────────────────────────

function WhatYouGetSection() {
  return (
    <section className="bg-gradient-soft py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">
            Your Visibility Snapshot:{" "}
            <span className="text-gradient">
              a paid-grade diagnostic, delivered free
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            We run 100 candidate-intent queries across 10 employer reputation
            themes: compensation, culture, career growth, work-life balance,
            leadership, and more. We score every AI response and produce a
            structured competitive analysis of what candidates find when they ask
            AI about you.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          <DeliverableCard
            number={1}
            title="Your AI Mention Rate"
            description="A measured percentage: how often your company appears when candidates ask AI about employers in your space. Computed across 100 queries, 10 themes, multiple phrasings. Not a guess. A baseline you can track."
          />
          <DeliverableCard
            number={2}
            title="Ranked Competitor Comparison"
            description="Your mention rate vs. your top competitor's, with the exact gap quantified in percentage points. If they appear in 71% of queries and you appear in 28%, you see the 43-point gap and what it means for candidate reach."
          />
          <DeliverableCard
            number={3}
            title="Citation Gap Analysis"
            description="The specific platforms AI cites when recommending competitors but not you. These are the review sites, compensation databases, and community boards where your absence is shaping AI's answer. Each gap comes with the source type and a concrete first action."
          />
          <DeliverableCard
            number={4}
            title="Curated Interpretation"
            description="A written analysis identifying 1 primary strength, 2 biggest opportunities, and a primary takeaway. This is the paragraph you forward to your CPO or share in your next leadership meeting."
          />
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-gray-500">
          The Snapshot answers one question: where do you stand? The full AI
          Employer Visibility Assessment, available after you review your
          Snapshot, expands to 200-600 queries and answers the harder question:
          what should you do about it, and in what order.
        </p>

        <InlineCTA label="Get My Visibility Snapshot" />
      </div>
    </section>
  );
}

function DeliverableCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="card-hover rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-sm font-bold text-white shadow-md">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}

// ─── Section 4: How It Works ────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">
            60 seconds from you. 48 hours from us.{" "}
            <span className="text-gradient">No demo required.</span>
          </h2>
        </div>

        <div className="relative mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {/* Connector lines (desktop only) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[28px] hidden h-0.5 sm:block"
            aria-hidden="true"
          >
            <div
              className="mx-auto h-full max-w-md opacity-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #2563eb 20%, #7c3aed 50%, #2563eb 80%, transparent 100%)",
              }}
            />
          </div>

          <Step
            number={1}
            title="You fill out 4 fields"
            description="Company name, website, your name, and your work email. Optionally add your biggest talent competitor and primary role you hire for. Takes 60 seconds."
          />
          <Step
            number={2}
            title="We run 100 queries"
            description="100 candidate-intent queries across 10 employer reputation themes, scored and compared against your competitor. Real analytical work, not an automated template. Delivered within 48 hours."
          />
          <Step
            number={3}
            title="Your Snapshot arrives by email"
            description="Your AI mention rate, ranked competitor comparison, citation gap analysis, and a curated interpretation with your primary strength, two biggest opportunities, and a concrete takeaway."
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-lg font-bold text-white shadow-lg">
        {number}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}

// ─── Section 5: Example Finding ─────────────────────────────

function ExampleFindingSection() {
  return (
    <section className="bg-gradient-dark py-24 text-white sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-snug sm:text-4xl">
            What a Snapshot finding{" "}
            <span className="text-gradient-light">looks like</span>
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="gradient-border rounded-2xl bg-[#141922] p-8 shadow-2xl sm:p-10">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              Example: Enterprise Software, Austin TX
            </p>

            <p className="mt-5 text-sm leading-relaxed text-gray-300">
              We evaluated a mid-market enterprise software company (500
              employees, Series C) against 4 talent competitors across 100
              candidate-intent queries.
            </p>

            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              <FindingStat
                label="Mention rate"
                value="28%"
                valueColor="text-brand-400"
                detail="The company appeared in roughly 1 in 4 AI responses about employers in their space."
              />
              <FindingStat
                label="Top competitor gap"
                value="43 points"
                valueColor="text-amber-400"
                detail="Their primary competitor appeared in 71% of the same queries, a 43-percentage-point lead. Candidates researching employers through AI were 2.5x more likely to hear about the competitor first."
              />
              <FindingStat
                label="Citation blind spots"
                value="3 platforms"
                valueColor="text-red-400"
                detail="Three platforms that AI cited when recommending competitors had no presence from this company: a compensation data site, a tech employer review platform, and an engineering community job board."
              />
            </div>

            <div className="mt-8 rounded-xl border border-gray-700/50 bg-[#0B0F14]/60 p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Primary takeaway
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">
                AI describes this company favorably when it mentions them.
                Positive sentiment on culture and engineering quality. But it
                does not mention them often enough. The gap is not reputation. It
                is discoverability.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            This is a real finding from an Antellion assessment. Company name
            withheld. Your Snapshot will show findings specific to your company,
            your industry, and your competitors.
          </p>
        </div>
      </div>
    </section>
  );
}

function FindingStat({
  label,
  value,
  valueColor,
  detail,
}: {
  label: string;
  value: string;
  valueColor: string;
  detail: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{detail}</p>
    </div>
  );
}

// ─── Section 6: Credibility / Methodology ───────────────────

function CredibilitySection() {
  return (
    <section className="bg-gradient-soft py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">
            How we produce the analysis
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          <MethodologyPillar
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            }
            title="Query Design"
            description="100 queries modeled on how candidates actually research employers through AI. 10 themes: compensation, culture, career growth, work-life balance, leadership, DEI, benefits, engineering quality, management reputation, and industry standing. Multiple phrasings and specificity levels per theme. Not random questions. A structured instrument."
          />
          <MethodologyPillar
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            }
            title="Structured Scoring"
            description="Every AI response is scored deterministically: mention detection, visibility ranking, sentiment classification, and citation extraction. No subjective reads. The same scoring methodology, applied consistently to every response, for every company we assess."
          />
          <MethodologyPillar
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
            }
            title="Competitive Comparison"
            description="Your results are compared against named competitors using identical queries and identical scoring. Mention rates, visibility gaps, and citation sources computed per entity. Apples-to-apples because the data comes from the same questions asked in the same session."
          />
          <MethodologyPillar
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            }
            title="Honest Measurement"
            description="When the data supports a strong claim, we make it. When findings are ambiguous, we say so. Every Snapshot includes a confidence note on what 100 queries can and cannot tell you. We would rather give you a credible measurement than an impressive-sounding one."
          />
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center text-base font-medium text-gray-700">
          Antellion created the AI Employer Visibility category. We are the
          first platform purpose-built to measure, analyze, and improve how
          companies appear in AI when candidates decide where to work.
        </p>
      </div>
    </section>
  );
}

function MethodologyPillar({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card-hover rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 text-brand-600 shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}

// ─── Section 7: Lead Form ───────────────────────────────────

function LeadFormSection() {
  return (
    <section id="lead-form" className="bg-gradient-cta py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-snug text-white sm:text-4xl">
            Get your Visibility Snapshot
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-blue-100/80">
            Four required fields. 60 seconds. We run 100 candidate-intent queries
            for your company, score every response, compare you against your top
            competitor, and deliver a personalized analysis to your inbox.
            Each assessment is scoped to your competitive landscape and reviewed
            before delivery. No cost. No obligation. No sales call required.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-blue-200/60">
            Built for companies with 200+ employees who compete for talent
            across multiple roles or locations.
          </p>
        </div>
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#0B0F14]/90 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
          <LeadCaptureForm />
        </div>
      </div>
    </section>
  );
}

// ─── Section 8: FAQ / Objection Handling ────────────────────

const FAQ_ITEMS = [
  {
    question: "Is this actually useful, or is it a gimmick to get my email?",
    answer:
      "The Snapshot contains measured data from 100 queries run against AI on your behalf: your mention rate as a percentage, your competitor\u2019s mention rate alongside it, and the specific citation sources creating the gap. Most TA leaders who receive their Snapshot discover a competitive blind spot they did not know existed. If the findings are not useful, there is no follow-up. We do not add you to a nurture sequence.",
  },
  {
    question: "What is the catch? Why is this free?",
    answer:
      "The findings speak for themselves. When a VP of Talent Acquisition sees that their top competitor is 2-3x more visible in AI candidate queries, the value of understanding the full picture becomes obvious. The Snapshot is a genuine diagnostic: the same methodology we use in paid engagements, applied at introductory scope. If the findings are compelling, we offer a deeper Assessment. If they are not, you still have data about your company that did not exist before.",
  },
  {
    question: "How long does this take on my end?",
    answer:
      "60 seconds to fill out the form. 48 hours until your Snapshot arrives by email. We design the query set for your industry and competitive landscape, run the analysis, and produce a written interpretation. The 48-hour window reflects real analytical work, not processing time.",
  },
  {
    question: "How is this different from our Glassdoor or Comparably data?",
    answer:
      "Glassdoor shows you what employees say about you. Antellion shows you what AI tells candidates about you. AI does not just read Glassdoor. It synthesizes Glassdoor, Blind, Built In, Levels.fyi, your careers page, press coverage, and dozens of other sources into one answer. When a candidate asks ChatGPT \u201Cshould I work at [Company] or [Competitor]?\u201D, they get a single recommendation. Your Glassdoor score is one input to that recommendation. We measure the output.",
  },
  {
    question: "Is 100 queries enough to be meaningful?",
    answer:
      "100 queries across 10 employer reputation themes and multiple phrasings produce a reliable baseline of your AI mention rate and your top competitive gap. Every Snapshot includes a confidence note on what the data can and cannot tell you at this scope. The full Assessment expands to 200\u2013600 queries for per-theme, per-competitor, and per-role granularity.",
  },
  {
    question:
      "We already have an employer brand strategy. How does this fit?",
    answer:
      "This is not a replacement for employer brand work. It is a measurement of whether that work is reaching the AI channel. You may have invested significantly in EVP, culture content, and review site management. The Snapshot answers one question: when candidates ask AI about employers in your space, is that investment showing up in the answer? If it is, the Snapshot confirms it with data. If it is not, you now know exactly where the gap is.",
  },
  {
    question: "Can I just do this myself with ChatGPT?",
    answer:
      "You can ask ChatGPT a few questions about your company. That gives you anecdotes. What you cannot build in an afternoon is 100 candidate-intent query variations across 10 themes, with consistent scoring, ranked competitor comparison, citation source mapping, and a curated interpretation. The volume and structure are what turn a curiosity into a measurement you can act on.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">
            Common questions
          </h2>
        </div>
        <div className="mt-14 divide-y divide-gray-200">
          {FAQ_ITEMS.map((item) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-6">
      <summary className="flex cursor-pointer list-none items-start justify-between text-left text-lg font-medium text-gray-900 transition-colors hover:text-brand-600">
        <span className="pr-4">{question}</span>
        <span className="ml-2 mt-1 shrink-0 text-gray-400 transition-transform group-open:rotate-45">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </span>
      </summary>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{answer}</p>
    </details>
  );
}

// ─── Section 9: Closing CTA ─────────────────────────────────

function ClosingCTASection() {
  return (
    <section className="bg-gradient-soft py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Find out what AI tells candidates about your company
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
          100 queries. 10 themes. Ranked competitor comparison. Citation gap
          analysis. Curated interpretation. Delivered in 48 hours. No cost, no
          demo, no obligation.
        </p>
        <div className="mt-10">
          <a
            href="#lead-form"
            className="btn-gradient btn-glow inline-block rounded-full px-12 py-5 text-lg font-semibold text-white transition-all"
          >
            Get My Visibility Snapshot
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Structured Data ────────────────────────────────────────

function StructuredData() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Antellion",
    url: "https://antellion.com",
    description:
      "Antellion measures and analyzes how companies appear in AI when candidates decide where to work. 100 candidate-intent queries, ranked competitor comparison, citation gap analysis, and curated interpretation.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@antellion.com",
      contactType: "customer service",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <HeroSection />
      <ProblemSection />
      <WhatYouGetSection />
      <HowItWorksSection />
      {/* ExampleFindingSection removed — rendering issue */}
      <CredibilitySection />
      <LeadFormSection />
      <FAQSection />
      <ClosingCTASection />
    </>
  );
}
