import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { StoreData } from "@/lib/types";

const STORE_PATH = join(process.cwd(), "data", "store.json");

const initialStore: StoreData = {
  profiles: [],
  interactionLogs: [],
  nextProfileId: 1,
  nextInteractionId: 1,
};

let storeWriteQueue = Promise.resolve();

async function ensureStore() {
  try {
    await readFile(STORE_PATH, "utf-8");
  } catch {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf-8");
  }
}

function normalizeStore(parsed: StoreData): StoreData {
  parsed.profiles = (parsed.profiles ?? []).map((profile) => ({
    ...profile,
    uploadedPdfGzipBase64: profile.uploadedPdfGzipBase64 ?? "",
    pointOfContactName: profile.pointOfContactName ?? "",
    pointOfContactPhone: profile.pointOfContactPhone ?? "",
    workingLocation: profile.workingLocation ?? "",
    salary: profile.salary ?? "",
    notes: profile.notes ?? "",
    profilePhotoDataUrl: profile.profilePhotoDataUrl ?? "",
    profilePhotoDataUrls: profile.profilePhotoDataUrls ?? (profile.profilePhotoDataUrl ? [profile.profilePhotoDataUrl] : []),
  }));
  parsed.interactionLogs = parsed.interactionLogs ?? [];
  parsed.nextProfileId = parsed.nextProfileId ?? parsed.profiles.length + 1;
  parsed.nextInteractionId = parsed.nextInteractionId ?? parsed.interactionLogs.length + 1;
  return parsed;
}

function recoverJson(raw: string): StoreData {
  const firstBrace = raw.indexOf("{");
  if (firstBrace < 0) {
    return structuredClone(initialStore);
  }

  let depth = 0;
  let inString = false;
  let escaping = false;
  let endIndex = -1;
  for (let i = firstBrace; i < raw.length; i += 1) {
    const char = raw[i];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex < 0) {
    return structuredClone(initialStore);
  }

  return normalizeStore(JSON.parse(raw.slice(firstBrace, endIndex + 1)) as StoreData);
}

export async function readStore(): Promise<StoreData> {
  await ensureStore();
  await storeWriteQueue;
  const raw = await readFile(STORE_PATH, "utf-8");
  try {
    return normalizeStore(JSON.parse(raw) as StoreData);
  } catch {
    const recovered = recoverJson(raw);
    await writeFile(STORE_PATH, JSON.stringify(recovered, null, 2), "utf-8");
    return recovered;
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  await ensureStore();
  const normalized = normalizeStore(data);
  const nextWrite = storeWriteQueue.then(() =>
    writeFile(STORE_PATH, JSON.stringify(normalized, null, 2), "utf-8"),
  );
  storeWriteQueue = nextWrite.catch(() => undefined);
  await nextWrite;
}
