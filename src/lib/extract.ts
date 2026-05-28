import type { BiodataPriority, BiodataStatus } from "@/lib/types";

type ExtractedFields = {
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
  notes: string;
  status: BiodataStatus;
  priority: BiodataPriority;
};

function capture(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}

export function extractFields(rawText: string): ExtractedFields {
  const compact = rawText.replace(/\s+/g, " ").trim();

  return {
    name: capture(compact, [/name\s*[:\-]\s*([^|,;]+)/i]),
    pointOfContactName: capture(compact, [
      /point\s*of\s*contact\s*[:\-]\s*([^|,;]+)/i,
      /poc\s*name\s*[:\-]\s*([^|,;]+)/i,
      /guardian\s*name\s*[:\-]\s*([^|,;]+)/i,
    ]),
    pointOfContactPhone: capture(compact, [
      /poc\s*(?:phone|mobile|contact)\s*[:\-]\s*([+\d][\d\s-]{7,})/i,
      /point\s*of\s*contact\s*(?:phone|mobile|contact)\s*[:\-]\s*([+\d][\d\s-]{7,})/i,
      /guardian\s*(?:phone|mobile|contact)\s*[:\-]\s*([+\d][\d\s-]{7,})/i,
    ]),
    age: capture(compact, [/age\s*[:\-]\s*(\d{2})/i]),
    city: capture(compact, [/city\s*[:\-]\s*([^|,;]+)/i, /location\s*[:\-]\s*([^|,;]+)/i]),
    workingLocation: capture(compact, [/working\s*location\s*[:\-]\s*([^|,;]+)/i, /work\s*location\s*[:\-]\s*([^|,;]+)/i]),
    education: capture(compact, [/education\s*[:\-]\s*([^|;]+)/i, /qualification\s*[:\-]\s*([^|;]+)/i]),
    occupation: capture(compact, [/occupation\s*[:\-]\s*([^|;]+)/i, /profession\s*[:\-]\s*([^|;]+)/i]),
    salary: capture(compact, [/salary\s*[:\-]\s*([^|,;]+)/i, /ctc\s*[:\-]\s*([^|,;]+)/i]),
    contact: capture(compact, [/contact\s*[:\-]\s*([+\d][\d\s-]{7,})/i, /mobile\s*[:\-]\s*([+\d][\d\s-]{7,})/i]),
    notes: "",
    status: "new",
    priority: "medium",
  };
}
