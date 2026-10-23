import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, PASSWORD_HEADER } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ok = checkPassword(request.headers.get(PASSWORD_HEADER));
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
