import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, PASSWORD_HEADER } from "@/lib/auth";
import { filterExamples } from "@/lib/search";
import { getExample, listExamples, saveExample } from "@/lib/storage";
import { absolutize, parseExample } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Public catalog used by the mapbuildify Claude skill.
 * Query params: q (free text), category, tag, limit.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const filtered = filterExamples(await listExamples(), {
    q: searchParams.get("q"),
    category: searchParams.get("category"),
    tag: searchParams.get("tag"),
  });
  const limit = Number(searchParams.get("limit")) || filtered.length;
  const examples = filtered.slice(0, limit).map((e) => absolutize(e, origin));
  return NextResponse.json(
    { site: origin, count: examples.length, examples },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

export async function POST(request: NextRequest) {
  if (!checkPassword(request.headers.get(PASSWORD_HEADER))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const parsed = parseExample(await request.json().catch(() => null));
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }
  if (await getExample(parsed.id)) {
    return NextResponse.json({ error: "An example with this id already exists" }, { status: 409 });
  }
  await saveExample(parsed);
  return NextResponse.json({ example: parsed }, { status: 201 });
}
