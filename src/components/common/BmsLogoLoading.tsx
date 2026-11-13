export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f6f6f4] dark:bg-[#09090b] text-zinc-950 dark:text-white select-none"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="font-light text-xl leading-none text-zinc-950 dark:text-white">+</span>
          <span className="font-geometric font-semibold text-sm tracking-[0.28em] uppercase text-zinc-950 dark:text-white">
            BMS
          </span>
        </div>

        <span
          aria-hidden="true"
          className="w-5 h-5 rounded-full border border-zinc-300 dark:border-white/15 border-t-zinc-950 dark:border-t-white animate-spin"
        />

        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
          Loading
        </span>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
