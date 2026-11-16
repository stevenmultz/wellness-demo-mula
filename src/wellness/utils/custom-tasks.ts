import { isSafePhotoUrl } from "./url-safety";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizeCustomTaskSubmission(
  fields: CustomTaskField[],
  rawValues: Record<string, unknown>
): { ok: true; values: Record<string, unknown> } | { ok: false; message: string } {
  const sanitizedValues: Record<string, unknown> = Object.create(null);

  for (const field of fields) {
    if (FORBIDDEN_KEYS.has(field.key)) {
      continue;
    }

    const rawVal = Object.prototype.hasOwnProperty.call(rawValues, field.key)
      ? rawValues[field.key]
      : undefined;

    if (field.required) {
      if (field.type === "boolean") {
        if (rawVal !== true) {
          return { ok: false, message: `Please complete "${field.label}" before saving.` };
        }
      } else if (
        rawVal === undefined ||
        rawVal === null ||
        (typeof rawVal === "string" && rawVal.trim() === "")
      ) {
        return { ok: false, message: `"${field.label}" is required.` };
      }
    }

    if (rawVal === undefined || rawVal === null || rawVal === "") {
      continue;
    }

    switch (field.type) {
      case "number":
      case "rating": {
        const n = typeof rawVal === "number" ? rawVal : Number(rawVal);
        if (!Number.isFinite(n)) {
          return { ok: false, message: `"${field.label}" must be a valid number.` };
        }
        if (field.min !== undefined && n < field.min) {
          return { ok: false, message: `"${field.label}" must be at least ${field.min}.` };
        }
        if (field.max !== undefined && n > field.max) {
          return { ok: false, message: `"${field.label}" cannot exceed ${field.max}.` };
        }
        sanitizedValues[field.key] = n;
        break;
      }
      case "boolean": {
        if (typeof rawVal !== "boolean") {
          return { ok: false, message: `"${field.label}" must be true or false.` };
        }
        sanitizedValues[field.key] = rawVal;
        break;
      }
      case "select": {
        if (typeof rawVal !== "string") {
          return { ok: false, message: `Invalid selection for "${field.label}".` };
        }
        const trimmed = rawVal.trim();
        if (field.options && field.options.length > 0 && !field.options.includes(trimmed)) {
          return { ok: false, message: `Invalid option selected for "${field.label}".` };
        }
        sanitizedValues[field.key] = trimmed.slice(0, 200);
        break;
      }
      case "photo": {
        if (typeof rawVal !== "string" || !isSafePhotoUrl(rawVal) || rawVal.length > 2_000_000) {
          return { ok: false, message: `Invalid photo URL for "${field.label}".` };
        }
        sanitizedValues[field.key] = rawVal.trim();
        break;
      }
      case "textarea": {
        if (typeof rawVal !== "string") {
          return { ok: false, message: `"${field.label}" must be text.` };
        }
        sanitizedValues[field.key] = rawVal.trim().slice(0, 4000);
        break;
      }
      case "text":
      default: {
        if (typeof rawVal !== "string") {
          return { ok: false, message: `"${field.label}" must be text.` };
        }
        sanitizedValues[field.key] = rawVal.trim().slice(0, 500);
        break;
      }
    }
  }

  return { ok: true, values: { ...sanitizedValues } };
}

export type CustomTaskType =
  | "MEASUREMENT"
  | "BENCHMARK"
  | "FORM"
  | "CHECKLIST"
  | "MEDIA_UPLOAD";

export type CustomTaskFieldType =
  | "number"
  | "text"
  | "textarea"
  | "boolean"
  | "select"
  | "rating"
  | "photo";

