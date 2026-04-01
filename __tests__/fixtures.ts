/**
 * Shared test fixtures — deterministic UUIDs that match supabase/seed.sql.
 *
 * These users/data are inserted by `supabase db reset` (which runs seed.sql)
 * and can be referenced in API tests, RLS tests, and E2E tests.
 */

export const TEST_USERS = {
  /** Superadmin — member of the test project as admin */
  owner: {
    email: "owner@test.com",
    password: "password123456",
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  },
  /** Editor — member of the test project as editor */
  member: {
    email: "editor@test.com",
    password: "password123456",
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  },
  /** Outsider — NOT a member of the test project */
  other: {
    email: "other@test.com",
    password: "password123456",
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  },
} as const;

export const TEST_PROJECT = {
  id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  name: "Test Project",
  slug: "test-project",
  client_name: "Test Client",
  data_mode: "direct_entry" as const,
  status: "active" as const,
} as const;

export const SEED_PAGES = {
  ownerPage: {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    page_id: "1",
    name: "Test Page One",
    project_id: TEST_PROJECT.id,
    status: "not_started",
    depth: 1,
  },
  memberPage: {
    id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    page_id: "2",
    name: "Test Page Two",
    project_id: TEST_PROJECT.id,
    status: "drafting",
    depth: 1,
  },
} as const;

export const SEED_COMMENTS = {
  ownerComment: {
    id: "11111111-1111-1111-1111-111111111111",
    page_id: SEED_PAGES.ownerPage.id,
    user_id: TEST_USERS.owner.id,
    content: "Test comment by owner",
  },
} as const;
