import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

/**
 * GET  — probe whether the new columns already exist
 * POST — no-op here; the actual migration SQL must be run in Supabase dashboard.
 *        Returns the SQL to run so the admin panel can show it.
 */

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  // Try to select the new columns — if they don't exist, Supabase returns a column-not-found error
  const { data, error } = await sb
    .from("project_media")
    .select("id, category, description, is_cover")
    .limit(1);

  return NextResponse.json({
    migrated: !error,
    error: error?.message ?? null,
    sql: `-- Rode a migração 051 no Supabase (Dashboard → SQL Editor → New query).
-- Arquivo: supabase/migrations/051_project_media_classification.sql`,
  });
}

export async function POST(req: NextRequest) {
  // Same as GET but semantically acknowledges the user ran the migration
  return GET(req);
}
