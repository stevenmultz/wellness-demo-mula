"use client";

import { useMemo, useState } from "react";
import {
  wellnessAdminGetProgramSubmissions,
  type ProgramSubmissionItem,
} from "@/wellness/actions/program";

export function useProgramSubmissions() {
  const [programSubmissions, setProgramSubmissions] = useState<ProgramSubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionStats, setSubmissionStats] = useState<{
    totalSubmissions: number;
    completedSubmissions: number;
    photoSubmissions: number;
    uniqueMembers: number;
  }>({
    totalSubmissions: 0,
    completedSubmissions: 0,
    photoSubmissions: 0,
    uniqueMembers: 0,
  });
  const [submissionDayFilter, setSubmissionDayFilter] = useState<number | "ALL">("ALL");
  const [submissionMemberFilter, setSubmissionMemberFilter] = useState<string>("ALL");
  const [submissionPhotosOnly, setSubmissionPhotosOnly] = useState<boolean>(false);
  const [submissionSearch, setSubmissionSearch] = useState<string>("");

  const loadProgramSubmissions = async (
    progId: string,
    filters?: { dayNumber?: number; userId?: string; hasPhotosOnly?: boolean }
  ) => {
    if (!progId) return;
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const res = await wellnessAdminGetProgramSubmissions(progId, filters);
      if (res.success && res.data) {
        setProgramSubmissions(res.data.submissions);
        setSubmissionStats(res.data.stats);
      } else {
        setSubmissionsError(res.message || "Failed to load submissions.");
      }
    } catch {
      setSubmissionsError("An unexpected error occurred while loading member responses.");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return programSubmissions.filter((sub) => {
      if (submissionDayFilter !== "ALL" && sub.dayNumber !== submissionDayFilter) {
        return false;
      }
      if (submissionMemberFilter !== "ALL" && sub.userId !== submissionMemberFilter) {
        return false;
      }
      if (submissionPhotosOnly && !sub.photoBeforeUrl && !sub.photoAfterUrl) {
        return false;
      }
      if (submissionSearch.trim()) {
        const query = submissionSearch.toLowerCase();
        const matchesName = sub.userName.toLowerCase().includes(query);
        const matchesEmail = sub.userEmail.toLowerCase().includes(query);
        const matchesNotes = sub.workoutNotes?.toLowerCase().includes(query);
        const matchesReflection = sub.dailyReflection?.toLowerCase().includes(query);
        const matchesDayTitle = sub.dayTitle.toLowerCase().includes(query);
        if (
          !matchesName &&
          !matchesEmail &&
          !matchesNotes &&
          !matchesReflection &&
          !matchesDayTitle
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    programSubmissions,
    submissionDayFilter,
    submissionMemberFilter,
    submissionPhotosOnly,
    submissionSearch,
  ]);

  return {
    programSubmissions,
    submissionsLoading,
    submissionsError,
    submissionStats,
    submissionDayFilter,
    setSubmissionDayFilter,
    submissionMemberFilter,
    setSubmissionMemberFilter,
    submissionPhotosOnly,
    setSubmissionPhotosOnly,
    submissionSearch,
    setSubmissionSearch,
    loadProgramSubmissions,
    filteredSubmissions,
  };
}
