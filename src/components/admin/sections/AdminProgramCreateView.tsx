"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Plus } from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import type { ProgramHeaderFormState } from "../adminTypes";
import type { StandardMasterTab } from "../hooks/useMasterDirectoryActions";
import { ProgramFormCoreSections } from "./ProgramFormCoreSections";
import { ProgramFormLogisticsSections } from "./ProgramFormLogisticsSections";

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
}: AdminProgramCreateViewProps) {
  const router = useRouter();

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
            Configure program metadata, schedule duration, master coach, audience, pricing, and terms. Saved as Draft until you choose to publish.
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
