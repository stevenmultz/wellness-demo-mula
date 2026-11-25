/**
 * Centralized Day-Completion & Activity Predicate Utilities ("Pintu 6").
 *
 * Pure isomorphic module (safe for Server Components, Server Actions, and Client Components).
 * Eliminates drift between server-side `computeVerifiedDayCompletionInTx`, dashboard `daily-tasks`,
 * `MyPlan`, and `CheckIn` client widgets.
 */

export type NormalizedProgramDayType = "TRAINING_DAY" | "REST_DAY" | "CONNECTION_DAY";

/**
 * ONLINE programs do not have physical meetup/connection sessions — any legacy
 * CONNECTION_DAY / MEETUP_DAY on an ONLINE program normalizes to REST_DAY.
 */
export function normalizeProgramDayType(
  locationType: string | null | undefined,
  dayType: string | null | undefined
): NormalizedProgramDayType {
  if (
    locationType === "ONLINE" &&
    (dayType === "CONNECTION_DAY" || dayType === "MEETUP_DAY")
  ) {
    return "REST_DAY";
  }
  if (dayType === "REST_DAY") return "REST_DAY";
  if (dayType === "CONNECTION_DAY" || dayType === "MEETUP_DAY") return "CONNECTION_DAY";
  return "TRAINING_DAY";
}

export function isSleepLogged(
  bedtime: string | null | undefined,
  wakeTime: string | null | undefined
): boolean {
  return Boolean(
    bedtime &&
      wakeTime &&
      bedtime !== "SKIPPED" &&
      wakeTime !== "SKIPPED"
  );
}

export function isMealLogged(mealCompliance: string | null | undefined): boolean {
  return Boolean(mealCompliance && mealCompliance !== "SKIPPED");
}

export function normalizeChecklistItemKey(item: string): string {
  return (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase();
}

export function buildCheckedMovementSet(checks: string[]): Set<string> {
  return new Set(checks.map(normalizeChecklistItemKey));
}

export function isMovementCheckedInSet(
  checkedSet: Set<string>,
  optionName: string | null | undefined,
  movementName: string
): boolean {
  const plainKey = movementName.trim().toLowerCase();
  if (!plainKey) return false;
  const scopedKey = optionName?.trim()
    ? `[${optionName.trim()}] ${movementName.trim()}`.toLowerCase()
    : null;
  return (scopedKey !== null && checkedSet.has(scopedKey)) || checkedSet.has(plainKey);
}

export function isMovementChecked(
  checks: string[],
  optionName: string | null | undefined,
  movementName: string
): boolean {
  return isMovementCheckedInSet(buildCheckedMovementSet(checks), optionName, movementName);
}

export function hasProgramDayActivityInput(
  effectiveDayType: NormalizedProgramDayType,
  state: {
    isVideoWatched?: boolean;
    workoutNotes?: string | null;
    selectedWorkout?: string | null;
    eventFeedback?: string | null;
    checklistCount?: number;
  }
): boolean {
  if (effectiveDayType === "TRAINING_DAY") {
    return Boolean(
      state.isVideoWatched ||
        (state.workoutNotes && state.workoutNotes !== "SKIPPED") ||
        (state.selectedWorkout && state.selectedWorkout !== "SKIPPED") ||
        (state.checklistCount ?? 0) > 0
    );
  }
  if (effectiveDayType === "REST_DAY") {
    return Boolean(
      (state.workoutNotes && state.workoutNotes !== "SKIPPED") ||
        (state.checklistCount ?? 0) > 0
    );
  }
  return Boolean(state.eventFeedback && state.eventFeedback !== "SKIPPED");
}
