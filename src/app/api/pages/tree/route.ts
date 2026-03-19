import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildTree } from "@/lib/tree-builder";
import type { PageRow } from "@/types";

// GET /api/pages/tree - Get nested tree JSON
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Supabase defaults to 1000 rows — fetch all pages in batches
  const allPages: PageRow[] = [];
  const batchSize = 1000;
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data: batch, error: batchError } = await supabase
      .from("pages")
      .select("*")
      .order("sort_order", { ascending: true })
      .range(from, from + batchSize - 1);

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allPages.push(...(batch as PageRow[]));
      from += batchSize;
      if (batch.length < batchSize) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  const tree = buildTree(allPages);

  return NextResponse.json({ data: tree });
}
