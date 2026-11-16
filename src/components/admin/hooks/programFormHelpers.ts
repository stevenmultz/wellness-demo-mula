import type { MasterDataPayload } from "@/wellness/actions/master";
import {
  DEFAULT_METHODOLOGY,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_PROGRAM_TERMS,
  DEFAULT_PROGRAM_TERMS_CHAPTERS,
  DEFAULT_TARGET_STATE,
  serializeTermsChapters,
} from "@/wellness/utils/json";
import { isProgramHeaderComplete } from "@/wellness/validators/program";
import type { AdminProgram, ProgramHeaderFormState } from "../adminTypes";
import { computeEndDate, formatWIBDateISO, isDayFilled } from "../adminUtils";

export const COLLAPSED_SECTIONS_STATE: Record<number, boolean> = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
};

export function createInitialCreateFormState(
  currentAdminOrgId: string | null
): ProgramHeaderFormState {
  const defaultOpenDate = formatWIBDateISO(new Date());
  const defaultStart = formatWIBDateISO(new Date(Date.now() + 3 * 24 * 3600 * 1000));
  const defaultDeadline = formatWIBDateISO(new Date(Date.now() + 2 * 24 * 3600 * 1000));

  return {
    title: "",
    description: "",
    targetState: "",
    methodology: "",
    expectedBenefits: [""],
    scientificReferences: [{ title: "", url: "" }],
    programGuidelines: [""],
    coverImage: "",
    difficultyLevel: "",
    category: "",
    equipment: "",
    dailyCommitment: "",
    coachName: "",
    coachTitle: "",
    organizationId: currentAdminOrgId || "",
    organizationCache: "",
    language: "id",
    titleEn: "",
    descriptionEn: "",
    recommendedFor: "",
    durationDays: 7,
    startDate: defaultStart,
    endDate: computeEndDate(defaultStart, 7),
    registrationOpenDate: defaultOpenDate,
    registrationDeadline: defaultDeadline,
    actualPrice: 0,
    discountPercentage: 0,
    price: 0,
    maxQuota: 35,
    communityLink: "",
    locationType: "ONLINE",
    city: "Jakarta",
    venueAddress: "",
    virtualFallbackAvailable: true,
    termsType: "CUSTOM",
    customTerms: serializeTermsChapters(DEFAULT_PROGRAM_TERMS_CHAPTERS),
    termsList: [...DEFAULT_PROGRAM_TERMS],
    termsChapters: DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    })),
    status: "DRAFT",
  };
}

export function createDefaultMetaFormState(
  currentAdminOrgId: string | null
): ProgramHeaderFormState {
  return {
    title: "",
    description: "",
    targetState: DEFAULT_TARGET_STATE,
    methodology: DEFAULT_METHODOLOGY,
    expectedBenefits: [...DEFAULT_PROGRAM_BENEFITS],
    scientificReferences: DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r })),
    programGuidelines: [...DEFAULT_PROGRAM_GUIDELINES],
    coverImage: "",
    difficultyLevel: "INTERMEDIATE",
    category: "Pilates",
    equipment: "Yoga Mat",
    dailyCommitment: "20 - 30 Mins / Day",
    coachName: "",
    coachTitle: "",
    organizationId: currentAdminOrgId || "",
    organizationCache: "",
    language: "id",
    titleEn: "",
    descriptionEn: "",
    recommendedFor: "",
    durationDays: 7,
    startDate: "",
    endDate: "",
    registrationOpenDate: "",
    registrationDeadline: "",
    actualPrice: 0,
    discountPercentage: 0,
    price: 0,
    maxQuota: 35,
    communityLink: "",
    locationType: "ONLINE",
    city: "Jakarta",
    venueAddress: "",
    virtualFallbackAvailable: true,
    termsType: "CUSTOM",
    customTerms: serializeTermsChapters(DEFAULT_PROGRAM_TERMS_CHAPTERS),
    termsList: [...DEFAULT_PROGRAM_TERMS],
    termsChapters: DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    })),
    status: "DRAFT",
  };
}

