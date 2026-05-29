import { NextRequest, NextResponse } from "next/server";
import { getPendingUpload } from "@/lib/upload-cache";

export const runtime = "nodejs";

type Params = { params: Promise<{ uploadId: string; index: string }> };

function dataUrlToBuffer(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function GET(_: NextRequest, { params }: Params) {
  const { uploadId, index } = await params;
  const photoIndex = Number(index);
  if (!Number.isFinite(photoIndex) || photoIndex < 0) {
    return NextResponse.json({ error: "Invalid photo index" }, { status: 400 });
  }

  const pending = await getPendingUpload(uploadId);
  if (!pending) {
    return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
  }

  const dataUrl = pending.profilePhotoDataUrls[photoIndex] ?? pending.profilePhotoDataUrl;
  if (!dataUrl) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const parsed = dataUrlToBuffer(dataUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid photo data" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(parsed.buffer), {
    headers: {
      "Content-Type": parsed.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
