import { ZeraSplashWordmark } from "./ZeraSplashWordmark";

export function ZeraLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-zera-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-[#f6f6f4] text-zinc-950 select-none overflow-hidden"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6f6f4",
        color: "#09090b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ZeraSplashWordmark />
      </div>
    </div>
  );
}

export default ZeraLogoLoading;
