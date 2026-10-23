import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, PASSWORD_HEADER } from "@/lib/auth";
import { isValidId, saveLocalFile, storageMode } from "@/lib/storage";
import { MAX_FILE_BYTES } from "@/lib/types";

/** Local (disk) mode upload. In Blob mode the browser uploads straight to Blob. */
export async function POST(request: NextRequest) {
  if (storageMode() !== "local") {
    return NextResponse.json({ error: "Use Blob client uploads" }, { status: 400 });
  }
  if (!checkPassword(request.headers.get(PASSWORD_HEADER))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const file = form.get("file");
  if (!isValidId(id) || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing id or file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }
  const url = await saveLocalFile(id, file.name, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url });
}
