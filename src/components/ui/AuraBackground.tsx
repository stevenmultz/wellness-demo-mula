"use client";

export function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#F4F6F9] dark:bg-[#0B0D10]">
      <div
        className="hidden dark:block absolute inset-x-0 top-0 h-[520px] opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(137, 150, 165, 0.09), transparent 70%)",
        }}
      />
    </div>
  );
}
