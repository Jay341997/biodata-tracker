import { NextRequest, NextResponse } from "next/server";
import { isAfter, isBefore, startOfDay } from "date-fns";
import { readStore, writeStore } from "@/lib/store";
import { deletePendingUpload, getPendingUpload } from "@/lib/upload-cache";
import type { BiodataPriority, BiodataProfile, BiodataStatus, InteractionType } from "@/lib/types";

function stripHeavyFields(profile: BiodataProfile) {
  const { uploadedPdfGzipBase64, ...rest } = profile;
  void uploadedPdfGzipBase64;
  return rest;
}

export async function GET(request: NextRequest) {
  const store = await readStore();
  const { searchParams } = new URL(request.url);

  const query = (searchParams.get("q") ?? "").toLowerCase();
  const statusFilter = searchParams.get("status") as BiodataStatus | null;
  const priorityFilter = searchParams.get("priority") as BiodataPriority | null;

  const profiles = store.profiles.filter((profile) => {
    if (statusFilter && profile.status !== statusFilter) return false;
    if (priorityFilter && profile.priority !== priorityFilter) return false;
    if (!query) return true;
    return [
      profile.name,
      profile.pointOfContactName,
      profile.pointOfContactPhone,
      profile.city,
      profile.workingLocation,
      profile.education,
      profile.occupation,
      profile.salary,
      profile.contact,
      profile.notes,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const today = startOfDay(new Date());
  const reminders = profiles.reduce(
    (acc, profile) => {
      if (!profile.nextFollowupAt) return acc;
      const followup = new Date(profile.nextFollowupAt);
      if (isBefore(followup, today)) acc.overdue += 1;
      else if (!isAfter(followup, today)) acc.today += 1;
      return acc;
    },
    { overdue: 0, today: 0 },
  );

  const highPriorityPending = profiles.filter(
    (profile) => profile.priority === "high" && profile.status !== "closed" && profile.status !== "called",
  ).length;

  return NextResponse.json({
    profiles: profiles.map(stripHeavyFields),
    reminders,
    highPriorityPending,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const store = await readStore();
  const now = new Date().toISOString();

  let uploadedPdfGzipBase64 = body.uploadedPdfGzipBase64 ?? "";
  let extractedText = body.extractedText ?? "";
  let profilePhotoDataUrl = body.profilePhotoDataUrl ?? "";
  let profilePhotoDataUrls =
    body.profilePhotoDataUrls ?? (body.profilePhotoDataUrl ? [body.profilePhotoDataUrl] : []);

  if (body.uploadId) {
    const pending = await getPendingUpload(String(body.uploadId));
    if (!pending) {
      return NextResponse.json({ error: "Upload session expired. Please upload PDF again." }, { status: 410 });
    }
    uploadedPdfGzipBase64 = pending.uploadedPdfGzipBase64;
    extractedText = pending.extractedText;
    profilePhotoDataUrl = pending.profilePhotoDataUrl;
    profilePhotoDataUrls = pending.profilePhotoDataUrls;
    await deletePendingUpload(String(body.uploadId));
  }

  const profile = {
    id: store.nextProfileId++,
    sourceFileName: body.sourceFileName ?? "manual-entry",
    uploadedAt: now,
    uploadedPdfGzipBase64,
    name: body.name ?? "",
    pointOfContactName: body.pointOfContactName ?? "",
    pointOfContactPhone: body.pointOfContactPhone ?? "",
    age: body.age ?? "",
    city: body.city ?? "",
    workingLocation: body.workingLocation ?? "",
    education: body.education ?? "",
    occupation: body.occupation ?? "",
    salary: body.salary ?? "",
    contact: body.contact ?? "",
    profilePhotoDataUrl,
    profilePhotoDataUrls,
    status: (body.status ?? "new") as BiodataStatus,
    priority: (body.priority ?? "medium") as BiodataPriority,
    holdReason: body.holdReason ?? "",
    nextFollowupAt: body.nextFollowupAt ?? "",
    notes: body.notes ?? "",
    extractedText,
  };

  store.profiles.unshift(profile);

  const interactionType = (body.interactionType ?? "note") as InteractionType;
  if (body.notes) {
    store.interactionLogs.unshift({
      id: store.nextInteractionId++,
      profileId: profile.id,
      interactionType,
      summary: body.notes,
      outcome: body.outcome ?? "created",
      nextActionDate: body.nextFollowupAt ?? "",
      createdAt: now,
    });
  }

  await writeStore(store);
  return NextResponse.json({ profile: stripHeavyFields(profile) }, { status: 201 });
}
