import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { checkPassword } from "@/lib/auth";
import { MAX_FILE_BYTES } from "@/lib/types";

/** Issues short-lived tokens so the browser can upload large files straight to Vercel Blob. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { password } = JSON.parse(clientPayload ?? "{}") as { password?: string };
        if (!checkPassword(password)) throw new Error("Wrong password");
        if (!/^files\/[a-z0-9-]{4,64}\/[^/]+$/.test(pathname)) throw new Error("Invalid path");
        return { maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
