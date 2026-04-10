# CLAUDE.md

## Product goal
Build Antellion, an enterprise AI hiring visibility platform for analyzing how companies appear in AI-driven candidate discovery, generating executive audit reports, and identifying competitive visibility gaps.

---

## Core capabilities
- Client and competitor management
- Query generation and clustering
- Visibility scans
- Comparison logic
- Executive audit reports
- Content assets for remediation

---

## Architecture
- apps/web: application UI
- apps/jobs: background processing
- packages/core: domain logic
- packages/db: Prisma and database access
- packages/prompts: LLM prompt definitions
- packages/ui: shared UI components

---

## Technical rules
- Use TypeScript everywhere
- Use Next.js App Router for the web app
- Use Prisma + Postgres for persistence
- Keep domain logic in packages/core
- Prefer Zod for validation
- Prefer modular, testable code
- Avoid unnecessary dependencies
- Run typecheck and tests after meaningful changes

---

## UX rules
- Enterprise-oriented UI
- Clean, minimal, credible presentation
- No toy copy or fake startup fluff
- Reports should feel client-ready

---

## Domain rules
- Optimize for AI visibility and employer perception, not traditional SEO traffic
- Query clusters should map to candidate intent
- Reports should emphasize competitive gaps, business risk, and opportunity
- Keep the initial scan workflow semi-manual but future-automation ready
- Preserve organization scoping across all data access patterns

---

## Current priorities
1. Report export (HTML first, then PDF if needed)
2. Content asset CRUD
3. Query cluster editing
4. Demo readiness (seed data + report quality)
5. LLM scan automation (after validation)
6. Authentication integration (after initial usage)

---

## Working style
- Inspect existing code before changing architecture
- Choose the simplest production-worthy implementation
- Make incremental edits
- Reuse existing patterns before introducing new ones
- Avoid duplicating logic across packages
- Summarize what changed, what remains, and any risks

---

## Agent coordination

Use specialized agents when appropriate:

- architect → system design, schema, boundaries, tradeoffs
- backend → data logic, workflows, server actions, jobs
- frontend → UI, dashboard flows, report presentation
- quality → hardening, regression detection, test gaps
- reportpm → report clarity, executive usefulness, recommendations
- growth → positioning, demo realism, messaging

Prefer delegating to the correct agent rather than solving everything in a single pass.

---

## Guardrails

- Do not move business logic into UI components
- Do not introduce new dependencies without clear justification
- Do not redesign working systems without a concrete problem
- Do not fake functionality in UI or demo data that is not actually supported
- Keep outputs deterministic and testable unless model-driven variability is required