export function BmsLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-bms-loading="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white select-none transition-opacity overflow-hidden"
    >
      {/* Background Image with elegant dark cinematic overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/image.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/75 pointer-events-none" />

      {/* Floating Centered Brand Pill */}
      <div className="relative z-10 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-2xl animate-pulse">
        <span className="font-light text-lg leading-none text-white">+</span>
        <span className="font-geometric font-semibold text-xs tracking-[0.25em] uppercase text-white">
          BMS
        </span>
      </div>
    </div>
  );
}

export default BmsLogoLoading;
