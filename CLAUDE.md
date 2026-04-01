# CLAUDE.md — Next.js + Supabase Development Standards

This file governs how Claude Code builds, extends, and tests this application.
Every instruction here is mandatory. Features are not complete until all relevant
checklist items below are satisfied.

---

## Table of Contents

1. [Definition of Done](#definition-of-done)
2. [API Route Standards](#api-route-standards)
3. [Supabase & RLS Standards](#supabase--rls-standards)
4. [Testing Requirements](#testing-requirements)
5. [Test File Conventions](#test-file-conventions)
6. [Ongoing Coverage Rule](#ongoing-coverage-rule)
7. [Test Templates](#test-templates)
8. [CI Enforcement](#ci-enforcement)

---

## Definition of Done

A feature is **NOT done** until every applicable box is checked:

- [ ] The UI action calls a real, implemented API route (not a placeholder or `console.log`)
- [ ] The API route validates input, handles auth, and returns a consistent response shape
- [ ] RLS policies exist and are verified for every table the feature touches
- [ ] A Vitest API test covers: success, unauthenticated, and invalid-input cases
- [ ] A Vitest RLS test covers: owner access, other-user denial, and anon denial
- [ ] A Playwright E2E test covers: happy path, and at least one auth/permission failure path
- [ ] All existing tests still pass after the change

If a task is scoped to UI-only or backend-only, the other layers must still be checked
for compatibility — never assume unchanged layers are unaffected.

---

## API Route Standards

Every `/api/` route **MUST** follow these rules without exception.

### Response Shape

All responses return a consistent JSON envelope:

```ts
// Success
{ "data": <payload>, "error": null }

// Failure
{ "data": null, "error": "Human-readable message" }
```

Never return raw Supabase error objects to the client. Log them server-side,
return a sanitized message to the client.

### Required Behaviors Per Route

| Concern | Requirement |
|---|---|
| Auth check | Return `401` if no valid session before any DB call |
| Input validation | Return `400` with field errors if required fields are missing or invalid |
| Not found | Return `404` if a resource doesn't exist |
| Ownership check | Return `403` if authenticated user doesn't own the resource |
| Server error | Return `500` with a generic message; log the real error server-side |
| Success (create) | Return `201` |
| Success (update/delete) | Return `200` |

### Route Skeleton

When creating a new route, always start from this structure:

```ts
// /api/things/[id]/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ data: null, error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('things')
    .update({ name: body.name })
    .eq('id', id)
    .eq('user_id', user.id) // ownership check at query level
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/things]', error)
    return NextResponse.json({ data: null, error: 'Failed to update' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data, error: null }, { status: 200 })
}
```

### Project-Scoped Route Pattern

Routes under `/api/p/[projectId]/` use the `requireProjectRole()` helper from
`@/lib/project-auth` instead of manual auth checks. This is the preferred pattern:

```ts
// /api/p/[projectId]/things/route.ts
import { requireProjectRole, isErrorResponse } from '@/lib/project-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const membership = await requireProjectRole(projectId, ['admin', 'editor', 'viewer'])
  if (isErrorResponse(membership)) return membership

  const { supabase, user, role } = membership

  const { data, error } = await supabase
    .from('things')
    .select('*')
    .eq('project_id', projectId)

  if (error) {
    console.error('[GET /api/p/things]', error)
    return NextResponse.json({ data: null, error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
```

---

## Supabase & RLS Standards

### Server Client vs Browser Client

- **API routes and server components**: Always use `await createServerSupabaseClient()` from `@/lib/supabase/server` (reads cookies, has user session). This function is async and must be awaited.
- **Project-scoped routes**: Use `requireProjectRole()` from `@/lib/project-auth` — it handles auth + membership checks and returns a `{ supabase, user, role }` object or a 401/403 response.
- **Client components**: Use `createBrowserClient()` from `@/lib/supabase/client` only for real-time subscriptions or non-sensitive reads
- **Admin/service operations**: Use `createServiceRoleClient()` from `@/lib/supabase/server` for operations that bypass RLS (e.g., test setup, migrations, admin provisioning). Never expose this client to the browser.
- Never use the service role key outside of test setup, migration scripts, and admin API routes

### RLS Policy Checklist

Every table MUST have explicit policies for all four operations.
If an operation should not be permitted, add a policy that returns `false` — do not
rely on the absence of a policy for security.

```sql
-- Template: apply to every new table
ALTER TABLE things ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own rows
CREATE POLICY "users can view own things"
  ON things FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: authenticated users only, user_id must match
CREATE POLICY "users can create own things"
  ON things FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: only owner
CREATE POLICY "users can update own things"
  ON things FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: only owner
CREATE POLICY "users can delete own things"
  ON things FOR DELETE
  USING (auth.uid() = user_id);
```

### Migration Naming

Name migration files descriptively so tests can reference them:

```
supabase/migrations/
  20240101000000_create_things.sql
  20240101000001_add_rls_things.sql
  20240101000002_add_status_to_things.sql
```

---

## Testing Requirements

### Test Stack

| Layer | Tool | Config file |
|---|---|---|
| API routes & RLS | Vitest | `vitest.config.ts` |
| End-to-end user flows | Playwright | `playwright.config.ts` |
| Local DB for tests | Supabase CLI (`supabase start`) | `supabase/config.toml` |

### Running Tests

```bash
# Start local Supabase (required for RLS tests)
supabase start

# Reset DB: apply migrations + seed test data via Admin API
npm run db:reset

# Unit & integration tests
npx vitest run

# Watch mode during development
npx vitest

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --ui

# Full pre-deploy check
npm run test:all
```

> **Note:** `npm run db:reset` runs `supabase db reset --no-seed` then
> `npx tsx scripts/seed-test-users.ts`. Auth users must be created via the
> GoTrue Admin API (not raw SQL) — the seed script handles this automatically.

Test scripts in `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:e2e": "playwright test",
  "test:all": "vitest run && playwright test",
  "db:reset": "supabase db reset --no-seed && npx tsx scripts/seed-test-users.ts"
}
```

---

## Test File Conventions

### Directory Structure

```
__tests__/
  api/
    things.test.ts        # one file per API resource
    users.test.ts
  rls/
    things.test.ts        # one file per table with RLS
e2e/
  things.spec.ts          # one file per major user flow
  auth.spec.ts
```

### Naming Convention

- API test files: `__tests__/api/<resource>.test.ts`
- RLS test files: `__tests__/rls/<table>.test.ts`
- E2E test files: `e2e/<feature>.spec.ts`

### Shared Test Fixtures

Maintain a single fixture file for test users and seed data:

```ts
// __tests__/fixtures.ts
export const TEST_USERS = {
  owner: { email: 'owner@test.com', password: 'password123', id: '<uuid>' },
  other: { email: 'other@test.com', password: 'password123', id: '<uuid>' },
}

export const SEED_THINGS = {
  ownerThing: { id: '<uuid>', name: 'Owner Thing', user_id: TEST_USERS.owner.id },
  otherThing: { id: '<uuid>', name: 'Other Thing', user_id: TEST_USERS.other.id },
}
```

Use `supabase/seed.sql` to insert test fixtures on every `supabase db reset`.

> **Note:** The project also has `supabase/seed.ts` for production data import (Excel parsing).
> `seed.sql` is for deterministic test data only — it must stay in sync with `fixtures.ts`.

---

## Ongoing Coverage Rule

**This is the most important rule in this file.**

Whenever you add, modify, or delete any of the following, you MUST update or add
tests in the same commit/task. There are no exceptions.

| Change | Required test updates |
|---|---|
| New API route | New `__tests__/api/<resource>.test.ts` covering auth, validation, success |
| Modified API route | Update existing API test to cover the changed behavior |
| New table | New `__tests__/rls/<table>.test.ts` + RLS policies in migration |
| Modified RLS policy | Update corresponding RLS test |
| New user action (button, form, etc.) | New or updated `e2e/<feature>.spec.ts` |
| Modified user flow | Update E2E spec to match new flow |
| Bug fix | Add a regression test that would have caught the bug |
| Deleted feature | Delete the corresponding test files |

When Claude Code is given a task that touches any of the above, it must:

1. **State upfront** which test files will be created or modified
2. **Write the tests alongside the feature code** — never as a follow-up
3. **Run the relevant tests** and confirm they pass before marking the task complete
4. **Flag any existing tests that need updating** due to the change

---

## Test Templates

### API Route Test Template

```ts
// __tests__/api/<resource>.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TEST_USERS, SEED_THINGS } from '../fixtures'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

let ownerToken: string
let otherToken: string

beforeAll(async () => {
  // Sign in both test users and store their tokens
  const ownerRes = await fetch(`${BASE_URL}/api/auth/test-token`, {
    method: 'POST',
    body: JSON.stringify(TEST_USERS.owner),
  })
  ownerToken = (await ownerRes.json()).token

  const otherRes = await fetch(`${BASE_URL}/api/auth/test-token`, {
    method: 'POST',
    body: JSON.stringify(TEST_USERS.other),
  })
  otherToken = (await otherRes.json()).token
})

describe('POST /api/things', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/things`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/things`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it('creates and returns a thing for an authenticated user', async () => {
    const res = await fetch(`${BASE_URL}/api/things`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ name: 'New Thing' }),
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBeDefined()
    expect(json.data.name).toBe('New Thing')
    expect(json.error).toBeNull()
  })
})

describe('PATCH /api/things/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when user tries to update another user\'s thing', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`,
      },
      body: JSON.stringify({ name: 'Stolen' }),
    })
    // Returns 404 (not found for this user) rather than 403 to avoid leaking existence
    expect([403, 404]).toContain(res.status)
  })

  it('updates successfully as the owner', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe('Updated Name')
  })
})