export function buildProgramHeaderPayloads(
  form: ProgramHeaderFormState,
  organizations: MasterDataPayload["organizations"],
  useDefaultsForEmptyLists: boolean
) {
  const calculatedFinalPrice = Math.max(
    0,
    Math.round(
      (Number(form.actualPrice) || 0) * (1 - (Number(form.discountPercentage) || 0) / 100)
    )
  );

  const cleanedChapters = (form.termsChapters || [])
    .map((c) => ({
      chapter: c.chapter.trim(),
      clauses: (c.clauses || []).map((cl) => cl.trim()).filter((cl) => cl.length > 0),
    }))
    .filter((c) => c.chapter.length > 0 || c.clauses.length > 0);

  const finalChapters =
    cleanedChapters.length > 0
      ? cleanedChapters
      : DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
          chapter: c.chapter,
          clauses: [...c.clauses],
        }));

  const serializedCustomTerms = serializeTermsChapters(finalChapters);
  const finalTermsList = finalChapters.flatMap((c) => c.clauses);

  const isOnline = form.locationType === "ONLINE";

  const cleanedBenefits = (form.expectedBenefits || [])
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  const finalBenefits =
    useDefaultsForEmptyLists && cleanedBenefits.length === 0
      ? [...DEFAULT_PROGRAM_BENEFITS]
      : cleanedBenefits;

  const cleanedRefs = (form.scientificReferences || [])
    .map((r) => ({ title: r.title.trim(), url: r.url?.trim() || "" }))
    .filter((r) => r.title.length > 0);
  const finalRefs =
    useDefaultsForEmptyLists && cleanedRefs.length === 0
      ? DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r }))
      : cleanedRefs;

  const cleanedGuidelines = (form.programGuidelines || [])
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
  const finalGuidelines =
    useDefaultsForEmptyLists && cleanedGuidelines.length === 0
      ? [...DEFAULT_PROGRAM_GUIDELINES]
      : cleanedGuidelines;

  const translations =
    form.titleEn.trim() || form.descriptionEn.trim()
      ? JSON.stringify({
          en: {
            ...(form.titleEn.trim() ? { title: form.titleEn.trim() } : {}),
            ...(form.descriptionEn.trim() ? { description: form.descriptionEn.trim() } : {}),
          },
        })
      : null;

  const selectedOrgObj = (organizations || []).find((o) => o.id === form.organizationId);

  return {
    calculatedFinalPrice,
    serializedCustomTerms,
    finalTermsList,
    isOnline,
    finalBenefits,
    finalRefs,
    finalGuidelines,
    translations,
    selectedOrgObj,
  };
}

export function validateProgramForPublish(prog: AdminProgram) {
  const missingDays: number[] = [];
  const targetDays = prog.durationDays || 21;
  for (let d = 1; d <= targetDays; d++) {
    const found = prog.days.find((x) => x.dayNumber === d);
    if (!isDayFilled(found)) {
      missingDays.push(d);
    }
  }

  const errors: string[] = [];

  const headerCheck = isProgramHeaderComplete({
    title: prog.title,
    description: prog.description,
    difficultyLevel: prog.difficultyLevel,
    targetState: prog.targetState,
    methodology: prog.methodology,
    expectedBenefits: prog.expectedBenefits,
    category: prog.category,
    dailyCommitment: prog.dailyCommitment,
    coachName: prog.coachName,
    recommendedFor: prog.recommendedFor,
    startDate: prog.startDate,
    endDate: prog.endDate,
    registrationDeadline: prog.registrationDeadline,
    locationType: prog.locationType,
    city: prog.city,
    venueAddress: prog.venueAddress,
    maxQuota: prog.maxQuota,
    price: prog.price,
    communityLink: prog.communityLink,
    termsList: prog.termsList,
    customTerms: prog.customTerms,
  });

  if (!headerCheck.isComplete) {
    headerCheck.missingSections.forEach((s) => {
      errors.push(`Header Point ${s.point} (${s.title}): ${s.reason}`);
    });
  }

  if (missingDays.length > 0) {
    errors.push(
      `Curriculum Incomplete: ${missingDays.length} out of ${targetDays} days are missing required routines (Day ${missingDays.slice(0, 7).join(", ")}${missingDays.length > 7 ? "..." : ""}).`
    );
  }

  return {
    valid: errors.length === 0,
    missingDays,
    errors,
  };
}
