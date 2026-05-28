import { NextRequest, NextResponse } from "next/server";
import { gzipSync } from "node:zlib";

export const runtime = "nodejs";

function extractTextFallback(buffer: Buffer): string {
  // Extract readable chunks from PDF byte stream as a best-effort fallback.
  const raw = buffer.toString("latin1");
  return raw
    .replace(/[^\x20-\x7E\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAllImagesFallback(buffer: Buffer): string[] {
  const raw = buffer.toString("binary");
  const photos: string[] = [];

  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const jpegStart = raw.indexOf("\xff\xd8\xff", searchFrom);
    if (jpegStart < 0) break;
    const jpegEnd = raw.indexOf("\xff\xd9", jpegStart + 3);
    if (jpegEnd > jpegStart) {
      const jpegBytes = Buffer.from(raw.slice(jpegStart, jpegEnd + 2), "binary");
      photos.push(`data:image/jpeg;base64,${jpegBytes.toString("base64")}`);
      searchFrom = jpegEnd + 2;
    } else {
      break;
    }
  }

  const pngHeader = "\x89PNG\r\n\x1a\n";
  searchFrom = 0;
  while (searchFrom < raw.length) {
    const pngStart = raw.indexOf(pngHeader, searchFrom);
    if (pngStart < 0) break;
    const pngEnd = raw.indexOf("IEND\xaeB`\x82", pngStart + pngHeader.length);
    if (pngEnd > pngStart) {
      const pngBytes = Buffer.from(raw.slice(pngStart, pngEnd + 8), "binary");
      photos.push(`data:image/png;base64,${pngBytes.toString("base64")}`);
      searchFrom = pngEnd + 8;
    } else {
      break;
    }
  }

  return photos;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const previews = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedPdfGzipBase64 = gzipSync(buffer, { level: 9 }).toString("base64");
    const text = extractTextFallback(buffer);
    const profilePhotoDataUrls = extractAllImagesFallback(buffer);
    const profilePhotoDataUrl = profilePhotoDataUrls[0] ?? "";

    previews.push({
      sourceFileName: file.name,
      uploadedPdfGzipBase64,
      extractedText: text.slice(0, 4000),
      profilePhotoDataUrl,
      profilePhotoDataUrls,
      name: "",
      pointOfContactName: "",
      pointOfContactPhone: "",
      age: "",
      city: "",
      workingLocation: "",
      education: "",
      occupation: "",
      salary: "",
      contact: "",
      notes: "",
      status: "new",
      priority: "medium",
    });
  }

  return NextResponse.json({ previews });
}
