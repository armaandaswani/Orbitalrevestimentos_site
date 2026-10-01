import { NextRequest, NextResponse } from "next/server";
import { agendaFeedToken, isAdminRequest } from "@/lib/admin-auth";

/** GET /api/admin/agenda-feed — link secreto da agenda (iCal) para assinar no Google Calendar. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  return NextResponse.json({ url: `${base.replace(/\/$/, "")}/api/agenda/feed?t=${agendaFeedToken()}` });
}
