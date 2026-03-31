/**
 * One-time script to provision MAC team members from the team roster CSV.
 *
 * Usage:
 *   npx tsx scripts/provision-mac-users.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *     (loaded from .env.local automatically)
 *   - The CSV file path below must be correct
 *   - The app must be running (or use the Supabase client directly)
 *
 * This script calls the Supabase Admin API directly (no running app needed).
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load env from .env.local
config({ path: ".env.local" });

const CSV_PATH =
  "/Users/benpotter/Downloads/MAC Team Roster (Updated August 2025) - MAC Team Roster.csv";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function cleanName(name: string): string {
  // Strip parenthetical nicknames like (""Katt-er-lay"")
  return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

async function main() {
  console.log("Reading CSV...");
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  console.log(`Found ${rows.length} rows in CSV\n`);

  const users: Array<{ email: string; name: string }> = [];

  for (const row of rows) {
    const email = row["Email - MAC"]?.trim().toLowerCase();
    const firstName = cleanName(row["First Name"] ?? "");
    const lastName = cleanName(row["Last Name"] ?? "");

    if (!email || email === "n/a" || !email.includes("@")) {
      continue;
    }

    const name = `${firstName} ${lastName}`.trim();
    users.push({ email, name });
  }

  console.log(`${users.length} users with valid MAC emails\n`);

  let created = 0;
  let skipped = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const u of users) {
    process.stdout.write(`  ${u.email} ... `);

    // Try creating in Supabase Auth
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: u.email,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });

    let userId: string | null = null;

    if (createError) {
      if (
        createError.message.includes("already been registered") ||
        createError.status === 422
      ) {
        // Already exists — look up their ID
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (au) => au.email?.toLowerCase() === u.email
        );
        if (existing) {
          userId = existing.id;
          skipped++;
          process.stdout.write("already exists, ");
        } else {
          errors.push({ email: u.email, error: "Exists but not found" });
          console.log("ERROR: exists but not found");
          continue;
        }
      } else {
        errors.push({ email: u.email, error: createError.message });
        console.log(`ERROR: ${createError.message}`);
        continue;
      }
    } else {
      userId = newUser.user.id;
      created++;
      process.stdout.write("created, ");
    }

    // Upsert profile
    if (userId) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            email: u.email,
            name: u.name,
            role: "editor",
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.log(`profile error: ${profileError.message}`);
        errors.push({ email: u.email, error: `Profile: ${profileError.message}` });
      } else {
        console.log("profile OK");
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Created: ${created}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  ${e.email}: ${e.error}`));
  }
}

main().catch(console.error);
