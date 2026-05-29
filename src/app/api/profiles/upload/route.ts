import { NextRequest, NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { savePendingUpload } from "@/lib/upload-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_PHOTOS = 8;

function photoUrlsForUpload(uploadId: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `/api/profiles/upload/${uploadId}/photos/${index}`);
}

function extractTextFallback(buffer: Buffer): string {
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
  while (searchFrom < raw.length && photos.length < MAX_PHOTOS) {
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
  while (searchFrom < raw.length && photos.length < MAX_PHOTOS) {
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
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const previews = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.byteLength > MAX_FILE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is too large. Max size is 4 MB per PDF on Vercel.`,
          },
          { status: 413 },
        );
      }

      const uploadedPdfGzipBase64 = gzipSync(buffer, { level: 9 }).toString("base64");
      const text = extractTextFallback(buffer);
      const profilePhotoDataUrls = extractAllImagesFallback(buffer);
      const profilePhotoDataUrl = profilePhotoDataUrls[0] ?? "";

      const uploadId = await savePendingUpload({
        sourceFileName: file.name,
        uploadedPdfGzipBase64,
        extractedText: text.slice(0, 4000),
        profilePhotoDataUrl,
        profilePhotoDataUrls,
      });

      const previewPhotoUrls = photoUrlsForUpload(uploadId, profilePhotoDataUrls.length);

      previews.push({
        uploadId,
        sourceFileName: file.name,
        extractedText: text.slice(0, 4000),
        profilePhotoDataUrl: previewPhotoUrls[0] ?? "",
        profilePhotoDataUrls: previewPhotoUrls,
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
  } catch (error) {
    console.error("[upload] failed:", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}
