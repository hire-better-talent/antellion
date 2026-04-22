---
name: Clerk Authentication Integration
description: Clerk v6 is live in apps/web; getAuthContext() is the auth entry point; migration script written but not run; self-review guard has role-based override
type: project
---

Clerk v6 (`@clerk/nextjs`) is integrated into `apps/web`. Jordan has the Clerk keys and must populate `.env.local` himself.

**Key decisions:**
- `getAuthContext()` in `apps/web/src/lib/auth.ts` is the single auth entry point for server actions — returns `{ userId, organizationId, role }`. It does a lazy upsert of Prisma shadow rows on every call (covers webhook race).
- `getOrganizationId()` is kept as a shim (delegates to `getAuthContext`) so ~40 page server components don't need touching.
- Prisma `User.id` and `Organization.id` will become Clerk IDs after Jordan runs the migration script. No schema changes needed — IDs are `String`.
- User email placeholder format: `${userId}@clerk.placeholder` (unique per user, avoids unique constraint violations before webhook fires).
- Org slug fallback: Clerk org ID used as slug on lazy create; webhook `organization.created` fills in the real slug.

**Self-review guard:** OWNER and ADMIN roles may approve results/evidence they also triggered. This is the expected solo-operator pattern. Approvals are logged with `self_approved: true` in `TransitionLog.note`.

**Migration script:** `packages/db/scripts/migrate-to-clerk.ts` — NOT run yet. Jordan runs manually after populating `CLERK_SEED_USER_ID`, `CLERK_SEED_ORG_ID`, `CLERK_SEED_USER_EMAIL`.

**Webhook handler:** `apps/web/src/app/api/webhooks/clerk/route.ts` — handles `user.created`, `user.updated`, `organization.created`, `organizationMembership.created`. Verified via svix + `CLERK_WEBHOOK_SECRET`.

**What Jordan needs to do next:**
1. Add Clerk keys to `apps/web/.env.local`
2. `pnpm dev` — sign in at /sign-in
3. Find his Clerk user ID and org ID in Clerk dashboard
4. `pg_dump "$DATABASE_URL" > dev-backup-pre-clerk.sql`
5. `pnpm tsx packages/db/scripts/migrate-to-clerk.ts`
6. Verify end-to-end in the app
7. Push to Vercel; configure webhook endpoint at `https://app.antellion.com/api/webhooks/clerk`

**Why:** Production launch requires real auth — "system" placeholders removed; actor identity now goes into all audit writes.

**How to apply:** When touching auth-related code, always call `getAuthContext()` not `getOrganizationId()` in server actions. Page components can use either.
