import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { readStore } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const profileId = Number(id);
  const store = await readStore();
  const profile = store.profiles.find((item) => item.id === profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!profile.uploadedPdfGzipBase64) {
    return NextResponse.json({ error: "PDF not available for this profile" }, { status: 404 });
  }

  try {
    const compressed = Buffer.from(profile.uploadedPdfGzipBase64, "base64");
    const pdfBuffer = gunzipSync(compressed);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${profile.sourceFileName || "profile.pdf"}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Stored PDF is invalid" }, { status: 500 });
  }
}
