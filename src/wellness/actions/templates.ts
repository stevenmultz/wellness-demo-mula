"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requireAdminAccess, requirePlatformAdmin } from "../security/guards";
import { isPlatformAdminRole } from "../security/roles";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

export type ProgramTemplateTypeDTO = "PROGRAM_HEADER" | "DAY_ROUTINE";

export interface ProgramHeaderTemplatePayload {
  targetState?: string;
  methodology?: string;
  expectedBenefits?: string[];
  scientificReferences?: Array<{ title: string; url?: string }>;
  programGuidelines?: string[];
  customTerms?: string;
  termsList?: string[];
  termsChapters?: Array<{ chapter: string; clauses: string[] }>;
  communityLink?: string;
  equipment?: string;
  dailyCommitment?: string;
  difficultyLevel?: string;
  category?: string;
}

export interface DayRoutineTemplatePayload {
  dayType?: "TRAINING_DAY" | "REST_DAY" | "CONNECTION_DAY";
  sleepRecommendation?: string;
  mealRecommendation?: string;
  restInstructions?: string;
  videoLinks?: Array<{ title: string; url: string }>;
  onsiteVenue?: string;
  onsiteSchedule?: string;
  meetupLink?: string;
  mapLink?: string;
  eventTitle?: string;
  eventHost?: string;
  eventDetails?: string;
  workoutGroups?: Array<{
    optionName: string;
    movements: Array<{ name: string; target: string }>;
  }>;
  dayNotifications?: Array<{ time: string; label: string; message: string }>;
  customTasks?: Array<{
    sortOrder: number;
    taskType: string;
    title: string;
    instructions?: string;
    isRequired?: boolean;
    fields: Array<Record<string, unknown>>;
    translations?: string | null;
  }>;
}

export interface ProgramTemplateDTO {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  templateType: ProgramTemplateTypeDTO;
  name: string;
  description: string | null;
  payload: ProgramHeaderTemplatePayload | DayRoutineTemplatePayload;
  isPlatformDefault: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

const SaveTemplateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  templateType: z.enum(["PROGRAM_HEADER", "DAY_ROUTINE"]),
  name: z.string().trim().min(2, "Template name must be at least 2 characters.").max(100),
  description: z.string().trim().max(300).optional().nullable(),
  organizationId: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.unknown()),
});

export async function wellnessGetProgramTemplates(): Promise<
  WellnessActionResult<ProgramTemplateDTO[]>
> {
  const session = await requireAdminAccess();

  const where = isPlatformAdminRole(session.role)
    ? undefined
    : session.organizationId
      ? { OR: [{ organizationId: null }, { organizationId: session.organizationId }] }
      : { organizationId: null };

  const rows = await prisma.programTemplate.findMany({
    where,
    take: 100,
    include: { organization: { select: { name: true } } },
    orderBy: [{ organizationId: "asc" }, { updatedAt: "desc" }],
  });

  return {
    success: true,
    message: "OK",
    data: rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      organizationName: row.organization?.name ?? null,
      templateType: row.templateType as ProgramTemplateTypeDTO,
      name: row.name,
      description: row.description,
      payload: (row.payloadJson || {}) as ProgramHeaderTemplatePayload | DayRoutineTemplatePayload,
      isPlatformDefault: row.organizationId === null,
      canEdit: isPlatformAdminRole(session.role),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function wellnessSaveProgramTemplate(
  rawInput: unknown
): Promise<WellnessActionResult<ProgramTemplateDTO>> {
  const session = await requirePlatformAdmin();

  const parsed = SaveTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid template data.",
    };
  }

  const { id, templateType, name, description, organizationId, payload } = parsed.data;
  if (JSON.stringify(payload).length > 100_000) {
    return {
      success: false,
      message: "Template payload is too large (max 100 KB).",
    };
  }
  const resolvedOrgId = organizationId?.trim() || null;

  let saved;
  if (id) {
    const existing = await prisma.programTemplate.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Template not found." };
    }
    saved = await prisma.programTemplate.update({
      where: { id },
      data: {
        name,
        description: description?.trim() || null,
        templateType,
        payloadJson: payload as Prisma.InputJsonValue,
      },
      include: { organization: { select: { name: true } } },
    });
  } else {
    saved = await prisma.programTemplate.create({
      data: {
        organizationId: resolvedOrgId,
        templateType,
        name,
        description: description?.trim() || null,
        payloadJson: payload as Prisma.InputJsonValue,
        createdById: session.userId,
      },
      include: { organization: { select: { name: true } } },
    });
  }

  await recordAuditLog({
    actorUserId: session.userId,
    action: id ? "PROGRAM_TEMPLATE_UPDATED" : "PROGRAM_TEMPLATE_CREATED",
    entityType: "ProgramTemplate",
    entityId: saved.id,
    metadata: { templateType, name, organizationId: resolvedOrgId },
  });

  try {
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore outside request context
  }

  return {
    success: true,
    message: `Template "${saved.name}" saved.`,
    data: {
      id: saved.id,
      organizationId: saved.organizationId,
      organizationName: saved.organization?.name ?? null,
      templateType: saved.templateType as ProgramTemplateTypeDTO,
      name: saved.name,
      description: saved.description,
      payload: (saved.payloadJson || {}) as ProgramHeaderTemplatePayload | DayRoutineTemplatePayload,
      isPlatformDefault: saved.organizationId === null,
      canEdit: true,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    },
  };
}

export async function wellnessDeleteProgramTemplate(id: string): Promise<WellnessActionResult> {
  await requirePlatformAdmin();

  const existing = await prisma.programTemplate.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, message: "Template not found." };
  }

  await prisma.programTemplate.delete({ where: { id } });

  try {
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore outside request context
  }

  return { success: true, message: `Template "${existing.name}" deleted.` };
}
