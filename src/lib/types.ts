export type BiodataStatus = "new" | "called" | "follow_up" | "hold" | "closed";
export type BiodataPriority = "high" | "medium" | "low";
export type InteractionType = "call" | "message" | "note";

export interface BiodataProfile {
  id: number;
  sourceFileName: string;
  uploadedAt: string;
  uploadedPdfGzipBase64: string;
  name: string;
  pointOfContactName: string;
  pointOfContactPhone: string;
  age: string;
  city: string;
  workingLocation: string;
  education: string;
  occupation: string;
  salary: string;
  contact: string;
  profilePhotoDataUrl: string;
  profilePhotoDataUrls: string[];
  status: BiodataStatus;
  priority: BiodataPriority;
  holdReason: string;
  nextFollowupAt: string;
  notes: string;
  extractedText: string;
}

export interface InteractionLog {
  id: number;
  profileId: number;
  interactionType: InteractionType;
  summary: string;
  outcome: string;
  nextActionDate: string;
  createdAt: string;
}

export interface StoreData {
  profiles: BiodataProfile[];
  interactionLogs: InteractionLog[];
  nextProfileId: number;
  nextInteractionId: number;
}
