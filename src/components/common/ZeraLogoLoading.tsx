import { ZeraSplashWordmark } from "./ZeraSplashWordmark";

export function ZeraLogoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-zera-loading="true"
      className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-white text-zinc-950 select-none overflow-hidden"
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ZeraSplashWordmark />
        <span className="sr-only">zera.id</span>
      </div>
    </div>
  );
}

export default ZeraLogoLoading;
