import { BrandLogo } from "./BrandLogo";

export function ZeraLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-zera-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex flex-col items-center justify-center bg-white text-zinc-950 select-none overflow-hidden"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        color: "#09090b",
      }}
    >
      <div className="relative z-10 flex items-center justify-center">
        <BrandLogo
          size="xl"
          tone="dark"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: "28px",
            lineHeight: 1,
            color: "#09090b",
          }}
        />
      </div>
    </div>
  );
}

export default ZeraLogoLoading;
