import { clsx } from "clsx";

type BadgeTone = "neutral" | "good" | "warning";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        tone === "neutral" && "border-line bg-[#f4f3ee] text-muted",
        tone === "good" && "border-[#b7e4d3] bg-[#edfdf5] text-fall",
        tone === "warning" && "border-[#f6d2c8] bg-[#fff4ef] text-rise"
      )}
    >
      {children}
    </span>
  );
}
