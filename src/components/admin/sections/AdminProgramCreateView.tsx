"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Globe, Loader2, MapPin, Plus } from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import type { ProgramTemplateDTO } from "@/wellness/actions/templates";
import type { ProgramHeaderFormState } from "../adminTypes";
import { computeEndDate, formatWIBDateISO } from "../adminUtils";
import type { StandardMasterTab } from "../hooks/useMasterDirectoryActions";
import { ProgramFormCoreSections } from "./ProgramFormCoreSections";
import { ProgramFormLogisticsSections } from "./ProgramFormLogisticsSections";
import { ProgramTemplateBar } from "./ProgramTemplateBar";

interface AdminProgramCreateViewProps {
  createForm: ProgramHeaderFormState;
  setCreateForm: Dispatch<SetStateAction<ProgramHeaderFormState>>;
  expandedCreateSections: Record<number, boolean>;
  toggleCreateSection: (sec: number) => void;
  setAllCreateSections: (expanded: boolean) => void;
  masterData: MasterDataPayload;
  isSuperadminUser: boolean;
  currentAdminOrgId: string | null;
  navigateToDirectory: (tab: StandardMasterTab) => void;
  setIsCreatingProgram: (val: boolean) => void;
  handleCreateProgramSubmit: (e: FormEvent) => Promise<void>;
  creatingLoading: boolean;
  createError: string | null;
  templates: ProgramTemplateDTO[];
  onApplyHeaderTemplate: (tpl: ProgramTemplateDTO, target: "create" | "edit") => void;
  onSaveHeaderTemplate: (name: string, form: ProgramHeaderFormState) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export function AdminProgramCreateView({
  createForm,
  setCreateForm,
  expandedCreateSections,
  toggleCreateSection,
  setAllCreateSections,
  masterData,
  isSuperadminUser,
  currentAdminOrgId,
  navigateToDirectory,
  setIsCreatingProgram,
  handleCreateProgramSubmit,
  creatingLoading,
  createError,
  templates,
  onApplyHeaderTemplate,
  onSaveHeaderTemplate,
  onDeleteTemplate,
}: AdminProgramCreateViewProps) {
  const router = useRouter();

  const handleSelectMode = (nextMode: "ONLINE" | "HYBRID") => {
    setCreateForm((p) => {
      if (nextMode === "ONLINE") {
        return {
          ...p,
          locationType: "ONLINE",
          batchNumber: null,
          durationDays: Math.max(1, p.durationDays || 1),
          startDate: "",
          endDate: "",
          registrationOpenDate: "",
          registrationDeadline: "",
          city: "",
          venueAddress: "",
        };
      }
      const defaultOpen = p.registrationOpenDate || formatWIBDateISO(new Date());
      const defaultStart =
        p.startDate || formatWIBDateISO(new Date(Date.now() + 3 * 24 * 3600 * 1000));
      const defaultEnd =
        p.endDate || computeEndDate(defaultStart, Math.max(7, p.durationDays || 7));
      const defaultDeadline =
        p.registrationDeadline ||
        formatWIBDateISO(new Date(Date.now() + 2 * 24 * 3600 * 1000));
      return {
        ...p,
        locationType: "HYBRID",
        batchNumber: p.batchNumber ?? 1,
        durationDays: Math.max(7, p.durationDays || 7),
        city: p.city || "Jakarta",
        startDate: defaultStart,
        endDate: defaultEnd,
        registrationOpenDate: defaultOpen,
        registrationDeadline: defaultDeadline,
      };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Back Button and Expand/Collapse Controls */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-7 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setIsCreatingProgram(false);
              router.push("/admin/programs");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Programs
          </button>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            Create Program Header
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Step 1: Choose Full Online (anytime modules) or Hybrid (fixed cohort dates + Connect Days), then configure details and terms. Saved as Draft until published.
          </p>
        </div>

        {/* Global Expand All / Collapse All Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setAllCreateSections(true)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setAllCreateSections(false)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* STEP 1: CHOOSE PROGRAM MODE FIRST */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
            Step 1 · Select Delivery Mode
          </h3>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Adapts fields below automatically
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSelectMode("ONLINE")}
            className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
              createForm.locationType === "ONLINE"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-sm"
                : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Full Online · Anytime Access</p>
              <p
                className={`text-[11px] mt-0.5 ${
                  createForm.locationType === "ONLINE"
                    ? "text-white/80 dark:text-zinc-700"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                No start/end dates or fixed duration days. Add modules freely and members still receive daily WIB notifications.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("HYBRID")}
            className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
              createForm.locationType === "HYBRID"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-sm"
                : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400"
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Hybrid (Online + Onsite Connect)</p>
              <p
                className={`text-[11px] mt-0.5 ${
                  createForm.locationType === "HYBRID"
                    ? "text-white/80 dark:text-zinc-700"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                Cohort schedule with Start–End dates, Batch numbering, City/Studio venue, and live Connect Days.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* HEADER TEMPLATES BAR */}
      <ProgramTemplateBar
        templateType="PROGRAM_HEADER"
        templates={templates}
        onApply={(tpl) => onApplyHeaderTemplate(tpl, "create")}
        onSaveAsTemplate={(name) => onSaveHeaderTemplate(name, createForm)}
        onDeleteTemplate={onDeleteTemplate}
      />

      {/* Program Header Form */}
      <form onSubmit={handleCreateProgramSubmit} className="space-y-6">
        <ProgramFormCoreSections
          mode="create"
          form={createForm}
          setForm={setCreateForm}
          expandedSections={expandedCreateSections}
          onToggleSection={toggleCreateSection}
          isLocked={false}
          masterData={masterData}
          isSuperadminUser={isSuperadminUser}
          currentAdminOrgId={currentAdminOrgId}
          navigateToDirectory={navigateToDirectory}
        />

        <ProgramFormLogisticsSections
          mode="create"
          form={createForm}
          setForm={setCreateForm}
          expandedSections={expandedCreateSections}
          onToggleSection={toggleCreateSection}
          isLocked={false}
        />

        {/* SUBMIT / CANCEL ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
              Save as Quick Draft or Complete Program Header
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
              Requires Program Title. Remaining 8 header sections and day-by-day routines can be filled at your own pace before publishing.
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCreatingProgram(false);
                router.push("/admin/programs");
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingLoading}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition shadow-xs disabled:opacity-50"
            >
              {creatingLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Create Program (Quick Draft)</span>
            </button>
          </div>
        </div>

        {/* Validation error message directly below action buttons */}
        {createError && (
          <div className="p-4 rounded-xl text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{createError}</span>
          </div>
        )}
      </form>
    </div>
  );
}
