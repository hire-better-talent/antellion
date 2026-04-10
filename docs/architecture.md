# Architecture

## Overview

Antellion is structured as a pnpm monorepo with Turborepo for orchestration. The platform analyzes how companies appear in AI-driven candidate discovery by probing LLMs with hiring-intent queries and scoring the responses.

## Data flow

1. **User creates a company** via the web dashboard
2. **User triggers a scan** with a set of candidate-intent queries
3. **Job worker picks up the scan**, runs each query through LLM visibility probes
4. **Results are scored and stored** in Postgres
5. **Dashboard renders the audit report** with competitive gaps and recommendations

## Packages

### `@antellion/core`
Domain logic, Zod validation schemas, and business rules. No framework dependencies — pure TypeScript. All domain types and validation should live here.

### `@antellion/db`
Prisma schema and client singleton. Re-exports generated types for use across the monorepo. The schema models companies, scans, and scan results.

### `@antellion/prompts`
LLM prompt templates as typed functions. Each prompt takes structured inputs and returns a string. Keeping prompts in a dedicated package enables versioning and testing independent of the application code.

### `@antellion/ui`
Shared React components used across the web app. Enterprise-oriented, minimal styling with Tailwind CSS.

### `@antellion/config`
Shared TypeScript and ESLint configuration. All packages extend from these base configs.

## Key decisions

- **Prisma over raw SQL**: Type-safe queries, migration tooling, good enough for this scale.
- **Separate jobs app**: Keeps long-running LLM calls out of the Next.js process. Can scale independently.
- **Prompts as a package**: Prompts are product logic. Versioning and testing them separately prevents drift.
- **No ORM abstraction layer**: Prisma client is used directly. Adding a repository pattern would be premature.
