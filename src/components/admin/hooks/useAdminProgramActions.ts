"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { MasterDataPayload } from "@/wellness/actions/master";
import {
  wellnessAdminCreateProgram,
  wellnessAdminDeleteProgram,
  wellnessAdminTogglePublishProgram,
  wellnessAdminUpdateProgramMeta,
} from "@/wellness/actions/program";
import {
  DEFAULT_METHODOLOGY,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  parseTermsChapters,
  parseTermsList,
  safeJsonParse,
  serializeTermsChapters,
} from "@/wellness/utils/json";
import type {
  AdminFeedbackMessage,
  AdminProgram,
  AdminPublishModalState,
  ProgramHeaderFormState,
} from "../adminTypes";
import { toInputDate } from "../adminUtils";
import {
  COLLAPSED_SECTIONS_STATE,
  buildProgramHeaderPayloads,
  createDefaultMetaFormState,
  createInitialCreateFormState,
  validateProgramForPublish,
} from "./programFormHelpers";

interface UseAdminProgramActionsArgs {
  currentAdminOrgId: string | null;
  masterData: MasterDataPayload;
  selectedProgramId: string | null;
  setSelectedProgramId: (id: string | null) => void;
  setIsCreatingProgram: (val: boolean) => void;
  setPrograms: Dispatch<SetStateAction<AdminProgram[]>>;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

export function useAdminProgramActions({
  currentAdminOrgId,
  masterData,
  selectedProgramId,
  setSelectedProgramId,
  setIsCreatingProgram,
  setPrograms,
  setFeedback,
}: UseAdminProgramActionsArgs) {
  const router = useRouter();

  const [createForm, setCreateForm] = useState<ProgramHeaderFormState>(() =>
    createInitialCreateFormState(currentAdminOrgId)
  );
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [metaForm, setMetaForm] = useState<ProgramHeaderFormState>(() =>
    createDefaultMetaFormState(currentAdminOrgId)
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingProgId, setDeletingProgId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [publishModal, setPublishModal] = useState<AdminPublishModalState | null>(null);

  const [expandedCreateSections, setExpandedCreateSections] = useState<
    Record<number, boolean>
  >(COLLAPSED_SECTIONS_STATE);
  const [expandedDetailSections, setExpandedDetailSections] = useState<
    Record<number, boolean>
  >(COLLAPSED_SECTIONS_STATE);

  const toggleCreateSection = (sec: number) => {
    setExpandedCreateSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllCreateSections = (expanded: boolean) => {
    setExpandedCreateSections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
      6: expanded,
      7: expanded,
      8: expanded,
    });
  };

  const toggleDetailSection = (sec: number) => {
    setExpandedDetailSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllDetailSections = (expanded: boolean) => {
    setExpandedDetailSections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
      6: expanded,
      7: expanded,
      8: expanded,
    });
  };

  const resetCreateForm = () => {
    setCreateForm(createInitialCreateFormState(currentAdminOrgId));
    setAllCreateSections(false);
    setCreateError(null);
  };

