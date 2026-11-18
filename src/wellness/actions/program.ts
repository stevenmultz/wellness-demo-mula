"use server";

import type { WellnessActionResult } from "./auth";
import {
  createProgramService,
  deleteProgramService,
  duplicateProgramService,
  setProgramStatusService,
  togglePublishProgramService,
  updateProgramMetaService,
} from "../services/program-admin";
import { deleteProgramDayService, saveProgramDayService } from "../services/program-days";
import {
  getProgramSubmissionsService,
  submitDayProgressService,
  type ProgramSubmissionItem,
  type ProgramSubmissionsPayload,
} from "../services/program-progress";

export type { ProgramSubmissionItem, ProgramSubmissionsPayload };

export async function wellnessAdminCreateProgram(
  rawInput: unknown
): Promise<WellnessActionResult> {
  return createProgramService(rawInput);
}

export async function wellnessAdminSaveProgramDay(
  rawInput: unknown
): Promise<WellnessActionResult> {
  return saveProgramDayService(rawInput);
}

export async function wellnessAdminDeleteProgramDay(
  programId: string,
  dayNumber: number
): Promise<WellnessActionResult> {
  return deleteProgramDayService(programId, dayNumber);
}

export async function wellnessAdminUpdateProgramMeta(
  rawInput: unknown
): Promise<WellnessActionResult> {
  return updateProgramMetaService(rawInput);
}

export async function wellnessAdminSetProgramStatus(
  programId: string,
  rawStatus: "DRAFT" | "REVIEW" | "OPEN" | "PUBLISH" | "DONE" | "ARCHIVE" | string
): Promise<WellnessActionResult<{ status: string; isPublished: boolean }>> {
  return setProgramStatusService(programId, rawStatus);
}

export async function wellnessAdminTogglePublishProgram(
  programId: string,
  publish: boolean
): Promise<WellnessActionResult<{ isPublished: boolean; status: string }>> {
  return togglePublishProgramService(programId, publish);
}

export async function wellnessAdminDeleteProgram(
  programId: string
): Promise<WellnessActionResult> {
  return deleteProgramService(programId);
}

export async function wellnessAdminDuplicateProgram(
  programId: string,
  asNextBatch = true
): Promise<WellnessActionResult> {
  return duplicateProgramService(programId, { asNextBatch });
}

export async function wellnessUserSubmitDayProgress(
  rawInput: unknown
): Promise<WellnessActionResult> {
  return submitDayProgressService(rawInput);
}

export async function wellnessAdminGetProgramSubmissions(
  programId: string,
  filters?: {
    dayNumber?: number;
    userId?: string;
    limit?: number;
  }
): Promise<WellnessActionResult<ProgramSubmissionsPayload>> {
  return getProgramSubmissionsService(programId, filters);
}
