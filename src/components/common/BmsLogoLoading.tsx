export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-[#0e0e0e] text-white select-none overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/image.webp"
        alt=""
        decoding="sync"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <div className="absolute inset-0 bg-black/[0.28] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-center">
        <div
          className="flex items-center gap-1.5"
          style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.45)" }}
        >
          <span className="font-light text-xl leading-none text-white">+</span>
          <span className="font-geometric font-semibold text-sm tracking-[0.28em] uppercase text-white">
            BMS
          </span>
        </div>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
