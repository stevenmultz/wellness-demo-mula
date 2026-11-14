export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-[#0B0D10] text-[#E8ECF1] select-none overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/image.webp"
        alt=""
        decoding="sync"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      <div className="absolute inset-0 bg-[#0B0D10]/40 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-center">
        <div
          className="flex items-center gap-1.5"
          style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.55)" }}
        >
          <span className="font-light text-xl leading-none text-[#E8ECF1]">+</span>
          <span className="font-geometric font-semibold text-sm tracking-[0.28em] uppercase text-[#E8ECF1]">
            BMS
          </span>
        </div>
      </div>

      <div
        style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
        className="absolute left-1/2 -translate-x-1/2 z-10 w-[min(180px,46vw)]"
      >
        <div className="w-full h-[2px] rounded-full bg-[#C7D0DA]/30 overflow-hidden">
          <div className="w-[40%] h-full rounded-full bg-[#E8ECF1] animate-[bmsLoadingSlide_1.3s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
