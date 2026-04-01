/**
 * Seeds test users and data into local Supabase.
 *
 * This script:
 * 1. Creates auth users via the GoTrue Admin API
 * 2. Inserts user_profiles, test project, members, pages, comments
 *
 * Run AFTER `supabase db reset --no-seed` (which applies migrations only).
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TEST_USERS = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "owner@test.com", password: "password123456", name: "Test Owner", role: "admin", is_superadmin: true },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", email: "editor@test.com", password: "password123456", name: "Test Editor", role: "editor", is_superadmin: false },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", email: "other@test.com", password: "password123456", name: "Test Other", role: "viewer", is_superadmin: false },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create auth users
  console.log("Creating auth users...");
  for (const user of TEST_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`  ${user.email} already exists, skipping`);
      } else {
        console.error(`  Failed to create ${user.email}:`, error.message);
        process.exit(1);
      }
    } else {
      console.log(`  Created ${data.user.email} (${data.user.id})`);
    }
  }

  // 2. Insert user_profiles
  console.log("\nSeeding user_profiles...");
  const { error: profileError } = await supabase.from("user_profiles").upsert(
    TEST_USERS.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      is_superadmin: u.is_superadmin,
    })),
    { onConflict: "id" }
  );
  if (profileError) {
    console.error("  Failed:", profileError.message);
    process.exit(1);
  }
  console.log("  Done");

  // 3. Insert test project
  console.log("Seeding test project...");
  const { error: projError } = await supabase.from("projects").upsert(
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      name: "Test Project",
      slug: "test-project",
      client_name: "Test Client",
      data_mode: "direct_entry",
      status: "active",
      created_by: TEST_USERS[0].id,
    },
    { onConflict: "id" }
  );
  if (projError) {
    console.error("  Failed:", projError.message);
    process.exit(1);
  }
  console.log("  Done");

  // 4. Insert project members
  console.log("Seeding project members...");
  const { error: memberError } = await supabase.from("project_members").upsert(
    [
      { project_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", user_id: TEST_USERS[0].id, role: "admin" },
      { project_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", user_id: TEST_USERS[1].id, role: "editor" },
    ],
    { onConflict: "project_id,user_id" }
  );
  if (memberError) {
    console.error("  Failed:", memberError.message);
    process.exit(1);
  }
  console.log("  Done");

  // 5. Insert test pages
  console.log("Seeding test pages...");
  const { error: pageError } = await supabase.from("pages").upsert(
    [
      { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", page_id: "1", name: "Test Page One", project_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", status: "not_started", depth: 1 },
      { id: "ffffffff-ffff-ffff-ffff-ffffffffffff", page_id: "2", name: "Test Page Two", project_id: "dddddddd-dddd-dddd-dddd-dddddddddddd", status: "drafting", depth: 1 },
    ],
    { onConflict: "id" }
  );
  if (pageError) {
    console.error("  Failed:", pageError.message);
    process.exit(1);
  }
  console.log("  Done");

  // 6. Insert test comment
  console.log("Seeding test comment...");
  const { error: commentError } = await supabase.from("comments").upsert(
    { id: "11111111-1111-1111-1111-111111111111", page_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", user_id: TEST_USERS[0].id, content: "Test comment by owner" },
    { onConflict: "id" }
  );
  if (commentError) {
    console.error("  Failed:", commentError.message);
    process.exit(1);
  }
  console.log("  Done");

  console.log("\nAll test data seeded successfully.");
}

main().catch(console.error);
