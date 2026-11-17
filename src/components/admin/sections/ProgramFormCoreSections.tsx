"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  ImageIcon,
  Sparkles,
  Tag,
  UserCheck,
} from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import {
  DropdownTagPicker,
  SingleSelectDirectoryPicker,
} from "../AdminFormPickers";
import { ProgramBlueprintSectionContent } from "../AdminFormBuilders";
import {
  DIFFICULTY_LEVELS,
  type ProgramHeaderFormState,
} from "../adminTypes";
import {
  getProgramSectionStats,
  getSectionBadgeClass,
  getSectionCardClass,
  getSectionHeaderClass,
  renderSectionProgressBadge,
} from "../adminUtils";
import type { StandardMasterTab } from "../hooks/useMasterDirectoryActions";

export interface ProgramFormSharedProps {
  mode: "create" | "edit";
  form: ProgramHeaderFormState;
  setForm: Dispatch<SetStateAction<ProgramHeaderFormState>>;
  expandedSections: Record<number, boolean>;
  onToggleSection: (sec: number) => void;
  isLocked: boolean;
}

interface ProgramFormCoreSectionsProps extends ProgramFormSharedProps {
  masterData: MasterDataPayload;
  isSuperadminUser: boolean;
  currentAdminOrgId: string | null;
  navigateToDirectory: (tab: StandardMasterTab) => void;
}