  const loadMetaIntoForm = (prog: AdminProgram) => {
    const resolvedChapters = parseTermsChapters(prog.customTerms);
    const resolvedTerms =
      prog.termsList && prog.termsList.length > 0
        ? [...prog.termsList]
        : parseTermsList(prog.customTerms);
    const resolvedBenefits =
      prog.expectedBenefits && prog.expectedBenefits.length > 0
        ? [...prog.expectedBenefits]
        : [...DEFAULT_PROGRAM_BENEFITS];
    const resolvedRefs =
      prog.scientificReferences && prog.scientificReferences.length > 0
        ? prog.scientificReferences.map((r) => ({ ...r }))
        : DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r }));
    const resolvedGuidelines =
      prog.programGuidelines && prog.programGuidelines.length > 0
        ? [...prog.programGuidelines]
        : [...DEFAULT_PROGRAM_GUIDELINES];

    const parsedTranslations = safeJsonParse<{
      en?: { title?: string; description?: string };
    }>(prog.translations, {});

    setMetaForm({
      title: prog.title,
      description: prog.description,
      targetState: prog.targetState || DEFAULT_TARGET_STATE,
      methodology: prog.methodology || DEFAULT_METHODOLOGY,
      expectedBenefits: resolvedBenefits,
      scientificReferences: resolvedRefs,
      programGuidelines: resolvedGuidelines,
      coverImage: prog.coverImage || "",
      difficultyLevel: prog.difficultyLevel || "INTERMEDIATE",
      category: prog.category || "Pilates",
      equipment: prog.equipment || "Yoga Mat",
      dailyCommitment: prog.dailyCommitment || "20 - 30 Mins / Day",
      coachName: prog.coachName,
      coachTitle: prog.coachTitle || "",
      organizationId: prog.organizationId || "",
      organizationCache: prog.organizationCache || "",
      language: (prog.language as "id" | "en" | "bilingual") || "id",
      titleEn: parsedTranslations?.en?.title || "",
      descriptionEn: parsedTranslations?.en?.description || "",
      recommendedFor: prog.recommendedFor || "All Levels",
      durationDays: prog.durationDays || 7,
      actualPrice: prog.actualPrice ?? prog.price,
      discountPercentage: prog.discountPercentage ?? 0,
      price: prog.price,
      maxQuota: prog.maxQuota,
      communityLink: prog.communityLink || "",
      locationType: (prog.locationType as "ONLINE" | "ONSITE" | "HYBRID") || "ONLINE",
      city: prog.city || "Jakarta",
      venueAddress: prog.venueAddress || "",
      virtualFallbackAvailable: prog.virtualFallbackAvailable ?? true,
      termsType: "CUSTOM",
      customTerms: prog.customTerms || serializeTermsChapters(resolvedChapters),
      termsList: resolvedTerms,
      termsChapters: resolvedChapters,
      startDate: toInputDate(prog.startDate),
      endDate: toInputDate(prog.endDate),
      registrationOpenDate: prog.registrationOpenDate
        ? toInputDate(prog.registrationOpenDate)
        : "",
      registrationDeadline: toInputDate(prog.registrationDeadline),
      status:
        (prog.status as "DRAFT" | "PUBLISHED") ||
        (prog.isPublished ? "PUBLISHED" : "DRAFT"),
    });
  };

  const handleSaveMeta = async (prog: AdminProgram) => {
    setSavingMeta(true);
    setFeedback(null);
    setMetaError(null);
    try {
      const payload = buildProgramHeaderPayloads(
        metaForm,
        masterData.organizations,
        true
      );
      const resolvedCity = payload.isOnline
        ? "Online"
        : metaForm.city.trim() || undefined;
      const resolvedVenue = payload.isOnline
        ? undefined
        : metaForm.venueAddress.trim() || undefined;

      const res = await wellnessAdminUpdateProgramMeta({
        programId: prog.id,
        title: metaForm.title.trim(),
        description: metaForm.description.trim(),
        targetState: metaForm.targetState.trim() || DEFAULT_TARGET_STATE,
        methodology: metaForm.methodology.trim() || DEFAULT_METHODOLOGY,
        expectedBenefits: payload.finalBenefits,
        scientificReferences: payload.finalRefs,
        programGuidelines: payload.finalGuidelines,
        coverImage: metaForm.coverImage?.trim() || undefined,
        difficultyLevel: metaForm.difficultyLevel,
        category: metaForm.category.trim(),
        equipment: metaForm.equipment?.trim() || undefined,
        dailyCommitment: metaForm.dailyCommitment?.trim() || undefined,
        coachName: metaForm.coachName.trim(),
        coachTitle: metaForm.coachTitle?.trim() || undefined,
        organizationId: metaForm.organizationId || null,
        organizationCache:
          payload.selectedOrgObj?.name || metaForm.organizationCache || null,
        language: metaForm.language || "id",
        translations: payload.translations,
        recommendedFor: metaForm.recommendedFor.trim(),
        durationDays: Number(metaForm.durationDays) || 7,
        actualPrice: Number(metaForm.actualPrice) || 0,
        discountPercentage: Number(metaForm.discountPercentage) || 0,
        price: payload.calculatedFinalPrice,
        maxQuota: Number(metaForm.maxQuota) || 35,
        communityLink: metaForm.communityLink?.trim() || undefined,
        locationType: metaForm.locationType,
        city: resolvedCity,
        venueAddress: resolvedVenue,
        virtualFallbackAvailable: metaForm.virtualFallbackAvailable,
        termsType: "CUSTOM",
        customTerms: payload.serializedCustomTerms,
        termsList: payload.finalTermsList,
        startDate: new Date(metaForm.startDate),
        endDate: new Date(metaForm.endDate),
        registrationOpenDate: metaForm.registrationOpenDate
          ? new Date(metaForm.registrationOpenDate)
          : null,
        registrationDeadline: new Date(metaForm.registrationDeadline),
        status: metaForm.status,
      });

      if (res.success) {
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === prog.id
              ? {
                  ...p,
                  title: metaForm.title,
                  description: metaForm.description,
                  targetState: metaForm.targetState.trim() || DEFAULT_TARGET_STATE,
                  methodology: metaForm.methodology.trim() || DEFAULT_METHODOLOGY,
                  expectedBenefits: payload.finalBenefits,
                  scientificReferences: payload.finalRefs,
                  programGuidelines: payload.finalGuidelines,
                  coverImage: metaForm.coverImage?.trim() || null,
                  difficultyLevel: metaForm.difficultyLevel,
                  category: metaForm.category,
                  equipment: metaForm.equipment?.trim() || null,
                  dailyCommitment: metaForm.dailyCommitment?.trim() || null,
                  coachName: metaForm.coachName,
                  coachTitle: metaForm.coachTitle || null,
                  organizationId: metaForm.organizationId || null,
                  organizationCache:
                    payload.selectedOrgObj?.name || metaForm.organizationCache || null,
                  language: metaForm.language || "id",
                  translations: payload.translations,
                  recommendedFor: metaForm.recommendedFor,
                  durationDays: Number(metaForm.durationDays) || 7,
                  actualPrice: Number(metaForm.actualPrice) || 0,
                  discountPercentage: Number(metaForm.discountPercentage) || 0,
                  price: payload.calculatedFinalPrice,
                  maxQuota: Number(metaForm.maxQuota) || 35,
                  communityLink: metaForm.communityLink || null,
                  locationType: metaForm.locationType,
                  city: payload.isOnline ? "Online" : metaForm.city.trim() || null,
                  venueAddress: payload.isOnline
                    ? null
                    : metaForm.venueAddress.trim() || null,
                  virtualFallbackAvailable: metaForm.virtualFallbackAvailable,
                  termsType: "CUSTOM",
                  customTerms: payload.serializedCustomTerms,
                  termsList: payload.finalTermsList,
                  startDate: metaForm.startDate,
                  endDate: metaForm.endDate,
                  registrationOpenDate: metaForm.registrationOpenDate || null,
                  registrationDeadline: metaForm.registrationDeadline,
                  status: metaForm.status,
                  days: p.days.filter(
                    (d) => d.dayNumber <= (Number(metaForm.durationDays) || 7)
                  ),
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          text: `Header information updated for "${metaForm.title}".`,
        });
        setMetaError(null);
        router.refresh();
      } else {
        const errMsg = res.message || "Unable to update program info.";
        setMetaError(errMsg);
        setFeedback({ type: "error", text: errMsg });
      }
    } catch {
      const netErr = "Network error while updating program info.";
      setMetaError(netErr);
      setFeedback({ type: "error", text: netErr });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCreateProgramSubmit = async (
    e: FormEvent
  ): Promise<AdminProgram | null> => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError("Please enter a Program Title.");
      return null;
    }

    setCreatingLoading(true);
    setCreateError(null);

    const payload = buildProgramHeaderPayloads(
      createForm,
      masterData.organizations,
      false
    );
    const resolvedCreateCity = payload.isOnline
      ? "Online"
      : createForm.city.trim() || "Jakarta";
    const resolvedCreateVenue = payload.isOnline
      ? undefined
      : createForm.venueAddress.trim() || undefined;

    try {
      const res = await wellnessAdminCreateProgram({
        title: createForm.title.trim(),
        description:
          createForm.description.trim() ||
          "Program description will be configured soon.",
        targetState: createForm.targetState.trim() || "",
        methodology: createForm.methodology.trim() || "",
        expectedBenefits: payload.finalBenefits,
        scientificReferences: payload.finalRefs,
        programGuidelines: payload.finalGuidelines,
        coverImage: createForm.coverImage?.trim() || undefined,
        difficultyLevel: createForm.difficultyLevel || "INTERMEDIATE",
        category: createForm.category?.trim() || "Pilates",
        equipment: createForm.equipment?.trim() || undefined,
        dailyCommitment: createForm.dailyCommitment?.trim() || undefined,
        coachName: createForm.coachName.trim() || "TBA",
        coachTitle: createForm.coachTitle?.trim() || undefined,
        organizationId: createForm.organizationId || null,
        organizationCache:
          payload.selectedOrgObj?.name || createForm.organizationCache || null,
        language: createForm.language || "id",
        translations: payload.translations,
        recommendedFor: createForm.recommendedFor.trim() || "All Levels",
        durationDays: Number(createForm.durationDays) || 21,
        actualPrice: Number(createForm.actualPrice) || 0,
        discountPercentage: Number(createForm.discountPercentage) || 0,
        price: payload.calculatedFinalPrice,
        maxQuota: Number(createForm.maxQuota) || 35,
        communityLink: createForm.communityLink.trim() || undefined,
        locationType: createForm.locationType || "ONLINE",
        city: resolvedCreateCity,
        venueAddress: resolvedCreateVenue,
        virtualFallbackAvailable: createForm.virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: payload.serializedCustomTerms,
        termsList: payload.finalTermsList,
        startDate: createForm.startDate ? new Date(createForm.startDate) : undefined,
        endDate: createForm.endDate ? new Date(createForm.endDate) : undefined,
        registrationOpenDate: createForm.registrationOpenDate
          ? new Date(createForm.registrationOpenDate)
          : null,
        registrationDeadline: createForm.registrationDeadline
          ? new Date(createForm.registrationDeadline)
          : undefined,
        status: "DRAFT",
        isPublished: false,
        days: [],
      });

      if (res.success && res.data) {
        const created = res.data as AdminProgram;
        const formattedNewProgram: AdminProgram = {
          id: created.id,
          title: created.title,
          slug: created.slug,
          description: created.description,
          targetState: createForm.targetState.trim(),
          methodology: createForm.methodology.trim(),
          expectedBenefits: payload.finalBenefits,
          scientificReferences: payload.finalRefs,
          programGuidelines: payload.finalGuidelines,
          coverImage: created.coverImage || createForm.coverImage || null,
          difficultyLevel:
            created.difficultyLevel || createForm.difficultyLevel || "INTERMEDIATE",
          category: created.category || createForm.category,
          equipment: created.equipment || createForm.equipment || null,
          dailyCommitment: created.dailyCommitment || createForm.dailyCommitment || null,
          recommendedFor: created.recommendedFor,
          coachName: created.coachName,
          coachTitle: created.coachTitle || createForm.coachTitle,
          organizationId: created.organizationId || createForm.organizationId || null,
          organizationCache:
            created.organizationCache || payload.selectedOrgObj?.name || null,
          language: created.language || createForm.language || "id",
          translations: created.translations || payload.translations || null,
          durationDays: created.durationDays,
          actualPrice: created.actualPrice ?? createForm.actualPrice,
          discountPercentage: created.discountPercentage ?? createForm.discountPercentage,
          price: created.price ?? payload.calculatedFinalPrice,
          maxQuota: created.maxQuota,
          communityLink: created.communityLink,
          locationType: created.locationType || createForm.locationType,
          city: payload.isOnline ? "Online" : created.city || createForm.city || null,
          venueAddress: payload.isOnline
            ? null
            : created.venueAddress || createForm.venueAddress || null,
          virtualFallbackAvailable:
            created.virtualFallbackAvailable ?? createForm.virtualFallbackAvailable,
          termsType: "CUSTOM",
          customTerms: payload.serializedCustomTerms,
          termsList: payload.finalTermsList,
          startDate: created.startDate,
          endDate: created.endDate,
          registrationOpenDate: created.registrationOpenDate || null,
          registrationDeadline: created.registrationDeadline,
          status: "DRAFT",
          isPublished: false,
          dayCount: 0,
          activeSubscribers: 0,
          pendingSubscribers: 0,
          days: [],
        };

        setPrograms((prev) => [formattedNewProgram, ...prev]);
        resetCreateForm();
        setIsCreatingProgram(false);
        setFeedback({
          type: "success",
          text: `Draft program "${formattedNewProgram.title}" created. You can now build daily routines or publish when ready.`,
        });
        router.refresh();
        return formattedNewProgram;
      } else {
        setCreateError(res.message || "Failed to create program.");
        return null;
      }
    } catch {
      setCreateError("An unexpected error occurred while creating program.");
      return null;
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleTogglePublish = async (
    prog: AdminProgram,
    nextPublishState?: boolean
  ) => {
    const shouldPublish = nextPublishState ?? !prog.isPublished;
    setPublishingId(prog.id);
    setFeedback(null);
    try {
      const res = await wellnessAdminTogglePublishProgram(prog.id, shouldPublish);
      if (res.success && res.data) {
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === prog.id
              ? { ...p, isPublished: res.data!.isPublished, status: res.data!.status }
              : p
          )
        );
        setPublishModal(null);
        setFeedback({
          type: "success",
          text: shouldPublish
            ? `Program "${prog.title}" is now published and live on catalog!`
            : `Program "${prog.title}" has been moved back to Draft.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update publication status.",
        });
      }
    } finally {
      setPublishingId(null);
    }
  };

  const handleInitiatePublish = (prog: AdminProgram) => {
    if (prog.isPublished) {
      handleTogglePublish(prog, false);
      return;
    }

    const validation = validateProgramForPublish(prog);
    if (!validation.valid) {
      setPublishModal({
        isOpen: true,
        mode: "ERROR",
        missingDays: validation.missingDays,
        errorList: validation.errors,
      });
      return;
    }

    setPublishModal({
      isOpen: true,
      mode: "CONFIRM",
    });
  };

  const handleDeleteProgram = async (prog: AdminProgram) => {
    if (confirmDeleteId !== prog.id) {
      setConfirmDeleteId(prog.id);
      setFeedback({
        type: "error",
        text: `Click Delete Program again to permanently delete "${prog.title}".`,
      });
      return;
    }
    setConfirmDeleteId(null);
    setDeletingProgId(prog.id);
    try {
      const res = await wellnessAdminDeleteProgram(prog.id);
      if (res.success) {
        setPrograms((prev) => prev.filter((p) => p.id !== prog.id));
        if (selectedProgramId === prog.id) {
          setSelectedProgramId(null);
        }
        router.push("/admin/programs");
      }
    } finally {
      setDeletingProgId(null);
    }
  };

  return {
    createForm,
    setCreateForm,
    resetCreateForm,
    creatingLoading,
    createError,
    metaForm,
    setMetaForm,
    savingMeta,
    metaError,
    publishingId,
    deletingProgId,
    publishModal,
    setPublishModal,
    expandedCreateSections,
    toggleCreateSection,
    setAllCreateSections,
    expandedDetailSections,
    toggleDetailSection,
    setAllDetailSections,
    loadMetaIntoForm,
    handleSaveMeta,
    handleCreateProgramSubmit,
    handleInitiatePublish,
    handleTogglePublish,
    handleDeleteProgram,
  };
}
