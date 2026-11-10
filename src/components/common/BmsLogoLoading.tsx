export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-950 dark:text-white select-none transition-opacity"
    >
      <div className="flex items-center gap-1.5 animate-pulse">
        <span className="font-light text-2xl sm:text-3xl leading-none text-zinc-400 dark:text-zinc-500">+</span>
        <span className="font-geometric font-semibold text-xl sm:text-2xl tracking-[0.28em] uppercase">BMS</span>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