function computeInclusiveDays(
  startStr: string,
  endStr: string,
  fallback: number
): number {
  const s = new Date(startStr);
  const en = new Date(endStr);
  if (!isNaN(s.getTime()) && !isNaN(en.getTime()) && en >= s) {
    return Math.max(
      1,
      Math.round((en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }
  return fallback;
}

export function ProgramFormCoreSections({
  mode,
  form,
  setForm,
  expandedSections,
  onToggleSection,
  isLocked,
  masterData,
  isSuperadminUser,
  currentAdminOrgId,
  navigateToDirectory,
}: ProgramFormCoreSectionsProps) {
  void currentAdminOrgId;
  const sec1Stats = getProgramSectionStats(1, form);
  const sec2Stats = getProgramSectionStats(2, form);
  const sec3Stats = getProgramSectionStats(3, form);
  const sec4Stats = getProgramSectionStats(4, form);

  return (
    <>
      {/* SECTION 1: PROGRAM INFORMATION (ODD) */}
      <div className={getSectionCardClass(1, expandedSections[1])}>
        <button
          type="button"
          onClick={() => onToggleSection(1)}
          className={getSectionHeaderClass(1)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(1)}>1</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Program Information
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Core identity, intensity level, banner imagery, and public synopsis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec1Stats.filled, sec1Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[1] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[1] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="grid sm:grid-cols-3 gap-5 pt-3">
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Program Title *
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Enter the program title..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Difficulty / Intensity *
                </label>
                <select
                  disabled={isLocked}
                  value={form.difficultyLevel}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, difficultyLevel: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="" disabled>
                    Choose difficulty...
                  </option>
                  {DIFFICULTY_LEVELS.map((lvl) => (
                    <option
                      key={lvl.value}
                      value={lvl.value}
                      className="bg-white dark:bg-zinc-900"
                    >
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cover / Banner Image with Preview */}
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Cover / Banner Image URL</span>
                  </label>
                  {form.coverImage && !isLocked && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, coverImage: "" }))}
                      className="text-[10px] text-zinc-500 hover:text-red-500 transition underline"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  disabled={isLocked}
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, coverImage: e.target.value }))
                  }
                  placeholder="Enter cover image URL..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
                <div className="relative h-28 sm:h-36 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                  {form.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.coverImage}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-zinc-400 text-center px-4">
                      <ImageIcon className="w-6 h-6 stroke-1 text-zinc-400" />
                      <span className="text-[11px]">
                        Recommended 16:9 banner preview will appear here
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3 space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Short Description *
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={isLocked}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Enter program description..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PURPOSE, TARGET STATE & SCIENTIFIC BASIS (EVEN) */}
      <div className={getSectionCardClass(2, expandedSections[2])}>
        <button
          type="button"
          onClick={() => onToggleSection(2)}
          className={getSectionHeaderClass(2)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(2)}>2</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Purpose, Target State &amp; Scientific Basis
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Target physical/mental condition, methodology, tangible benefits, clinical references, and daily guidelines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec2Stats.filled, sec2Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[2] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[2] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
            <ProgramBlueprintSectionContent
              disabled={isLocked}
              targetState={form.targetState}
              onChangeTargetState={(val) =>
                setForm((p) => ({ ...p, targetState: val }))
              }
              methodology={form.methodology}
              onChangeMethodology={(val) =>
                setForm((p) => ({ ...p, methodology: val }))
              }
              expectedBenefits={form.expectedBenefits}
              onChangeBenefits={(next) =>
                setForm((p) => ({ ...p, expectedBenefits: next }))
              }
              scientificReferences={form.scientificReferences}
              onChangeReferences={(next) =>
                setForm((p) => ({ ...p, scientificReferences: next }))
              }
              programGuidelines={form.programGuidelines}
              onChangeGuidelines={(next) =>
                setForm((p) => ({ ...p, programGuidelines: next }))
              }
            />
          </div>
        )}
      </div>

      {/* SECTION 3: DIRECTORIES & CLASSIFICATION (ODD) */}
      <div className={getSectionCardClass(3, expandedSections[3])}>
        <button
          type="button"
          onClick={() => onToggleSection(3)}
          className={getSectionHeaderClass(3)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(3)}>3</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                Directories &amp; Classification
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Taxonomy, coaching team, target personas, equipment, and daily commitment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec3Stats.filled, sec3Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[3] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[3] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-6">
            <div className="space-y-6 pt-3">
              <DropdownTagPicker
                label="Category / Categories *"
                subLabel="Program taxonomy & disciplines (select from master list)"
                disabled={isLocked}
                value={form.category}
                onChange={(val) => setForm((p) => ({ ...p, category: val }))}
                options={masterData.categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                selectPlaceholder="Enter or select category..."
                onManage={isSuperadminUser ? () => navigateToDirectory("categories") : undefined}
                manageLabel="+ Manage in Categories Directory"
                icon={Tag}
              />

              <SingleSelectDirectoryPicker
                label="Daily Time Commitment *"
                subLabel="Estimated daily session length"
                value={form.dailyCommitment}
                onChange={(val) =>
                  setForm((p) => ({ ...p, dailyCommitment: val }))
                }
                options={masterData.dailyCommitments || []}
                onManage={isSuperadminUser ? () => navigateToDirectory("commitments") : undefined}
                manageLabel="+ Manage in Commitments Directory"
                placeholder="Enter or select daily time commitment..."
                icon={Clock}
                disabled={isLocked}
              />

              <DropdownTagPicker
                label="Equipment Needed"
                subLabel="Required tools & gear (select from master list)"
                disabled={isLocked}
                value={form.equipment}
                onChange={(val) => setForm((p) => ({ ...p, equipment: val }))}
                options={masterData.equipment || []}
                selectPlaceholder="Enter or select equipment..."
                onManage={isSuperadminUser ? () => navigateToDirectory("equipment") : undefined}
                manageLabel="+ Manage in Equipment Directory"
                icon={Dumbbell}
              />

              <DropdownTagPicker
                label="Coach / Coaches *"
                subLabel="Instructors assigned to lead this program"
                disabled={isLocked}
                value={form.coachName}
                onChange={(val) => setForm((p) => ({ ...p, coachName: val }))}
                options={masterData.coaches.map((c) => ({
                  id: c.id,
                  name: c.name,
                  title: c.title,
                }))}
                selectPlaceholder="Enter or select coach..."
                onManage={isSuperadminUser ? () => navigateToDirectory("coaches") : undefined}
                manageLabel="+ Manage in Coaches Directory"
                icon={UserCheck}
              />

              <DropdownTagPicker
                label="Target Audience (Recommended For) *"
                subLabel="Ideal participant demographics & personas (e.g. Private Sector Employees, Creative Workers)"
                disabled={isLocked}
                value={form.recommendedFor}
                onChange={(val) =>
                  setForm((p) => ({ ...p, recommendedFor: val }))
                }
                options={masterData.targetAudiences.map((a) => ({
                  id: a.id,
                  name: a.name,
                }))}
                selectPlaceholder="Enter or select target audience..."
                onManage={isSuperadminUser ? () => navigateToDirectory("audience") : undefined}
                manageLabel="+ Manage in Audience Directory"
                icon={Sparkles}
              />

              {/* Community / Brand Creator & Language */}
              <div className="pt-4 border-t border-zinc-100 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Community / Brand Host (Optional)
                  </label>
                  <select
                    disabled={isLocked || !isSuperadminUser}
                    value={form.organizationId}
                    onChange={(e) => {
                      const org = (masterData.organizations || []).find(
                        (o) => o.id === e.target.value
                      );
                      setForm((p) => ({
                        ...p,
                        organizationId: e.target.value,
                        organizationCache: org?.name || "",
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="">zera.id (Default Platform)</option>
                    {(masterData.organizations || []).map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Program Primary Language
                  </label>
                  <select
                    disabled={isLocked}
                    value={form.language}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        language: e.target.value as "id" | "en" | "bilingual",
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="id">Indonesia (ID)</option>
                    <option value="en">English (EN)</option>
                    <option value="bilingual">Bilingual (ID &amp; EN)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    English Title Override (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={form.titleEn}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, titleEn: e.target.value }))
                    }
                    placeholder="Optional English program title..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    English Description Override (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={form.descriptionEn}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, descriptionEn: e.target.value }))
                    }
                    placeholder="Optional English summary..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: DATES & DURATION (EVEN) */}
      <div className={getSectionCardClass(4, expandedSections[4])}>
        <button
          type="button"
          onClick={() => onToggleSection(4)}
          className={getSectionHeaderClass(4)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={getSectionBadgeClass(4)}>4</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                {mode === "create"
                  ? "Schedule & Registration Dates"
                  : "Schedule & Duration"}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {mode === "create"
                  ? `Start, end, and cutoff timelines in WIB (${form.durationDays} Days • Asia/Jakarta)`
                  : "Program run window and registration cutoff timeline in WIB (Asia/Jakarta)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {renderSectionProgressBadge(sec4Stats.filled, sec4Stats.total)}
            <div className="p-1 rounded-lg text-zinc-400">
              {expandedSections[4] ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>

        {expandedSections[4] && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
            {mode === "edit" && (
              <div className="flex items-center justify-between pt-3 pb-1 border-b border-zinc-300/50 dark:border-zinc-700/50">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Calendar timeline (WIB • Asia/Jakarta)
                </span>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium">
                  Duration: {form.durationDays} Days (Day 1 – Day {form.durationDays})
                </span>
              </div>
            )}

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${
                mode === "create" ? "pt-3" : ""
              }`}
            >
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Start Date (WIB) *
                </label>
                <input
                  type="date"
                  required
                  disabled={isLocked}
                  value={form.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setForm((p) => ({
                      ...p,
                      startDate: newStart,
                      durationDays: computeInclusiveDays(
                        newStart,
                        p.endDate,
                        p.durationDays
                      ),
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  End Date (WIB) *
                </label>
                <input
                  type="date"
                  required
                  disabled={isLocked}
                  value={form.endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setForm((p) => ({
                      ...p,
                      endDate: newEnd,
                      durationDays: computeInclusiveDays(p.startDate, newEnd, 1),
                    }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Registration Open Date (WIB)
                </label>
                <input
                  type="date"
                  disabled={isLocked}
                  value={form.registrationOpenDate}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      registrationOpenDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Registration Cutoff Date (WIB) *
                </label>
                <input
                  type="date"
                  required
                  disabled={isLocked}
                  value={form.registrationDeadline}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      registrationDeadline: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>
            </div>

            {mode === "edit" && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300/70 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Duration is automatically calculated from the date range ({form.durationDays} days). If shortened, schedule entries beyond Day {form.durationDays} will be trimmed. If extended, existing saved days are preserved.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
