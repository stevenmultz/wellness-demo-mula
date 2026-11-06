"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, Compass, ExternalLink, MessageCircle } from "lucide-react";
import type { ProgramDailyPlan, DailyTask } from "@/wellness/utils/daily-tasks";
import { EmptyState, FloatingHeader, SectionCard, formatDateWib, safeHttpUrl } from "./shared";

export interface PlanOption {
  programId: string;
  title: string;
}

/* -------------------------------------------------------------------------- */
/* HEADER: static logo (left) + current plan dropdown / "Explore Plan" (right) */
/* -------------------------------------------------------------------------- */
export function MyPlanHeader({
  visible,
  plans,
  selectedProgramId,
  onSelect,
  onExplore,
}: {
  visible: boolean;
  plans: PlanOption[];
  selectedProgramId: string;
  onSelect: (programId: string) => void;
  onExplore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = plans.find((p) => p.programId === selectedProgramId) || plans[0] || null;

  return (
    <FloatingHeader visible={visible}>
      {/* LEFT: logo is intentionally NOT interactive (no link, no navigation, no action) */}
      <span
        aria-label="+BMS"
        className="select-none cursor-default flex items-center gap-1 text-zinc-950 dark:text-white"
      >
        <span className="font-light text-lg leading-none">+</span>
        <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
      </span>

      {/* RIGHT: plan info */}
      <div className="relative min-w-0">
        {!current ? (
          <button
            type="button"
            onClick={onExplore}
            className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 active:scale-95 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Plan</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="max-w-[210px] sm:max-w-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-white text-xs transition active:scale-95"
            >
              <span className="truncate font-semibold uppercase tracking-wide">{current.title}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <ul
                  role="listbox"
                  className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#0c0c10] border border-zinc-200 dark:border-white/15 p-2 shadow-2xl z-50"
                >
                  <li className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                    My Plans ({plans.length})
                  </li>
                  {plans.map((p) => {
                    const selected = p.programId === current.programId;
                    return (
                      <li key={p.programId} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(p.programId);
                            setOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                            selected
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                              : "hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          <span className="truncate uppercase tracking-tight">{p.title}</span>
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </FloatingHeader>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT: Program / Daily Task / Tomorrow's Task / Community                 */
/* -------------------------------------------------------------------------- */
interface ProgramInfo {
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  communityLink: string | null;
}

function TaskRow({ task, onOpen }: { task: DailyTask; onOpen?: () => void }) {
  return (
    <li className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/5 flex items-start gap-3">
      {task.isDone ? (
        <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 mt-0.5 text-zinc-400 shrink-0" />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={`text-sm font-medium ${
            task.isDone ? "text-zinc-500 line-through" : "text-zinc-950 dark:text-white"
          }`}
        >
          {task.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{task.description}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            task.isDone
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {task.isDone ? "Done" : "Pending"}
        </span>
        {!task.isDone && onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="px-3 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition"
          >
            <span>Do it</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </li>
  );
}

export function MyPlanOverview({
  program,
  plan,
  onExplore,
  onOpenToday,
}: {
  program: ProgramInfo | null;
  plan: ProgramDailyPlan | null;
  onExplore: () => void;
  /** Opens today's day in the existing detail view, where tasks are saved through the backend. */
  onOpenToday: () => void;
}) {
  const exploreButton = (
    <button
      type="button"
      onClick={onExplore}
      className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 active:scale-95 transition"
    >
      <Compass className="w-3.5 h-3.5" />
      <span>Explore Plan</span>
    </button>
  );

  const todayTasks = plan?.today?.tasks ?? [];
  const doneCount = todayTasks.filter((t) => t.isDone).length;
  // Tomorrow's section only exists while tomorrow still has unfinished tasks.
  const tomorrowPending = (plan?.tomorrow?.tasks ?? []).filter((t) => !t.isDone);
  const community = safeHttpUrl(program?.communityLink);

  return (
    <div className="space-y-4 sm:space-y-5 font-mono">
      {/* SECTION 1 — PROGRAM */}
      <SectionCard title="Program">
        {program ? (
          <div className="space-y-3">
            <p className="text-lg sm:text-xl font-light uppercase tracking-tight text-zinc-950 dark:text-white">
              {program.title}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Start date</dt>
                <dd className="mt-1 font-semibold text-zinc-950 dark:text-white">
                  {formatDateWib(program.startDate)}
                </dd>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-500">End date</dt>
                <dd className="mt-1 font-semibold text-zinc-950 dark:text-white">
                  {formatDateWib(program.endDate)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyState
            title="No active program"
            description="You are not enrolled in an active program yet. Explore available plans to get started."
            action={exploreButton}
          />
        )}
      </SectionCard>

      {/* SECTION 2 — DAILY TASK */}
      <SectionCard
        title="Daily Task"
        right={
          todayTasks.length > 0 ? (
            <span className="text-[11px] font-semibold text-zinc-500">
              {doneCount}/{todayTasks.length} done
            </span>
          ) : undefined
        }
      >
        {!program ? (
          <EmptyState title="No tasks today" description="Join a program to receive daily tasks." />
        ) : todayTasks.length === 0 ? (
          <EmptyState
            title="No tasks scheduled for today"
            description="Your program has no tasks for today (it may not have started yet, or it has ended)."
          />
        ) : (
          <ul className="space-y-2.5">
            {todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpenToday} />
            ))}
          </ul>
        )}
      </SectionCard>

      {/* SECTION 3 — TOMORROW'S TASK (hidden when empty / all completed) */}
      {tomorrowPending.length > 0 && (
        <SectionCard title="Tomorrow's Task">
          <ul className="space-y-2.5">
            {tomorrowPending.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* SECTION 4 — COMMUNITY */}
      <SectionCard title="Community">
        {community ? (
          <a
            href={community}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/5 flex items-center justify-between gap-3 hover:border-zinc-400 dark:hover:border-white/30 transition"
          >
            <span className="flex items-center gap-3 min-w-0">
              <MessageCircle className="w-5 h-5 shrink-0 text-zinc-700 dark:text-zinc-300" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                  Join the community
                </span>
                <span className="block text-xs text-zinc-500 truncate">{program?.title}</span>
              </span>
            </span>
            <ExternalLink className="w-4 h-4 shrink-0 text-zinc-500" />
          </a>
        ) : (
          <EmptyState
            title="No community yet"
            description={
              program
                ? "A community channel has not been set up for this program yet."
                : "Community channels are available once you join a program."
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
