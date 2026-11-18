"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertCircle, Loader2, Lock, Save } from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import type { ProgramTemplateDTO } from "@/wellness/actions/templates";
import type { AdminProgram, ProgramHeaderFormState } from "../adminTypes";
import type { StandardMasterTab } from "../hooks/useMasterDirectoryActions";
import { ProgramFormCoreSections } from "./ProgramFormCoreSections";
import { ProgramFormLogisticsSections } from "./ProgramFormLogisticsSections";
import { ProgramTemplateBar } from "./ProgramTemplateBar";

interface AdminProgramInfoTabProps {
  selectedProgram: AdminProgram;
  metaForm: ProgramHeaderFormState;
  setMetaForm: Dispatch<SetStateAction<ProgramHeaderFormState>>;
  expandedDetailSections: Record<number, boolean>;
  toggleDetailSection: (sec: number) => void;
  setAllDetailSections: (expanded: boolean) => void;
  masterData: MasterDataPayload;
  isSuperadminUser: boolean;
  currentAdminOrgId: string | null;
  navigateToDirectory: (tab: StandardMasterTab) => void;
  handleInitiatePublish: (prog: AdminProgram) => void;
  publishingId: string | null;
  handleSaveMeta: (prog: AdminProgram) => Promise<void>;
  savingMeta: boolean;
  metaError: string | null;
  templates: ProgramTemplateDTO[];
  onApplyHeaderTemplate: (tpl: ProgramTemplateDTO, target: "create" | "edit") => void;
  onSaveHeaderTemplate: (name: string, form: ProgramHeaderFormState) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export function AdminProgramInfoTab({
  selectedProgram,
  metaForm,
  setMetaForm,
  expandedDetailSections,
  toggleDetailSection,
  setAllDetailSections,
  masterData,
  isSuperadminUser,
  currentAdminOrgId,
  navigateToDirectory,
  handleInitiatePublish,
  publishingId,
  handleSaveMeta,
  savingMeta,
  metaError,
  templates,
  onApplyHeaderTemplate,
  onSaveHeaderTemplate,
  onDeleteTemplate,
}: AdminProgramInfoTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Lock Warning Card if Program is Published */}
      {selectedProgram.isPublished && (
        <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-5 border border-zinc-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Program Terms Locked</span>
                <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold">
                  Live &amp; Active
                </span>
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                This program is published and active. Core parameters (pricing, duration, quota, and dates) are locked to protect data integrity and public trust. You can unpublish if no active enrolled members exist.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleInitiatePublish(selectedProgram)}
            disabled={publishingId === selectedProgram.id}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition shrink-0 flex items-center gap-1.5"
          >
            {publishingId === selectedProgram.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>Unpublish Program</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
            Program Configuration
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage metadata, schedule, pricing, community channel, and legal terms.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAllDetailSections(true)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setAllDetailSections(false)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
          >
            Collapse All
          </button>
        </div>
      </div>

      <ProgramTemplateBar
        templateType="PROGRAM_HEADER"
        templates={templates}
        disabled={selectedProgram.isPublished}
        onApply={(tpl) => onApplyHeaderTemplate(tpl, "edit")}
        onSaveAsTemplate={(name) => onSaveHeaderTemplate(name, metaForm)}
        onDeleteTemplate={onDeleteTemplate}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedProgram.isPublished) return;
          handleSaveMeta(selectedProgram);
        }}
        className="space-y-6"
      >
        <ProgramFormCoreSections
          mode="edit"
          form={metaForm}
          setForm={setMetaForm}
          expandedSections={expandedDetailSections}
          onToggleSection={toggleDetailSection}
          isLocked={selectedProgram.isPublished}
          masterData={masterData}
          isSuperadminUser={isSuperadminUser}
          currentAdminOrgId={currentAdminOrgId}
          navigateToDirectory={navigateToDirectory}
        />

        <ProgramFormLogisticsSections
          mode="edit"
          form={metaForm}
          setForm={setMetaForm}
          expandedSections={expandedDetailSections}
          onToggleSection={toggleDetailSection}
          isLocked={selectedProgram.isPublished}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {selectedProgram.isPublished
              ? "Program is currently live. Unpublish to adjust core schedule, quota, or pricing parameters."
              : "Save updates to program information. All daily routines will adjust to new duration."}
          </span>

          {selectedProgram.isPublished ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terms locked while live</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={savingMeta}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-2 shadow-xs hover:opacity-90 transition disabled:opacity-50"
            >
              {savingMeta ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Save className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Save Program Information</span>
            </button>
          )}
        </div>

        {metaError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{metaError}</div>
          </div>
        )}
      </form>
    </div>
  );
}
