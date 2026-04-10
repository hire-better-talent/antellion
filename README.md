# Antellion

Enterprise AI hiring visibility platform. Analyze how companies appear in AI-driven candidate discovery, generate executive audit reports, and identify competitive visibility gaps.

## Monorepo structure

```
apps/
  web/        Next.js App Router — dashboard & reports
  jobs/       Background workers — scan execution

packages/
  core/       Domain logic & validation schemas
  db/         Prisma client & schema
  prompts/    LLM prompt templates
  ui/         Shared React components
  config/     Shared TypeScript & ESLint config
```

## Getting started

```bash
# Install dependencies
pnpm install

# Copy env and configure DATABASE_URL
cp .env.example .env

# Push schema to database
pnpm db:push

# Generate Prisma client
pnpm db:generate

# Start development
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:migrate` | Run database migrations |

## Requirements

- Node.js >= 20
- pnpm 9+
- PostgreSQL
