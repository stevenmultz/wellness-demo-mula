import { describe, expect, it } from "vitest";
import {
  isSafeOptionalHttpUrl,
  isSafePhotoUrl,
  safeHttpUrl,
  safeMediaUrl,
} from "@/wellness/utils/url-safety";
import {
  DEFAULT_PROGRAM_TERMS_CHAPTERS,
  DEFAULT_WORKOUT_OPTION_GROUPS,
  parseDayVideoLinks,
  parseReferencesList,
  parseStringList,
  parseTermsChapters,
  parseTermsList,
  parseWorkoutOptionGroups,
  safeJsonParse,
  serializeDayVideoLinks,
  serializeReferencesList,
  serializeStringList,
  serializeTermsChapters,
  serializeTermsList,
  serializeWorkoutOptionGroups,
} from "@/wellness/utils/json";

describe("Utils: URL Safety & XSS Defense", () => {
  it("allows only http/https schemes for safeHttpUrl and blocks javascript/data/vbscript", () => {
    expect(safeHttpUrl("https://zera.id/programs")).toBe("https://zera.id/programs");
    expect(safeHttpUrl("http://localhost:3000/test")).toBe("http://localhost:3000/test");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("  JaVaScRiPt:alert(document.cookie) ")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("/relative/path")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("enforces path traversal protection and raster-only data URIs in safeMediaUrl", () => {
    expect(safeMediaUrl("/api/media/workouts/u1-pic.webp")).toBe("/api/media/workouts/u1-pic.webp");
    expect(safeMediaUrl("/uploads/workouts/pic.webp")).toBe("/uploads/workouts/pic.webp");
    expect(safeMediaUrl("/coach.webp")).toBe("/coach.webp");
    expect(safeMediaUrl("sb://avatars/u1/avatar.webp")).toBe("sb://avatars/u1/avatar.webp");
    expect(safeMediaUrl("data:image/webp;base64,UklGRh4AAABXRUJQ")).toBe(
      "data:image/webp;base64,UklGRh4AAABXRUJQ"
    );

    // Path traversal & SVG XSS attempts blocked
    expect(safeMediaUrl("/uploads/../etc/passwd")).toBeNull();
    expect(safeMediaUrl("/api/media/../secret")).toBeNull();
    expect(safeMediaUrl("sb://avatars/../../etc/passwd")).toBeNull();
    expect(safeMediaUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(safeMediaUrl("javascript:alert(1)")).toBeNull();

    // Optional helpers
    expect(isSafePhotoUrl("")).toBe(true);
    expect(isSafePhotoUrl(null)).toBe(true);
    expect(isSafePhotoUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeOptionalHttpUrl("")).toBe(true);
    expect(isSafeOptionalHttpUrl("https://zoom.us/j/123")).toBe(true);
    expect(isSafeOptionalHttpUrl("javascript:void(0)")).toBe(false);
  });
});

describe("Utils: Resilient JSON, Terms, Videos & Workout Group Serializers", () => {
  it("handles safeJsonParse with fallback on malformed JSON or empty values", () => {
    expect(safeJsonParse('{"a":1}', { a: 0 })).toEqual({ a: 1 });
    expect(safeJsonParse("{broken", { a: 0 })).toEqual({ a: 0 });
    expect(safeJsonParse("", ["fallback"])).toEqual(["fallback"]);
    expect(safeJsonParse([1, 2], [])).toEqual([1, 2]);
  });

  it("parses and serializes string lists from JSON arrays and bulleted multiline text", () => {
    expect(parseStringList('["A", "  B  ", ""]')).toEqual(["A", "B"]);
    expect(parseStringList("- Item 1\n• Item 2\n3. Item 3")).toEqual([
      "Item 1",
      "Item 2",
      "Item 3",
    ]);
    expect(parseStringList("", ["Default"])).toEqual(["Default"]);
    expect(serializeStringList(["  One ", ""])).toBe('["One"]');
  });

  it("parses and serializes scientific references gracefully", () => {
    const serialized = serializeReferencesList([
      { title: "Study A", url: "https://pubmed.ncbi.nlm.nih.gov/1" },
      { title: "   ", url: "" },
    ]);
    expect(parseReferencesList(serialized)).toEqual([
      { title: "Study A", url: "https://pubmed.ncbi.nlm.nih.gov/1" },
    ]);
    expect(parseReferencesList("1. Line Study")).toEqual([{ title: "Line Study", url: "" }]);
  });

  it("supports modern chapters, legacy flat JSON arrays, and raw text in Terms parsers", () => {
    expect(parseTermsChapters(null)).toEqual(DEFAULT_PROGRAM_TERMS_CHAPTERS);

    const chapters = [{ chapter: "Refunds", clauses: ["Non-refundable", ""] }];
    const json = serializeTermsChapters(chapters);
    expect(parseTermsChapters(json)).toEqual([{ chapter: "Refunds", clauses: ["Non-refundable"] }]);

    // Legacy flat array
    expect(parseTermsChapters(JSON.stringify(["Clause A", "Clause B"]))).toEqual([
      { chapter: "General Terms & Health Guidelines", clauses: ["Clause A", "Clause B"] },
    ]);

    // Raw text fallback
    expect(parseTermsList("Rule 1\nRule 2")).toEqual(["Rule 1", "Rule 2"]);
    expect(JSON.parse(serializeTermsList(["Agree to terms"]))[0].clauses).toEqual([
      "Agree to terms",
    ]);
  });

  it("round-trips multi-video links and synchronized workout option groups", () => {
    const links = [
      { title: "Warmup", url: "https://youtu.be/abc12345678" },
      { title: "Main Flow", url: "https://youtu.be/xyz12345678" },
    ];
    const encoded = serializeDayVideoLinks(links);
    expect(parseDayVideoLinks(encoded)).toEqual(links);
    expect(parseDayVideoLinks("https://youtu.be/a\nhttps://youtu.be/b")).toHaveLength(2);
    expect(serializeDayVideoLinks([])).toBe("");

    // Default fallback when empty
    expect(parseWorkoutOptionGroups([], [])).toEqual(DEFAULT_WORKOUT_OPTION_GROUPS);

    // Roundtrip multi-group workout options
    const groups = [
      {
        optionName: "Pilates",
        movements: [
          { name: "Roll Up", target: "12 reps" },
          { name: "Plank", target: "" },
        ],
      },
      {
        optionName: "Yoga",
        movements: [{ name: "Sun Salutation", target: "5 rounds" }],
      },
    ];
    const { workoutOptions, videoChecklist } = serializeWorkoutOptionGroups(groups);
    expect(workoutOptions).toEqual(["Pilates", "Yoga"]);
    expect(videoChecklist).toEqual([
      "[Pilates] Roll Up = 12 reps",
      "[Pilates] Plank",
      "[Yoga] Sun Salutation = 5 rounds",
    ]);
    expect(parseWorkoutOptionGroups(workoutOptions, videoChecklist)).toEqual(groups);
  });
});
