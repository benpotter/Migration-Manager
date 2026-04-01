import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { TEST_USERS, TEST_PROJECT } from "../fixtures";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let ownerCookie: string;

/**
 * Helper: sign in via Supabase Auth and build a cookie string that
 * Next.js middleware will accept for session validation.
 */
async function getSessionCookie(email: string, password: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Auth failed for ${email}: ${error?.message}`);

  // Supabase SSR stores tokens in cookies with a project-ref prefix.
  // For local dev the ref is always "sb-127-auth-token" (localhost).
  const base64Session = btoa(JSON.stringify(data.session));
  return `sb-127-auth-token-auth-token.0=${encodeURIComponent(base64Session)}`;
}

beforeAll(async () => {
  ownerCookie = await getSessionCookie(TEST_USERS.owner.email, TEST_USERS.owner.password);
});

describe("GET /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await fetch(`${BASE_URL}/api/projects`);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.data).toBeNull();
    expect(json.error).toBeTruthy();
  });

  it("returns projects for an authenticated user", async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      headers: { Cookie: ownerCookie },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe("POST /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New", slug: "new" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify({ slug: "no-name" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("name");
  });

  it("returns 400 when slug is missing", async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify({ name: "No Slug" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("slug");
  });

  it("creates a project for superadmin", async () => {
    const slug = `test-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify({ name: "CI Test Project", slug }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("CI Test Project");
    expect(json.data.slug).toBe(slug);
    expect(json.error).toBeNull();
  });
});
