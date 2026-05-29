"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { BiodataPriority, BiodataProfile, BiodataStatus, InteractionLog } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const statusColumns: BiodataStatus[] = ["new", "called", "follow_up", "hold", "closed"];
const statusLabels: Record<BiodataStatus, string> = {
  new: "New",
  called: "Called",
  follow_up: "Follow Up",
  hold: "Hold",
  closed: "Closed",
};

type DashboardData = {
  profiles: BiodataProfile[];
  reminders: { overdue: number; today: number };
  highPriorityPending: number;
};

type UploadPreview = Partial<BiodataProfile> & { uploadId?: string };

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData>({
    profiles: [],
    reminders: { overdue: 0, today: 0 },
    highPriorityPending: 0,
  });
  const [selectedProfile, setSelectedProfile] = useState<BiodataProfile | null>(null);
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPreviews, setUploadPreviews] = useState<UploadPreview[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingProfileId, setUpdatingProfileId] = useState<number | null>(null);
  const [photoModalSrc, setPhotoModalSrc] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  function getPhotoList(profile: Partial<BiodataProfile> | BiodataProfile): string[] {
    if (profile.profilePhotoDataUrls?.length) return profile.profilePhotoDataUrls;
    if (profile.profilePhotoDataUrl) return [profile.profilePhotoDataUrl];
    return [];
  }

  const board = useMemo(() => {
    return statusColumns.reduce(
      (acc, status) => {
        acc[status] = dashboard.profiles.filter((profile) => profile.status === status);
        return acc;
      },
      {} as Record<BiodataStatus, BiodataProfile[]>,
    );
  }, [dashboard.profiles]);

  async function fetchData(query = "") {
    const res = await fetch(`/api/profiles?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as DashboardData;
    setDashboard(data);
  }

  async function fetchProfileDetails(profileId: number) {
    const res = await fetch(`/api/profiles/${profileId}`);
    const data = await res.json();
    setSelectedProfile(data.profile);
    setLogs(data.interactionLogs ?? []);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPhotoModalSrc(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function processPdfFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const res = await fetch("/api/profiles/upload", { method: "POST", body: form });
      const data = (await res.json()) as { previews?: UploadPreview[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed. Please retry.");
      }
      setUploadPreviews(data.previews ?? []);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please retry.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadPdfs(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = input.files;
    if (!files?.length) return;
    await processPdfFiles(Array.from(files));
    // Reset the file input so selecting the same PDF triggers onChange again.
    input.value = "";
  }

  async function savePreview(preview: UploadPreview) {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: preview.uploadId,
        sourceFileName: preview.sourceFileName,
        name: preview.name,
        pointOfContactName: preview.pointOfContactName,
        pointOfContactPhone: preview.pointOfContactPhone,
        age: preview.age,
        city: preview.city,
        workingLocation: preview.workingLocation,
        education: preview.education,
        occupation: preview.occupation,
        salary: preview.salary,
        contact: preview.contact,
        notes: preview.notes,
        status: preview.status,
        priority: preview.priority,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setActionError(data.error ?? "Could not save profile. Please retry.");
      return;
    }
    const data = (await res.json()) as { profile?: BiodataProfile };
    setUploadPreviews((prev) => prev.filter((item) => item !== preview));
    await fetchData(search);
    if (data.profile?.id) {
      await fetchProfileDetails(data.profile.id);
    }
  }

  function updatePreview(index: number, field: keyof BiodataProfile, value: string) {
    setUploadPreviews((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  }

  async function quickUpdate(
    profile: BiodataProfile,
    updates: Partial<BiodataProfile> & { logSummary?: string; interactionType?: "call" | "message" | "note" },
  ) {
    setUpdatingProfileId(profile.id);
    setActionError("");
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error("Update failed");
      }
      await fetchData(search);
      if (selectedProfile?.id === profile.id) {
        await fetchProfileDetails(profile.id);
      }
    } catch {
      setActionError("Could not update status. Please try again.");
    } finally {
      setUpdatingProfileId(null);
    }
  }

  async function deleteProfile(profile: BiodataProfile) {
    const confirmed = window.confirm(`Delete profile "${profile.name || "Unnamed"}"?`);
    if (!confirmed) return;
    setUpdatingProfileId(profile.id);
    setActionError("");
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Delete failed");
      }
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null);
        setLogs([]);
      }
      await fetchData(search);
    } catch {
      setActionError("Could not delete profile. Please try again.");
    } finally {
      setUpdatingProfileId(null);
    }
  }

  async function saveCardNote(profile: BiodataProfile) {
    const note = noteDrafts[profile.id] ?? profile.notes ?? "";
    await quickUpdate(profile, {
      notes: note,
      logSummary: "Updated note",
      interactionType: "note",
    });
  }

  useEffect(() => {
    async function onPaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items ?? []);
      const pastedPdfFiles = items
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => {
          if (!file) return false;
          return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        });

      if (!pastedPdfFiles.length) return;
      event.preventDefault();
      await processPdfFiles(pastedPdfFiles);
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="ds-page">
      <main className="ds-container">
        <Card className="rounded-2xl p-5">
          <h1 className="text-2xl font-bold tracking-tight">Biodata Tracker</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage PDF intake, call updates, follow-ups, and hiring decisions in one place.
          </p>
        </Card>

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="border-slate-300 p-4 text-sm transition hover:border-blue-300 hover:shadow">
            <p className="font-semibold text-slate-800">Upload PDF(s)</p>
            <p className="mt-0.5 text-xs text-slate-500">
              You can re-upload the same file after each run. Paste with Ctrl/Cmd+V is also supported.
            </p>
            <Input
              className="mt-3 block border-slate-200 bg-slate-50 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              type="file"
              accept="application/pdf"
              multiple
              onChange={uploadPdfs}
              disabled={uploading}
            />
            {uploading ? <span className="mt-2 block text-xs text-slate-500">Processing PDFs...</span> : null}
            {uploadError ? <span className="mt-2 block text-xs text-rose-600">{uploadError}</span> : null}
          </Card>
        </section>

        <Card className="p-3">
          <Input
            className="rounded-lg px-3 py-2"
            placeholder="Search by name, occupation, salary, location, contact, note"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Card>
        {actionError ? (
          <Card className="border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </Card>
        ) : null}

        {uploadPreviews.length > 0 ? (
          <Card className="border-blue-200 bg-blue-50/30 p-4">
            <h2 className="mb-3 text-lg font-semibold">Review extracted biodata</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {uploadPreviews.map((preview, index) => (
                <div key={`${preview.sourceFileName ?? "file"}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">{preview.sourceFileName || "Uploaded file"}</p>
                  {getPhotoList(preview).length > 0 ? (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {getPhotoList(preview).map((photo, photoIndex) => (
                        <Image
                          key={`${preview.sourceFileName ?? "file"}-photo-${photoIndex}`}
                          src={photo}
                          alt={`Extracted profile ${photoIndex + 1}`}
                          width={96}
                          height={96}
                          unoptimized
                          className="h-24 w-24 shrink-0 cursor-zoom-in rounded-lg border border-slate-200 object-cover"
                          onClick={() => setPhotoModalSrc(photo)}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2">
                    <Input placeholder="Name" value={preview.name ?? ""} onChange={(e) => updatePreview(index, "name", e.target.value)} />
                    <Input placeholder="Point of Contact Name" value={preview.pointOfContactName ?? ""} onChange={(e) => updatePreview(index, "pointOfContactName", e.target.value)} />
                    <Input placeholder="Point of Contact Phone" value={preview.pointOfContactPhone ?? ""} onChange={(e) => updatePreview(index, "pointOfContactPhone", e.target.value)} />
                    <Input placeholder="Age" value={preview.age ?? ""} onChange={(e) => updatePreview(index, "age", e.target.value)} />
                    <Input placeholder="City" value={preview.city ?? ""} onChange={(e) => updatePreview(index, "city", e.target.value)} />
                    <Input placeholder="Working Location" value={preview.workingLocation ?? ""} onChange={(e) => updatePreview(index, "workingLocation", e.target.value)} />
                    <Input placeholder="Education" value={preview.education ?? ""} onChange={(e) => updatePreview(index, "education", e.target.value)} />
                    <Input placeholder="Occupation" value={preview.occupation ?? ""} onChange={(e) => updatePreview(index, "occupation", e.target.value)} />
                    <Input placeholder="Salary" value={preview.salary ?? ""} onChange={(e) => updatePreview(index, "salary", e.target.value)} />
                    <Input placeholder="Contact" value={preview.contact ?? ""} onChange={(e) => updatePreview(index, "contact", e.target.value)} />
                    <Textarea
                      placeholder="Note"
                      value={preview.notes ?? ""}
                      onChange={(e) => updatePreview(index, "notes", e.target.value)}
                    />
                  </div>
                  <Button className="mt-3" variant="primary" onClick={() => void savePreview(preview)}>
                    Save Profile
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <section className="grid gap-3 xl:grid-cols-5">
          {statusColumns.map((status) => (
            <div key={status} className="min-h-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-slate-700">
                <span>{statusLabels[status]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{board[status].length}</span>
              </h3>
              <div className="space-y-2">
                {board[status].map((profile) => (
                  <article key={profile.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                    {getPhotoList(profile).length > 0 ? (
                      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
                        {getPhotoList(profile)
                          .slice(0, 4)
                          .map((photo, photoIndex) => (
                            <Image
                              key={`card-photo-${profile.id}-${photoIndex}`}
                              src={photo}
                              alt={`${profile.name || "Profile"} photo ${photoIndex + 1}`}
                              width={44}
                              height={44}
                              unoptimized
                              className="h-11 w-11 shrink-0 cursor-zoom-in rounded-md border border-slate-200 object-cover"
                              onClick={() => setPhotoModalSrc(photo)}
                            />
                          ))}
                      </div>
                    ) : null}
                    <button className="text-left font-semibold text-blue-700 transition hover:text-blue-900" onClick={() => void fetchProfileDetails(profile.id)}>
                      {profile.name || "Unnamed"}
                    </button>
                    <a
                      href={`/api/profiles/${profile.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-blue-700 underline hover:text-blue-900"
                    >
                      View PDF
                    </a>
                    <p className="text-slate-700">{profile.city || "-"}</p>
                    <p className="text-xs text-slate-600">
                      {profile.occupation || "-"} | {profile.salary || "-"}
                    </p>
                    <p className="text-xs text-slate-500">{profile.contact || "-"}</p>
                    <Textarea
                      className="mt-2 px-2 py-1 text-xs"
                      placeholder="Add note"
                      value={noteDrafts[profile.id] ?? profile.notes ?? ""}
                      onChange={(event) =>
                        setNoteDrafts((prev) => ({ ...prev, [profile.id]: event.target.value }))
                      }
                    />
                    <Button
                      disabled={updatingProfileId === profile.id}
                      className="mt-1"
                      size="sm"
                      variant="secondary"
                      onClick={() => void saveCardNote(profile)}
                    >
                      Save Note
                    </Button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button disabled={updatingProfileId === profile.id} size="sm" variant="secondary" onClick={() => void quickUpdate(profile, { status: "called", logSummary: "Called candidate", interactionType: "call" })}>
                        Called
                      </Button>
                      <Button disabled={updatingProfileId === profile.id} size="sm" variant="secondary" onClick={() => void quickUpdate(profile, { status: "follow_up", nextFollowupAt: new Date().toISOString(), logSummary: "Follow-up required", interactionType: "note" })}>
                        Follow-up
                      </Button>
                      <Button disabled={updatingProfileId === profile.id} size="sm" variant="secondary" onClick={() => void quickUpdate(profile, { status: "hold", holdReason: "Temporarily paused", logSummary: "Moved to hold", interactionType: "note" })}>
                        Hold
                      </Button>
                      <Button
                        disabled={updatingProfileId === profile.id}
                        size="sm"
                        variant="danger"
                        onClick={() => void deleteProfile(profile)}
                      >
                        Delete
                      </Button>
                    </div>
                    <Select
                      className="mt-2"
                      value={profile.priority}
                      disabled={updatingProfileId === profile.id}
                      onChange={(event) => void quickUpdate(profile, { priority: event.target.value as BiodataPriority, logSummary: `Priority set to ${event.target.value}` })}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        {selectedProfile ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              {getPhotoList(selectedProfile).length > 0 ? (
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {getPhotoList(selectedProfile).map((photo, photoIndex) => (
                    <Image
                      key={`selected-photo-${photoIndex}`}
                      src={photo}
                      alt={`${selectedProfile.name || "Profile"} photo ${photoIndex + 1}`}
                      width={96}
                      height={96}
                      unoptimized
                      className="h-24 w-24 shrink-0 cursor-zoom-in rounded-lg border border-slate-200 object-cover"
                      onClick={() => setPhotoModalSrc(photo)}
                    />
                  ))}
                </div>
              ) : null}
              <div>
                <h2 className="text-lg font-semibold">{selectedProfile.name || "Profile details"}</h2>
                <p className="text-sm text-slate-600">
                  {selectedProfile.education} | {selectedProfile.occupation} | {selectedProfile.salary || "-"}
                </p>
                <p className="text-sm text-slate-600">
                  Location: {selectedProfile.workingLocation || selectedProfile.city || "-"}
                </p>
                <p className="text-sm text-slate-600">
                  POC: {selectedProfile.pointOfContactName || "-"} | {selectedProfile.pointOfContactPhone || "-"}
                </p>
              </div>
            </div>
            <p className="mt-1 text-sm">Next Follow-up: {selectedProfile.nextFollowupAt || "-"}</p>
            <p className="text-sm">Hold Reason: {selectedProfile.holdReason || "-"}</p>
            <p className="text-sm">Note: {selectedProfile.notes || "-"}</p>
            <a
              href={`/api/profiles/${selectedProfile.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-medium text-blue-700 underline hover:text-blue-900"
            >
              View Uploaded PDF
            </a>
            <Button
              disabled={updatingProfileId === selectedProfile.id}
              className="mt-2"
              variant="danger"
              onClick={() => void deleteProfile(selectedProfile)}
            >
              Delete Profile
            </Button>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Interaction timeline</h3>
            <div className="mt-2 space-y-2 text-sm">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 p-2.5">
                  <p className="font-medium">
                    {log.interactionType.toUpperCase()} - {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p>{log.summary}</p>
                  <p className="text-xs text-slate-500">{log.outcome}</p>
                </div>
              ))}
              {logs.length === 0 ? <p className="text-slate-500">No interactions yet.</p> : null}
            </div>
          </section>
        ) : null}
      </main>
      {photoModalSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 p-4"
          onClick={() => setPhotoModalSrc(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-sm font-medium text-slate-900 hover:bg-white"
              onClick={() => setPhotoModalSrc(null)}
            >
              Close
            </button>
            <Image
              src={photoModalSrc}
              alt="Full photo preview"
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
