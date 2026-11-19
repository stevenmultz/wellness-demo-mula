import { describe, expect, it } from "vitest";
import {
  CreateProgramSchema,
  CustomTaskFieldInputSchema,
  ProgramDayInputSchema,
  SubmitDayProgressSchema,
  UpdateProgramMetaSchema,
  isProgramDayComplete,
  isProgramHeaderComplete,
  validateProgramDay,
} from "@/wellness/validators/program";

describe("Validators: Program, Curriculum & Progress Schemas", () => {
  describe("CreateProgramSchema & UpdateProgramMetaSchema", () => {
    it("accepts valid ONLINE and HYBRID program definitions", () => {
      expect(
        CreateProgramSchema.safeParse({
          title: "21-Day Somatic Core",
          batchNumber: 2,
          locationType: "ONLINE",
          introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
          communityLink: "https://chat.whatsapp.com/abc",
          minQuota: 5,
          maxQuota: 30,
        }).success
      ).toBe(true);

      expect(
        UpdateProgramMetaSchema.safeParse({
          programId: "prog_1",
          title: "Hybrid Pilates Cohort",
          locationType: "HYBRID",
          startDate: "2026-07-01",
          endDate: "2026-07-21",
          minQuota: 2,
          maxQuota: 20,
        }).success
      ).toBe(true);
    });

    it("rejects legacy ONSITE locationType, inverted dates, minQuota > maxQuota, and XSS URLs", () => {
      expect(
        CreateProgramSchema.safeParse({ title: "Legacy", locationType: "ONSITE" }).success
      ).toBe(false);

      expect(
        CreateProgramSchema.safeParse({
          title: "Bad Dates",
          locationType: "HYBRID",
          startDate: "2026-07-21",
          endDate: "2026-07-01",
        }).success
      ).toBe(false);

      expect(
        CreateProgramSchema.safeParse({
          title: "Bad Quota",
          minQuota: 40,
          maxQuota: 20,
        }).success
      ).toBe(false);

      expect(
        CreateProgramSchema.safeParse({
          title: "XSS Cover",
          coverImage: "javascript:alert(1)",
        }).success
      ).toBe(false);

      expect(
        CreateProgramSchema.safeParse({
          title: "XSS Intro Video",
          introVideoUrl: "javascript:alert(1)",
        }).success
      ).toBe(false);

      expect(
        CreateProgramSchema.safeParse({
          title: "XSS Community",
          communityLink: "data:text/html,<script>alert(1)</script>",
        }).success
      ).toBe(false);
    });
  });

  describe("ProgramDayInputSchema & CustomTaskFieldInputSchema", () => {
    it("blocks prototype pollution field keys (__proto__, constructor, prototype)", () => {
      for (const badKey of ["__proto__", "constructor", "prototype", "bad key!"]) {
        expect(
          CustomTaskFieldInputSchema.safeParse({
            key: badKey,
            label: "Bad",
            type: "text",
          }).success
        ).toBe(false);
      }

      expect(
        CustomTaskFieldInputSchema.safeParse({
          key: "weight_kg-1",
          label: "Body Weight",
          type: "number",
          min: 20,
          max: 250,
          step: 0.1,
        }).success
      ).toBe(true);
    });

    it("validates single, multiline, and JSON-array videoUrl entries safely", () => {
      expect(
        ProgramDayInputSchema.safeParse({
          dayNumber: 1,
          title: "Day 1 Mobility",
          dayType: "TRAINING_DAY",
          videoUrl: JSON.stringify([
            { title: "Warmup", url: "https://youtu.be/dQw4w9WgXcQ" },
            "https://vimeo.com/123456",
          ]),
        }).success
      ).toBe(true);

      // Poisoned URL hidden inside JSON array must fail
      expect(
        ProgramDayInputSchema.safeParse({
          dayNumber: 1,
          title: "Day 1 Poisoned",
          dayType: "TRAINING_DAY",
          videoUrl: JSON.stringify([
            { title: "Ok", url: "https://youtu.be/dQw4w9WgXcQ" },
            { title: "Evil", url: "javascript:alert(1)" },
          ]),
        }).success
      ).toBe(false);
    });
  });

  describe("SubmitDayProgressSchema", () => {
    it("enforces happinessRate (1-5) and sleepDurationMinutes (0-1440) bounds", () => {
      expect(
        SubmitDayProgressSchema.safeParse({
          programDayId: "day_1",
          isCompleted: true,
          happinessRate: 5,
          sleepDurationMinutes: 450,
          checklistCompleted: ["[Pilates] Roll Up"],
        }).success
      ).toBe(true);

      expect(
        SubmitDayProgressSchema.safeParse({
          programDayId: "day_1",
          isCompleted: true,
          happinessRate: 6,
        }).success
      ).toBe(false);

      expect(
        SubmitDayProgressSchema.safeParse({
          programDayId: "day_1",
          isCompleted: true,
          sleepDurationMinutes: 1441,
        }).success
      ).toBe(false);
    });
  });

  describe("validateProgramDay & isProgramDayComplete", () => {
    it("validates TRAINING_DAY, REST_DAY, and CONNECTION_DAY/MEETUP_DAY rules", () => {
      expect(validateProgramDay(null).isComplete).toBe(false);

      // Incomplete training day
      const incompleteTraining = validateProgramDay({
        title: "Day 1",
        dayType: "TRAINING_DAY",
        videoUrl: "",
        videoChecklist: [],
      });
      expect(incompleteTraining.isComplete).toBe(false);
      expect(incompleteTraining.missingFields.length).toBe(2);

      // Complete training day with JSON video & JSON checklist string
      expect(
        isProgramDayComplete({
          title: "Day 1 Core",
          dayType: "TRAINING_DAY",
          videoUrl: JSON.stringify([{ title: "Main", url: "https://youtu.be/dQw4w9WgXcQ" }]),
          videoChecklist: JSON.stringify(["[Core] Plank = 60s"]),
        })
      ).toBe(true);

      // REST_DAY
      expect(
        isProgramDayComplete({ title: "Recovery", dayType: "REST_DAY", restInstructions: "No" })
      ).toBe(false);
      expect(
        isProgramDayComplete({
          title: "Recovery",
          dayType: "REST_DAY",
          restInstructions: "Walk 20 minutes outdoors",
        })
      ).toBe(true);

      // MEETUP_DAY requires either meetupLink OR (onsiteVenue + onsiteSchedule)
      expect(
        isProgramDayComplete({
          title: "Studio Meetup",
          dayType: "MEETUP_DAY",
          meetupLink: "",
          onsiteVenue: "Senopati",
          onsiteSchedule: "",
        })
      ).toBe(false);

      expect(
        isProgramDayComplete({
          title: "Studio Meetup",
          dayType: "MEETUP_DAY",
          onsiteVenue: "Senopati Studio",
          onsiteSchedule: "08:00 WIB",
        })
      ).toBe(true);

      expect(
        isProgramDayComplete({
          title: "Zoom Circle",
          dayType: "CONNECTION_DAY",
          meetupLink: "https://zoom.us/j/123456",
        })
      ).toBe(true);
    });
  });

  describe("isProgramHeaderComplete (8-Point Readiness Gate)", () => {
    const baseOnline = {
      title: "Online Somatic Reset",
      description: "Comprehensive 21-day guided nervous system & mobility reset.",
      difficultyLevel: "BEGINNER",
      category: "Breathwork",
      coachName: "Coach Julian",
      locationType: "ONLINE",
      maxQuota: 40,
      price: 0,
      communityLink: "https://chat.whatsapp.com/zera",
      termsList: ["Participate safely"],
    };

    it("passes complete ONLINE header without fixed dates or physical venue", () => {
      const res = isProgramHeaderComplete(baseOnline);
      expect(res.isComplete).toBe(true);
      expect(res.completedCount).toBe(8);
      expect(res.missingSections).toHaveLength(0);
    });

    it("flags placeholder descriptions, TBA coaches, and missing HYBRID dates/venue", () => {
      expect(isProgramHeaderComplete(null).isComplete).toBe(false);

      const placeholderRes = isProgramHeaderComplete({
        ...baseOnline,
        description: "Program curriculum will be configured soon.",
        coachName: "TBA",
      });
      expect(placeholderRes.isComplete).toBe(false);
      expect(placeholderRes.missingSections.map((s) => s.point)).toEqual(
        expect.arrayContaining([1, 3])
      );

      const incompleteHybrid = isProgramHeaderComplete({
        ...baseOnline,
        locationType: "HYBRID",
        startDate: null,
        endDate: null,
        registrationDeadline: null,
        city: "",
        venueAddress: "",
      });
      expect(incompleteHybrid.isComplete).toBe(false);
      expect(incompleteHybrid.missingSections.map((s) => s.point)).toEqual(
        expect.arrayContaining([4, 5])
      );

      const completeHybrid = isProgramHeaderComplete({
        ...baseOnline,
        locationType: "HYBRID",
        registrationDeadline: "2026-08-01",
        startDate: "2026-08-05",
        endDate: "2026-08-26",
        city: "Jakarta",
        venueAddress: "Jl. Senopati No. 88",
      });
      expect(completeHybrid.isComplete).toBe(true);
    });
  });
});
