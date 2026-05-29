import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";
import type { BiodataPriority, BiodataProfile, BiodataStatus, InteractionType } from "@/lib/types";

function stripHeavyFields(profile: BiodataProfile) {
  const { uploadedPdfGzipBase64, ...rest } = profile;
  void uploadedPdfGzipBase64;
  return rest;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const profileId = Number(id);
  const store = await readStore();

  const profile = store.profiles.find((item) => item.id === profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const interactionLogs = store.interactionLogs.filter((item) => item.profileId === profileId);
  return NextResponse.json({ profile: stripHeavyFields(profile), interactionLogs });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const profileId = Number(id);
  const body = await request.json();
  const store = await readStore();
  const index = store.profiles.findIndex((item) => item.id === profileId);
  if (index < 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const existing = store.profiles[index];
  const updated = {
    ...existing,
    sourceFileName: body.sourceFileName ?? existing.sourceFileName,
    uploadedPdfGzipBase64: existing.uploadedPdfGzipBase64,
    name: body.name ?? existing.name,
    pointOfContactName: body.pointOfContactName ?? existing.pointOfContactName,
    pointOfContactPhone: body.pointOfContactPhone ?? existing.pointOfContactPhone,
    age: body.age ?? existing.age,
    city: body.city ?? existing.city,
    workingLocation: body.workingLocation ?? existing.workingLocation,
    education: body.education ?? existing.education,
    occupation: body.occupation ?? existing.occupation,
    salary: body.salary ?? existing.salary,
    contact: body.contact ?? existing.contact,
    profilePhotoDataUrl: body.profilePhotoDataUrl ?? existing.profilePhotoDataUrl,
    profilePhotoDataUrls:
      body.profilePhotoDataUrls ??
      (body.profilePhotoDataUrl
        ? [body.profilePhotoDataUrl]
        : existing.profilePhotoDataUrls ?? (existing.profilePhotoDataUrl ? [existing.profilePhotoDataUrl] : [])),
    holdReason: body.holdReason ?? existing.holdReason,
    nextFollowupAt: body.nextFollowupAt ?? existing.nextFollowupAt,
    notes: body.notes ?? existing.notes,
    extractedText: body.extractedText ?? existing.extractedText,
    status: (body.status ?? existing.status) as BiodataStatus,
    priority: (body.priority ?? existing.priority) as BiodataPriority,
  };
  store.profiles[index] = updated;

  if (body.logSummary) {
    store.interactionLogs.unshift({
      id: store.nextInteractionId++,
      profileId,
      interactionType: (body.interactionType ?? "note") as InteractionType,
      summary: body.logSummary,
      outcome: body.logOutcome ?? "",
      nextActionDate: body.nextFollowupAt ?? updated.nextFollowupAt ?? "",
      createdAt: new Date().toISOString(),
    });
  }

  await writeStore(store);
  return NextResponse.json({ profile: stripHeavyFields(updated) });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const profileId = Number(id);
  const store = await readStore();
  const exists = store.profiles.some((item) => item.id === profileId);
  if (!exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  store.profiles = store.profiles.filter((item) => item.id !== profileId);
  store.interactionLogs = store.interactionLogs.filter((item) => item.profileId !== profileId);
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
