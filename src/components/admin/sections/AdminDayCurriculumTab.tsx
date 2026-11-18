"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  Dumbbell,
  MapPin,
} from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import type { ProgramTemplateDTO } from "@/wellness/actions/templates";
import {
  getDefaultNotificationsForType,
  type AdminDayFormState,
  type AdminProgram,
} from "../adminTypes";
import {
  getDaySectionStats,
  getSectionBadgeClass,
  getSectionCardClass,
  getSectionHeaderClass,
  renderSectionProgressBadge,
} from "../adminUtils";
import { AdminDaySelectorBar } from "./AdminDaySelectorBar";
import { AdminDayTrainingSection } from "./AdminDayTrainingSection";
import { AdminDayRestAndConnectSection } from "./AdminDayRestAndConnectSection";
import { AdminDayCurriculumTailSections } from "./AdminDayCurriculumTailSections";
import { ProgramTemplateBar } from "./ProgramTemplateBar";

interface AdminDayCurriculumTabProps {
  selectedProgram: AdminProgram;
  selectedDayNum: number;
  dayForm: AdminDayFormState;
  setDayForm: Dispatch<SetStateAction<AdminDayFormState>>;
  expandedDaySections: Record<number, boolean>;
  toggleDaySection: (sec: number) => void;
  masterData: MasterDataPayload;
  handleSelectDay: (prog: AdminProgram, dayNum: number) => void;
  handleClearDay: (prog: AdminProgram) => void;
  handleSaveDay: (prog: AdminProgram, goToNextDay?: boolean) => void;
  savingDay: boolean;
  dayError: string | null;
  templates: ProgramTemplateDTO[];
  onApplyDayTemplate: (tpl: ProgramTemplateDTO) => void;
  onSaveDayTemplate: (name: string, dayForm: AdminDayFormState) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export function AdminDayCurriculumTab({
  selectedProgram,
  selectedDayNum,
  dayForm,
  setDayForm,
  expandedDaySections,
  toggleDaySection,
  masterData,
  handleSelectDay,
  handleClearDay,
  handleSaveDay,
  savingDay,
  dayError,
  templates,
  onApplyDayTemplate,
  onSaveDayTemplate,
  onDeleteTemplate,
}: AdminDayCurriculumTabProps) {
  void masterData;
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminDaySelectorBar
        selectedProgram={selectedProgram}
        selectedDayNum={selectedDayNum}
        dayForm={dayForm}
        handleSelectDay={handleSelectDay}
      />

      <ProgramTemplateBar
        templateType="DAY_ROUTINE"
        templates={templates}
        onApply={onApplyDayTemplate}
        onSaveAsTemplate={(name) => onSaveDayTemplate(name, dayForm)}
        onDeleteTemplate={onDeleteTemplate}
      />

{/* Day Content Form (5-Point Accordion) */}
<div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-8 space-y-6 border border-zinc-200/80 dark:border-white/10 shadow-xs">
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-white/10 pb-5">
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
        Day {selectedDayNum} Protocol • Curriculum Blueprint
      </h3>
      <p className="text-[11px] text-zinc-400 mt-0.5">
        Select day type on the right to configure daily identity, activities, nutrition, sleep (WIB), and push reminders
      </p>
    </div>

    {/* Direct Day Type Selector (Replaces Expand/Collapse All) */}
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 gap-1">
        {(
          [
            {
              value: "TRAINING_DAY",
              label: "Training",
              icon: Dumbbell,
            },
            {
              value: "REST_DAY",
              label: "Rest",
              icon: Coffee,
            },
            ...(selectedProgram.locationType === "HYBRID"
              ? [
                  {
                    value: "CONNECTION_DAY" as const,
                    label: "Connect",
                    icon: MapPin,
                  },
                ]
              : []),
          ] as const
        ).map((typeOpt) => {
          const Icon = typeOpt.icon;
          const active =
            dayForm.dayType === typeOpt.value ||
            (typeOpt.value === "CONNECTION_DAY" &&
              dayForm.dayType === "MEETUP_DAY");
          return (
            <button
              key={typeOpt.value}
              type="button"
              onClick={() =>
                setDayForm((p) => ({
                  ...p,
                  dayType: typeOpt.value,
                  dayNotifications: getDefaultNotificationsForType(
                    typeOpt.value
                  ),
                }))
              }
              className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
                active
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{typeOpt.label}</span>
            </button>
          );
        })}
      </div>
      {selectedProgram.locationType === "ONLINE" &&
        (dayForm.dayType === "CONNECTION_DAY" ||
          dayForm.dayType === "MEETUP_DAY") && (
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Full Online programs do not support Connect days. Switch this day to Training or Rest.
          </p>
        )}
    </div>
  </div>

  {/* 5-POINT ACCORDION STACK */}
  <div className="space-y-4">
    {/* POINT 1 (ODD - WHITE): DAY IDENTITY & COACH ASSIGNMENT */}
    <div className={getSectionCardClass(1, Boolean(expandedDaySections[1]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(1)}
        className={getSectionHeaderClass(1)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(1)}>1</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              {selectedProgram.locationType === "ONLINE" ? "Module Title" : "Day Title"}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedProgram.locationType === "ONLINE"
                ? `Name for Module ${selectedDayNum}`
                : `Name for Day ${selectedDayNum}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(1, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[1] ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {expandedDaySections[1] && (
        <div className="p-5 sm:p-6 pt-0 space-y-5 border-t border-zinc-100 dark:border-white/10">
          <div className="pt-4 space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {selectedProgram.locationType === "ONLINE" ? "Module Title *" : "Day Title *"}
            </label>
            <input
              type="text"
              placeholder={`Enter ${selectedProgram.locationType === "ONLINE" ? "module" : "day"} ${selectedDayNum} title...`}
              value={dayForm.title}
              onChange={(e) =>
                setDayForm((p) => ({ ...p, title: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
            />
          </div>
        </div>
      )}
    </div>

    {/* POINT 2 (EVEN - MONOCHROME SLATE): CORE ACTIVITY, VIDEOS & SYNCHRONIZED WORKOUT OPTIONS */}
    <div className={getSectionCardClass(2, Boolean(expandedDaySections[2]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(2)}
        className={getSectionHeaderClass(2)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(2)}>2</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              {dayForm.dayType === "TRAINING_DAY"
                ? "Training Videos, Workout Options & Movement Checklists"
                : dayForm.dayType === "REST_DAY"
                ? "Parasympathetic Restoration & Recovery Protocol"
                : "Studio Venue, Schedule (WIB) & Virtual Stream"}
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              {dayForm.dayType === "TRAINING_DAY"
                ? `${dayForm.videoLinks.filter((v) => v.url.trim()).length} YouTube video link(s) • ${dayForm.workoutGroups.length} synchronized workout option(s)`
                : dayForm.dayType === "REST_DAY"
                ? "Active decompression, nervous system reset, and mobility guidance"
                : "Onsite studio venue, WIB session schedule, Google Maps link, and virtual broadcast"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(2, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[2] ? (
            <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          )}
        </div>
      </button>

      {expandedDaySections[2] && (
        <div className="p-5 sm:p-6 pt-0 space-y-6 border-t border-zinc-300/80 dark:border-zinc-700">
                      {dayForm.dayType === "TRAINING_DAY" && (
                        <AdminDayTrainingSection dayForm={dayForm} setDayForm={setDayForm} />
                      )}
                      <AdminDayRestAndConnectSection dayForm={dayForm} setDayForm={setDayForm} />
                    </div>
                  )}
                </div>

                <AdminDayCurriculumTailSections
                  selectedProgram={selectedProgram}
                  selectedDayNum={selectedDayNum}
                  dayForm={dayForm}
                  setDayForm={setDayForm}
                  expandedDaySections={expandedDaySections}
                  toggleDaySection={toggleDaySection}
                  handleClearDay={handleClearDay}
                  handleSaveDay={handleSaveDay}
                  savingDay={savingDay}
                  dayError={dayError}
                />
              </div>
      </div>
    </div>
  );
}
