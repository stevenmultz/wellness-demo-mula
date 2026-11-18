"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Moon,
  Save,
  Trash2,
  Utensils,
} from "lucide-react";
import { AdminCustomTasksBuilder } from "../AdminCustomTasksBuilder";
import {
  getDaySectionStats,
  getSectionBadgeClass,
  getSectionCardClass,
  getSectionHeaderClass,
  renderSectionProgressBadge,
} from "../adminUtils";
import type { AdminDayFormState, AdminProgram } from "../adminTypes";

interface AdminDayCurriculumTailSectionsProps {
  selectedProgram: AdminProgram;
  selectedDayNum: number;
  dayForm: AdminDayFormState;
  setDayForm: Dispatch<SetStateAction<AdminDayFormState>>;
  expandedDaySections: Record<number, boolean>;
  toggleDaySection: (sec: number) => void;
  handleClearDay: (prog: AdminProgram) => void;
  handleSaveDay: (prog: AdminProgram, goToNextDay?: boolean) => void;
  savingDay: boolean;
  dayError: string | null;
}

export function AdminDayCurriculumTailSections({
  selectedProgram,
  selectedDayNum,
  dayForm,
  setDayForm,
  expandedDaySections,
  toggleDaySection,
  handleClearDay,
  handleSaveDay,
  savingDay,
  dayError,
}: AdminDayCurriculumTailSectionsProps) {
  const targetDays = selectedProgram.durationDays || 21;

  return (
    <>
    {/* POINT 3 (ODD - WHITE): DAILY NUTRITION & HYDRATION GUIDE */}
    <div className={getSectionCardClass(3, Boolean(expandedDaySections[3]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(3)}
        className={getSectionHeaderClass(3)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(3)}>3</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Daily Nutrition &amp; Hydration Guide
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Prescribed daily meals, pre/post-session fueling, and hydration targets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(3, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[3] ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
        </div>
      </button>

      {expandedDaySections[3] && (
        <div className="p-5 sm:p-6 pt-0 space-y-3 border-t border-zinc-100 dark:border-white/10">
          <div className="pt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Meal Recommendation &amp; Hydration Guide</span>
              </label>

              <div className="flex items-center gap-2">
                {selectedDayNum > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const prev = selectedProgram?.days?.find(
                        (d) => d.dayNumber === selectedDayNum - 1
                      );
                      if (prev?.mealRecommendation) {
                        setDayForm((p) => ({
                          ...p,
                          mealRecommendation: prev.mealRecommendation || "",
                        }));
                      }
                    }}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition active:scale-95 inline-flex items-center gap-1"
                  >
                    <span>Copy from Day {selectedDayNum - 1}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDayForm((p) => ({
                      ...p,
                      mealRecommendation:
                        "Breakfast: High-protein Greek yogurt with chia seeds and mixed berries\nLunch: Grilled chicken breast with quinoa and steamed greens\nDinner: Wild-caught salmon with asparagus and avocado salad\nHydration: 2.5L filtered water with electrolytes",
                    }));
                  }}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition active:scale-95 inline-flex items-center gap-1"
                >
                  <span>3 Meals Preset</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Each line entered below becomes a checklist item for members (Meal 1, Meal 2, Meal 3).
            </p>

            <textarea
              rows={4}
              placeholder="Enter recommended meals (each line becomes a checklist meal for members)"
              value={dayForm.mealRecommendation}
              onChange={(e) =>
                setDayForm((p) => ({
                  ...p,
                  mealRecommendation: e.target.value,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
            />
          </div>
        </div>
      )}
    </div>

    {/* POINT 4 (EVEN - MONOCHROME SLATE): CIRCADIAN SLEEP RECOMMENDATION (WIB) */}
    <div className={getSectionCardClass(4, Boolean(expandedDaySections[4]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(4)}
        className={getSectionHeaderClass(4)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(4)}>4</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Circadian Sleep Recommendation (WIB)
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              Evening wind-down target and circadian sleep schedule in WIB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(4, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[4] ? (
            <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          )}
        </div>
      </button>

      {expandedDaySections[4] && (
        <div className="p-5 sm:p-6 pt-0 space-y-2 border-t border-zinc-300/80 dark:border-zinc-700">
          <div className="pt-4 space-y-1.5">
            <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Circadian Sleep Target &amp; Wind-Down Time (WIB)</span>
            </label>
            <input
              type="text"
              placeholder="Enter circadian sleep recommendation"
              value={dayForm.sleepRecommendation}
              onChange={(e) =>
                setDayForm((p) => ({ ...p, sleepRecommendation: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
            />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-light">
              Displayed on the member&apos;s Morning Awakening &amp; Evening Wind-down cockpit card.
            </p>
          </div>
        </div>
      )}
    </div>

    {/* POINT 5 (ODD - WHITE): SCHEDULED PUSH NOTIFICATIONS (WIB) */}
    <div className={getSectionCardClass(5, Boolean(expandedDaySections[5]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(5)}
        className={getSectionHeaderClass(5)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(5)}>5</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Scheduled Push Notifications ({dayForm.dayNotifications?.length || 0} • WIB)
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {dayForm.dayType === "REST_DAY"
                ? "2 automated push reminders configured for Rest Day (WIB)"
                : "3 automated push reminders configured for daily routine (WIB)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(5, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[5] ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
        </div>
      </button>

      {expandedDaySections[5] && (
        <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/10">
          {(selectedProgram.locationType || "ONLINE") === "ONLINE" && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-300">
              Full Online mode: these WIB reminders fire daily for each member&apos;s current incomplete module until they complete the program.
            </div>
          )}
          <div className="space-y-3.5 pt-4">
            {(dayForm.dayNotifications || []).map((notif, idx) => {
              const isEvenNotif = (idx + 1) % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-4 space-y-3 border ${
                    isEvenNotif
                      ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span
                      className={`self-start px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold ${
                        isEvenNotif
                          ? "bg-white text-zinc-900 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                          : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                      }`}
                    >
                      {notif.label || `Reminder ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="time"
                        value={notif.time}
                        onChange={(e) => {
                          const updated = [...dayForm.dayNotifications];
                          updated[idx] = { ...updated[idx], time: e.target.value };
                          setDayForm((p) => ({ ...p, dayNotifications: updated }));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                      <span className="text-[10px] font-mono font-medium text-zinc-500">WIB</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Notification Message
                    </label>
                    <textarea
                      rows={2}
                      value={notif.message}
                      onChange={(e) => {
                        const updated = [...dayForm.dayNotifications];
                        updated[idx] = { ...updated[idx], message: e.target.value };
                        setDayForm((p) => ({ ...p, dayNotifications: updated }));
                      }}
                      placeholder="Enter notification message body..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* POINT 6 (EVEN - SUBTLE GRAY): CUSTOM DAILY TASKS & MEASUREMENTS */}
    <div className={getSectionCardClass(6, Boolean(expandedDaySections[6]))}>
      <button
        type="button"
        onClick={() => toggleDaySection(6)}
        className={getSectionHeaderClass(6)}
      >
        <div className="flex items-center gap-3">
          <span className={getSectionBadgeClass(6)}>6</span>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
              Custom Daily Tasks &amp; Measurements ({dayForm.customTasks?.length || 0})
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              Add body measurements, fitness benchmarks, coach check-ins, or custom checklists for Day {selectedDayNum}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const { filled, total } = getDaySectionStats(6, dayForm);
            return renderSectionProgressBadge(filled, total);
          })()}
          {expandedDaySections[6] ? (
            <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
          )}
        </div>
      </button>

      {expandedDaySections[6] && (
        <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-zinc-300/80 dark:border-zinc-700">
          <div className="pt-4">
            <AdminCustomTasksBuilder
              tasks={dayForm.customTasks}
              onChange={(next) =>
                setDayForm((p) => ({ ...p, customTasks: next }))
              }
            />
          </div>
        </div>
      )}
    </div>

  {/* Action Footer */}
  <div className="pt-4 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      {selectedProgram.days.some(
        (d) => d.dayNumber === selectedDayNum
      ) && (
        <button
          type="button"
          onClick={() => handleClearDay(selectedProgram)}
          disabled={savingDay}
          className="px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition border border-red-200/60 dark:border-red-900/40"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          <span>Clear Day {selectedDayNum}</span>
        </button>
      )}
      <span className="text-[11px] text-zinc-400 hidden sm:inline">
        Changes save directly to program schedule in the database.
      </span>
    </div>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => handleSaveDay(selectedProgram, false)}
        disabled={savingDay}
        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
      >
        {savingDay ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          <Save className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>Save Day {selectedDayNum}</span>
      </button>

      {selectedDayNum < selectedProgram.durationDays && (
        <button
          type="button"
          onClick={() => handleSaveDay(selectedProgram, true)}
          disabled={savingDay}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-xs hover:opacity-90 transition disabled:opacity-50"
        >
          {savingDay ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <>
              <span>Save &amp; Next Day</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </>
          )}
        </button>
      )}
    </div>
  </div>

  {dayError && (
    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-200">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 font-medium">{dayError}</div>
    </div>
  )}
    </>
  );
}
