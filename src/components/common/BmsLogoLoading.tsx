export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f3f2ed] dark:bg-[#09090b] text-zinc-950 dark:text-[#f4f3ef] select-none px-6"
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <span className="font-mono font-light text-lg leading-none">+</span>
            <span className="font-geometric font-semibold text-xs tracking-[0.34em] uppercase">
              BMS
            </span>
          </div>
          <span className="font-editorial italic text-2xl tracking-tight text-zinc-800 dark:text-zinc-200">
            Sanctuary Journal
          </span>
        </div>

        <div className="relative w-32 h-[1px] bg-zinc-900/15 dark:bg-white/15 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-zinc-950 dark:bg-[#f4f3ef] editorial-scan-line" />
        </div>

        <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
          Preparing Edition
        </span>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
