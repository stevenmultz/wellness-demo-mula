import { BrandLogo } from "./BrandLogo";

export function ZeraLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-zera-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-white text-zinc-950 select-none overflow-hidden"
    >
      <div className="relative z-10 flex items-center justify-center">
        <BrandLogo size="xl" tone="dark" />
      </div>
    </div>
  );
}

export default ZeraLogoLoading;