describe('DELETE /api/things/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })

  it('prevents deleting another user\'s thing', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    expect([403, 404]).toContain(res.status)
  })

  it('deletes successfully as the owner', async () => {
    const res = await fetch(`${BASE_URL}/api/things/${SEED_THINGS.ownerThing.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(res.status).toBe(200)
  })
})
```

### RLS Policy Test Template

```ts
// __tests__/rls/<table>.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TEST_USERS, SEED_THINGS } from '../fixtures'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

let anonClient: SupabaseClient
let ownerClient: SupabaseClient
let otherClient: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  await ownerClient.auth.signInWithPassword(TEST_USERS.owner)

  otherClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  await otherClient.auth.signInWithPassword(TEST_USERS.other)

  // Bypasses RLS — use only for setup/teardown
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
})

describe('things table — SELECT', () => {
  it('anon user sees no rows', async () => {
    const { data } = await anonClient.from('things').select()
    expect(data).toEqual([])
  })

  it('owner sees only their own things', async () => {
    const { data } = await ownerClient.from('things').select()
    expect(data?.every(t => t.user_id === TEST_USERS.owner.id)).toBe(true)
  })

  it('owner cannot see other user\'s things', async () => {
    const { data } = await ownerClient
      .from('things')
      .select()
      .eq('id', SEED_THINGS.otherThing.id)
    expect(data).toEqual([])
  })
})

describe('things table — INSERT', () => {
  it('anon user cannot insert', async () => {
    const { error } = await anonClient
      .from('things')
      .insert({ name: 'Anon Thing', user_id: TEST_USERS.owner.id })
    expect(error).not.toBeNull()
  })

  it('user cannot insert a row owned by another user', async () => {
    const { error } = await ownerClient
      .from('things')
      .insert({ name: 'Spoofed', user_id: TEST_USERS.other.id })
    expect(error).not.toBeNull()
  })

  it('user can insert their own row', async () => {
    const { data, error } = await ownerClient
      .from('things')
      .insert({ name: 'My Thing', user_id: TEST_USERS.owner.id })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.user_id).toBe(TEST_USERS.owner.id)

    // Cleanup
    await adminClient.from('things').delete().eq('id', data!.id)
  })
})

describe('things table — UPDATE', () => {
  it('user cannot update another user\'s row', async () => {
    const { data } = await ownerClient
      .from('things')
      .update({ name: 'Hacked' })
      .eq('id', SEED_THINGS.otherThing.id)
      .select()
    expect(data).toEqual([]) // RLS silently blocks, returns empty
  })

  it('user can update their own row', async () => {
    const { data, error } = await ownerClient
      .from('things')
      .update({ name: 'Updated by Owner' })
      .eq('id', SEED_THINGS.ownerThing.id)
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.name).toBe('Updated by Owner')
  })
})

describe('things table — DELETE', () => {
  it('user cannot delete another user\'s row', async () => {
    const { error } = await ownerClient
      .from('things')
      .delete()
      .eq('id', SEED_THINGS.otherThing.id)
    // Supabase returns no error but deletes 0 rows — verify row still exists
    const { data } = await adminClient
      .from('things')
      .select()
      .eq('id', SEED_THINGS.otherThing.id)
      .single()
    expect(data).not.toBeNull()
  })

  it('user can delete their own row', async () => {
    // Insert a fresh row to delete
    const { data: inserted } = await adminClient
      .from('things')
      .insert({ name: 'To Delete', user_id: TEST_USERS.owner.id })
      .select()
      .single()

    const { error } = await ownerClient
      .from('things')
      .delete()
      .eq('id', inserted!.id)
    expect(error).toBeNull()
  })
})
```

### Playwright E2E Test Template

```ts
// e2e/<feature>.spec.ts
import { test, expect, Page } from '@playwright/test'
import { TEST_USERS, SEED_THINGS } from '../__tests__/fixtures'

// Reusable login helper — add to e2e/helpers/auth.ts and import
async function login(page: Page, user = TEST_USERS.owner) {
  await page.goto('/login')
  await page.fill('[name=email]', user.email)
  await page.fill('[name=password]', user.password)
  await page.click('[type=submit]')
  await page.waitForURL('/dashboard')
}

test.describe('Things — create flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('user can create a thing', async ({ page }) => {
    await page.goto('/things/new')
    await page.fill('[name=name]', 'Playwright Thing')
    await page.click('[data-testid=submit-btn]')

    // Must navigate away from /new and show success
    await expect(page).not.toHaveURL('/things/new')
    await expect(page.locator('[data-testid=success-toast]')).toBeVisible()
  })

  test('form shows validation error on empty submit', async ({ page }) => {
    await page.goto('/things/new')
    await page.click('[data-testid=submit-btn]')
    await expect(page.locator('[data-testid=field-error-name]')).toBeVisible()
    // Must stay on the form — never navigate on invalid input
    await expect(page).toHaveURL('/things/new')
  })
})

test.describe('Things — edit flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('owner can edit their own thing', async ({ page }) => {
    await page.goto(`/things/${SEED_THINGS.ownerThing.id}/edit`)
    await page.fill('[name=name]', 'Edited by Playwright')
    await page.click('[data-testid=save-btn]')

    await expect(page.locator('[data-testid=success-toast]')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Edited by Playwright')
  })

  test('edit button is not shown for another user\'s thing', async ({ page }) => {
    await login(page, TEST_USERS.other) // log in as a different user
    await page.goto(`/things/${SEED_THINGS.ownerThing.id}`)
    await expect(page.locator('[data-testid=edit-btn]')).not.toBeVisible()
  })
})

test.describe('Things — delete flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('owner can delete their own thing with confirmation', async ({ page }) => {
    await page.goto(`/things/${SEED_THINGS.ownerThing.id}`)
    await page.click('[data-testid=delete-btn]')

    // Confirmation dialog must appear
    await expect(page.locator('[data-testid=confirm-dialog]')).toBeVisible()
    await page.click('[data-testid=confirm-delete-btn]')

    // Redirects to list and shows success
    await expect(page).toHaveURL('/things')
    await expect(page.locator('[data-testid=success-toast]')).toBeVisible()
  })

  test('cancelling delete confirmation does not delete', async ({ page }) => {
    await page.goto(`/things/${SEED_THINGS.ownerThing.id}`)
    await page.click('[data-testid=delete-btn]')
    await page.click('[data-testid=cancel-delete-btn]')

    // Must still be on the detail page
    await expect(page).toHaveURL(`/things/${SEED_THINGS.ownerThing.id}`)
  })
})

test.describe('Things — unauthenticated access', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/things/new')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user cannot access thing detail', async ({ page }) => {
    await page.goto(`/things/${SEED_THINGS.ownerThing.id}`)
    await expect(page).toHaveURL(/\/login/)
  })
})
```

---

## CI Enforcement

Add this GitHub Actions workflow to block merges if tests fail:

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start local Supabase
        run: supabase start

      - name: Reset DB with migrations and seed
        run: supabase db reset

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Run unit and RLS tests
        run: npx vitest run
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ env.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ env.SUPABASE_SERVICE_KEY }}

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Quick Reference — What to Do for Each Task Type

| Task | Create/update these files |
|---|---|
| New resource (e.g. `/api/p/[projectId]/pages`) | Route file, `__tests__/api/<resource>.test.ts`, `__tests__/rls/<table>.test.ts`, `e2e/<resource>.spec.ts` |
| New user action on existing resource | Update `e2e/<resource>.spec.ts`, update `__tests__/api/<resource>.test.ts` |
| New Supabase table | Migration file, RLS policies in migration, `__tests__/rls/<table>.test.ts` |
| Bug fix | Fix + add regression test to the relevant `__tests__/api/` or `e2e/` file |
| Removing a feature | Remove the feature code + remove its test files |
