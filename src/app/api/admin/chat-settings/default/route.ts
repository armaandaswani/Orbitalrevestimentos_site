import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SYSTEM_PROMPT } from "@/app/api/chat/route";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-auth") !== ADMIN_PW)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ prompt: DEFAULT_SYSTEM_PROMPT });
}