export interface CustomTaskField {
  key: string;
  label: string;
  labelId?: string;
  type: CustomTaskFieldType;
  unit?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ProgramDayCustomTaskDTO {
  id: string;
  programDayId?: string;
  sortOrder: number;
  taskType: CustomTaskType;
  title: string;
  instructions: string | null;
  isRequired: boolean;
  fields: CustomTaskField[];
  translations?: unknown;
  submission?: {
    id: string;
    values: Record<string, unknown>;
    submittedAt: string;
    updatedAt: string;
  } | null;
}

export interface CustomTaskPreset {
  presetId: string;
  taskType: CustomTaskType;
  title: string;
  titleId: string;
  instructions: string;
  instructionsId: string;
  isRequired: boolean;
  fields: CustomTaskField[];
}

export const CUSTOM_TASK_PRESETS: CustomTaskPreset[] = [
  {
    presetId: "body-measurement-basic",
    taskType: "MEASUREMENT",
    title: "Body Measurement Check-In",
    titleId: "Pengukuran Tubuh (Berat & Tinggi)",
    instructions:
      "Measure in the morning before breakfast for consistent cohort tracking.",
    instructionsId:
      "Lakukan pengukuran di pagi hari sebelum sarapan agar progres tercatat konsisten.",
    isRequired: true,
    fields: [
      {
        key: "weightKg",
        label: "Body Weight",
        labelId: "Berat Badan",
        type: "number",
        unit: "kg",
        placeholder: "65.5",
        required: true,
        min: 20,
        max: 300,
        step: 0.1,
      },
      {
        key: "heightCm",
        label: "Height",
        labelId: "Tinggi Badan",
        type: "number",
        unit: "cm",
        placeholder: "170",
        required: false,
        min: 80,
        max: 250,
        step: 0.5,
      },
      {
        key: "waistCm",
        label: "Waist Circumference",
        labelId: "Lingkar Pinggang",
        type: "number",
        unit: "cm",
        placeholder: "78",
        required: false,
        min: 30,
        max: 200,
        step: 0.5,
      },
      {
        key: "notes",
        label: "Measurement Notes",
        labelId: "Catatan Pengukuran",
        type: "textarea",
        placeholder: "Optional context...",
        required: false,
      },
    ],
  },
  {
    presetId: "body-measurement-full",
    taskType: "MEASUREMENT",
    title: "Full Body Composition Audit",
    titleId: "Evaluasi Komposisi Tubuh Lengkap",
    instructions:
      "Record circumference and body composition metrics for Day 1 / Mid / Final comparison.",
    instructionsId:
      "Catat lingkar tubuh dan komposisi badan untuk perbandingan awal, tengah, dan akhir program.",
    isRequired: true,
    fields: [
      {
        key: "weightKg",
        label: "Body Weight",
        labelId: "Berat Badan",
        type: "number",
        unit: "kg",
        min: 20,
        max: 300,
        step: 0.1,
        required: true,
      },
      {
        key: "waistCm",
        label: "Waist",
        labelId: "Lingkar Pinggang",
        type: "number",
        unit: "cm",
        min: 30,
        max: 200,
        step: 0.5,
      },
      {
        key: "chestCm",
        label: "Chest",
        labelId: "Lingkar Dada",
        type: "number",
        unit: "cm",
        min: 30,
        max: 200,
        step: 0.5,
      },
      {
        key: "hipsCm",
        label: "Hips",
        labelId: "Lingkar Pinggul",
        type: "number",
        unit: "cm",
        min: 30,
        max: 200,
        step: 0.5,
      },
      {
        key: "bodyFatPct",
        label: "Body Fat %",
        labelId: "Lemak Tubuh (%)",
        type: "number",
        unit: "%",
        min: 3,
        max: 65,
        step: 0.1,
      },
      {
        key: "restingHr",
        label: "Resting Heart Rate",
        labelId: "Detak Jantung Istirahat",
        type: "number",
        unit: "bpm",
        min: 30,
        max: 160,
        step: 1,
      },
    ],
  },
  {
    presetId: "performance-benchmark",
    taskType: "BENCHMARK",
    title: "Physical Performance Benchmark",
    titleId: "Tes Performa Fisik",
    instructions:
      "Complete the standardized movement benchmark at your best controlled form.",
    instructionsId:
      "Lakukan tes performa dengan teknik terkontrol untuk melihat perkembangan kekuatan.",
    isRequired: true,
    fields: [
      {
        key: "pushupsReps",
        label: "Max Controlled Push-Ups",
        labelId: "Maksimal Push-Up Terkontrol",
        type: "number",
        unit: "reps",
        min: 0,
        max: 300,
        step: 1,
      },
      {
        key: "plankSeconds",
        label: "Plank Hold Duration",
        labelId: "Durasi Tahan Plank",
        type: "number",
        unit: "sec",
        min: 0,
        max: 1200,
        step: 1,
      },
      {
        key: "perceivedEffort",
        label: "Rate of Perceived Exertion (1–10)",
        labelId: "Tingkat Usaha (1–10)",
        type: "rating",
        min: 1,
        max: 10,
      },
      {
        key: "notes",
        label: "Coach Notes / Observations",
        labelId: "Catatan Performa",
        type: "textarea",
      },
    ],
  },
  {
    presetId: "soreness-readiness",
    taskType: "FORM",
    title: "Recovery & Soreness Check-In",
    titleId: "Cek Pemulihan & Nyeri Otot",
    instructions: "Share how your body feels today so your coach can calibrate load.",
    instructionsId: "Laporkan kondisi pemulihan tubuh hari ini untuk evaluasi coach.",
    isRequired: true,
    fields: [
      {
        key: "sorenessLevel",
        label: "Muscle Soreness (1 = Fresh, 5 = Very Sore)",
        labelId: "Nyeri Otot (1 = Segar, 5 = Sangat Pegal)",
        type: "rating",
        min: 1,
        max: 5,
        required: true,
      },
      {
        key: "energyLevel",
        label: "Morning Energy (1–5)",
        labelId: "Energi Pagi (1–5)",
        type: "rating",
        min: 1,
        max: 5,
        required: true,
      },
      {
        key: "painArea",
        label: "Any Joint Discomfort?",
        labelId: "Ada Ketidaknyamanan Sendi?",
        type: "text",
        placeholder: "e.g. None, Lower back, Left knee",
      },
    ],
  },
  {
    presetId: "custom-protocol-checklist",
    taskType: "CHECKLIST",
    title: "Special Daily Protocol",
    titleId: "Protokol Harian Khusus",
    instructions: "Complete all protocol items scheduled for today.",
    instructionsId: "Selesaikan seluruh item protokol khusus hari ini.",
    isRequired: true,
    fields: [
      {
        key: "hydration2L",
        label: "2.5L Mineral Hydration",
        labelId: "Hidrasi Mineral 2.5L",
        type: "boolean",
        required: true,
      },
      {
        key: "sunlight15m",
        label: "15-Min Morning Sunlight Exposure",
        labelId: "Berjemur Cahaya Pagi 15 Menit",
        type: "boolean",
        required: true,
      },
      {
        key: "noSugar",
        label: "Zero Added Refined Sugar Today",
        labelId: "Bebas Gula Tambahan Hari Ini",
        type: "boolean",
        required: false,
      },
    ],
  },
  {
    presetId: "form-check-photo",
    taskType: "MEDIA_UPLOAD",
    title: "Posture / Progress Snapshot",
    titleId: "Unggah Foto Progres / Postur",
    instructions: "Upload a clear daylight posture photo for coach evaluation.",
    instructionsId: "Unggah foto postur di pencahayaan terang untuk evaluasi coach.",
    isRequired: false,
    fields: [
      {
        key: "photoUrl",
        label: "Progress / Posture Photo",
        labelId: "Foto Progres / Postur",
        type: "photo",
        required: true,
      },
      {
        key: "notes",
        label: "Context Notes",
        labelId: "Catatan Tambahan",
        type: "textarea",
      },
    ],
  },
];

export function parseCustomTaskFields(raw: unknown): CustomTaskField[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is CustomTaskField =>
        Boolean(f && typeof f.key === "string" && typeof f.label === "string" && typeof f.type === "string")
    );
  } catch {
    return [];
  }
}

