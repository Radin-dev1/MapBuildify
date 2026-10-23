import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, PASSWORD_HEADER } from "@/lib/auth";
import { deleteExample, getExample } from "@/lib/storage";
import { absolutize } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = await getExample(id);
  if (!example) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { example: absolutize(example, request.nextUrl.origin) },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkPassword(request.headers.get(PASSWORD_HEADER))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await deleteExample(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
