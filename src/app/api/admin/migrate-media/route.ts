import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

/**
 * GET  — probe whether the new columns already exist
 * POST — no-op here; the actual migration SQL must be run in Supabase dashboard.
 *        Returns the SQL to run so the admin panel can show it.
 */

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-auth") !== ADMIN_PW)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  // Try to select the new columns — if they don't exist, Supabase returns a column-not-found error
  const { data, error } = await sb
    .from("project_media")
    .select("id, category, description")
    .limit(1);

  return NextResponse.json({
    migrated: !error,
    error: error?.message ?? null,
    sql: `-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query):
ALTER TABLE project_media ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'geral';
ALTER TABLE project_media ADD COLUMN IF NOT EXISTS description TEXT;`,
  });
}

export async function POST(req: NextRequest) {
  // Same as GET but semantically acknowledges the user ran the migration
  return GET(req);
}
