export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-950 dark:text-white select-none transition-opacity"
    >
      <div className="flex items-center gap-1 animate-pulse">
        <span className="font-light text-lg leading-none">+</span>
        <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
      </div>
    </div>
  );
}

export default BmsLogoLoading;

