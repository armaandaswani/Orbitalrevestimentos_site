import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SYSTEM_PROMPT } from "@/app/api/chat/route";

import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ prompt: DEFAULT_SYSTEM_PROMPT });
}
