import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  CUSTOM_TASK_PRESETS,
  extractBodyMetricsFromValues,
  parseCustomSubmissionValues,
  parseCustomTaskFields,
  sanitizeCustomTaskSubmission,
  type CustomTaskField,
} from "@/wellness/utils/custom-tasks";
import {
  detectImageMime,
  processAndOptimizeImage,
} from "@/wellness/utils/image-processor";

describe("Utils: Custom Task Sanitization & Body Metrics Extraction", () => {
  const fields: CustomTaskField[] = [
    { key: "weightKg", label: "Weight", type: "number", min: 20, max: 300, required: true },
    { key: "soreness", label: "Soreness", type: "rating", min: 1, max: 5, required: false },
    { key: "hydrated", label: "Hydrated", type: "boolean", required: true },
    { key: "mood", label: "Mood", type: "select", options: ["Great", "Okay", "Tired"] },
    { key: "photoUrl", label: "Photo", type: "photo", required: false },
    { key: "note", label: "Note", type: "textarea", required: false },
    { key: "tag", label: "Tag", type: "text", required: false },
  ];

  it("sanitizes valid multi-type submissions and prevents prototype pollution", () => {
    const raw = JSON.parse(
      '{"weightKg":"68.4","soreness":3,"hydrated":true,"mood":"Great","photoUrl":"/api/media/workouts/u1.webp","note":"  Felt strong  ","tag":"morning","__proto__":{"polluted":true}}'
    ) as Record<string, unknown>;

    const res = sanitizeCustomTaskSubmission(fields, raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.values).toEqual({
        weightKg: 68.4,
        soreness: 3,
        hydrated: true,
        mood: "Great",
        photoUrl: "/api/media/workouts/u1.webp",
        note: "Felt strong",
        tag: "morning",
      });
      expect(Object.prototype.hasOwnProperty.call(res.values, "__proto__")).toBe(false);
    }
  });

  it("rejects missing required fields, out-of-range numbers, invalid select options, and unsafe photos", () => {
    expect(sanitizeCustomTaskSubmission(fields, { hydrated: true }).ok).toBe(false);
    expect(sanitizeCustomTaskSubmission(fields, { weightKg: 65, hydrated: false }).ok).toBe(false);
    expect(sanitizeCustomTaskSubmission(fields, { weightKg: 5, hydrated: true }).ok).toBe(false);
    expect(sanitizeCustomTaskSubmission(fields, { weightKg: 500, hydrated: true }).ok).toBe(false);
    expect(sanitizeCustomTaskSubmission(fields, { weightKg: "NaN", hydrated: true }).ok).toBe(false);
    expect(
      sanitizeCustomTaskSubmission(fields, { weightKg: 65, hydrated: true, mood: "HackedOption" })
        .ok
    ).toBe(false);
    expect(
      sanitizeCustomTaskSubmission(fields, {
        weightKg: 65,
        hydrated: true,
        photoUrl: "javascript:alert(1)",
      }).ok
    ).toBe(false);
  });

  it("parses custom task fields/submissions and extracts EN/ID body metric aliases", () => {
    expect(CUSTOM_TASK_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(parseCustomTaskFields(JSON.stringify(CUSTOM_TASK_PRESETS[0].fields))).toHaveLength(4);
    expect(parseCustomTaskFields("bad-json")).toEqual([]);
    expect(parseCustomSubmissionValues('{"a":1}')).toEqual({ a: 1 });
    expect(parseCustomSubmissionValues("[1,2]")).toEqual({});

    expect(
      extractBodyMetricsFromValues({
        berat_badan: "70.2",
        tinggi_badan: 175,
        lingkar_pinggang: "80",
        restingHeartRate: 62.7,
        notes: "  Morning check  ",
      })
    ).toEqual({
      weightKg: 70.2,
      heightCm: 175,
      waistCm: 80,
      chestCm: undefined,
      hipsCm: undefined,
      bodyFatPct: undefined,
      restingHr: 63,
      notes: "Morning check",
    });

    expect(extractBodyMetricsFromValues({ mood: "Great" })).toBeNull();
  });
});

describe("Utils: Image MIME Sniffing & Sharp Processing", () => {
  it("identifies JPEG, PNG, and WebP magic bytes and rejects spoofed or short buffers", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");

    expect(detectImageMime(jpeg)).toBe("image/jpeg");
    expect(detectImageMime(png)).toBe("image/png");
    expect(detectImageMime(webp)).toBe("image/webp");
    expect(detectImageMime(svg)).toBeNull();
    expect(detectImageMime(Buffer.from("short"))).toBeNull();
  });

  it("re-encodes valid PNG buffers into resized WebP and rejects malformed bytes", async () => {
    const validPng = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: { r: 24, g: 24, b: 27 },
      },
    })
      .png()
      .toBuffer();

    const processed = await processAndOptimizeImage(validPng, {
      maxWidth: 40,
      maxHeight: 40,
      fit: "cover",
      quality: 75,
    });

    expect(processed.mime).toBe("image/webp");
    expect(processed.ext).toBe("webp");
    expect(detectImageMime(processed.buffer)).toBe("image/webp");

    const meta = await sharp(processed.buffer).metadata();
    expect(meta.width).toBe(40);
    expect(meta.height).toBe(40);

    await expect(
      processAndOptimizeImage(Buffer.from("<script>not an image</script>"), {
        maxWidth: 100,
        maxHeight: 100,
        fit: "inside",
      })
    ).rejects.toThrow(/valid JPEG, PNG, or WebP/i);
  });
});
