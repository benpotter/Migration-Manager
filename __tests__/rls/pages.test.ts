import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TEST_USERS, TEST_PROJECT, SEED_PAGES } from "../fixtures";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let anonClient: SupabaseClient;
let ownerClient: SupabaseClient;
let otherClient: SupabaseClient;
let adminClient: SupabaseClient;

beforeAll(async () => {
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await ownerClient.auth.signInWithPassword(TEST_USERS.owner);

  otherClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await otherClient.auth.signInWithPassword(TEST_USERS.other);

  // Bypasses RLS — use only for setup/teardown
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
});

describe("pages table — SELECT", () => {
  it("anon user sees no rows", async () => {
    const { data } = await anonClient
      .from("pages")
      .select()
      .eq("project_id", TEST_PROJECT.id);
    expect(data).toEqual([]);
  });

  it("project member (owner) sees project pages", async () => {
    const { data } = await ownerClient
      .from("pages")
      .select()
      .eq("project_id", TEST_PROJECT.id);
    expect(data!.length).toBeGreaterThanOrEqual(2);
    expect(data!.every((p) => p.project_id === TEST_PROJECT.id)).toBe(true);
  });

  it("non-member (other) can see pages (current RLS allows all authenticated SELECT)", async () => {
    // NOTE: Current RLS policy on pages uses USING(true) for authenticated users.
    // Access control for non-members is enforced at the API layer, not RLS.
    // If project-scoped RLS is added later, change this test accordingly.
    const { data } = await otherClient
      .from("pages")
      .select()
      .eq("project_id", TEST_PROJECT.id);
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("pages table — INSERT", () => {
  it("anon user cannot insert", async () => {
    const { error } = await anonClient.from("pages").insert({
      page_id: "anon-test",
      name: "Anon Page",
      project_id: TEST_PROJECT.id,
    });
    expect(error).not.toBeNull();
  });

  it("project member can insert a page", async () => {
    const pageId = `test-insert-${Date.now()}`;
    const { data, error } = await ownerClient
      .from("pages")
      .insert({
        page_id: pageId,
        name: "Inserted by Owner",
        project_id: TEST_PROJECT.id,
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe("Inserted by Owner");

    // Cleanup
    if (data) await adminClient.from("pages").delete().eq("id", data.id);
  });
});

describe("pages table — UPDATE", () => {
  it("non-member cannot update project pages", async () => {
    const { data } = await otherClient
      .from("pages")
      .update({ name: "Hacked" })
      .eq("id", SEED_PAGES.ownerPage.id)
      .select();
    // RLS silently blocks — returns empty
    expect(data).toEqual([]);
  });

  it("project member can update pages", async () => {
    const { data, error } = await ownerClient
      .from("pages")
      .update({ name: "Updated by Owner" })
      .eq("id", SEED_PAGES.ownerPage.id)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe("Updated by Owner");

    // Restore original name
    await adminClient
      .from("pages")
      .update({ name: SEED_PAGES.ownerPage.name })
      .eq("id", SEED_PAGES.ownerPage.id);
  });
});