export function parseCustomSubmissionValues(
  raw: unknown
): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export interface ExtractedBodyMetrics {
  weightKg?: number;
  heightCm?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  bodyFatPct?: number;
  restingHr?: number;
  notes?: string;
}

function toFiniteNumber(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function extractBodyMetricsFromValues(
  values: Record<string, unknown>
): ExtractedBodyMetrics | null {
  const weightKg = toFiniteNumber(values.weightKg ?? values.weight ?? values.berat_badan);
  const heightCm = toFiniteNumber(values.heightCm ?? values.height ?? values.tinggi_badan);
  const waistCm = toFiniteNumber(values.waistCm ?? values.waist ?? values.lingkar_pinggang);
  const chestCm = toFiniteNumber(values.chestCm ?? values.chest ?? values.lingkar_dada);
  const hipsCm = toFiniteNumber(values.hipsCm ?? values.hips ?? values.lingkar_pinggul);
  const bodyFatPct = toFiniteNumber(values.bodyFatPct ?? values.bodyFat);
  const restingHrRaw = toFiniteNumber(values.restingHr ?? values.restingHeartRate);
  const restingHr = restingHrRaw !== undefined ? Math.round(restingHrRaw) : undefined;
  const notes = typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : undefined;

  if (
    weightKg === undefined &&
    heightCm === undefined &&
    waistCm === undefined &&
    chestCm === undefined &&
    hipsCm === undefined &&
    bodyFatPct === undefined &&
    restingHr === undefined
  ) {
    return null;
  }

  return {
    weightKg,
    heightCm,
    waistCm,
    chestCm,
    hipsCm,
    bodyFatPct,
    restingHr,
    notes,
  };
}
