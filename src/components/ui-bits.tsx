import { HeartPulse, Landmark, Scale } from "lucide-react";
import type { Domain } from "@/lib/engine/configs";
import { DOMAIN_IMAGES } from "@/lib/domain-images";

export function PhotoHeader({
  domain,
  height = "h-24",
  className,
}: {
  domain: Domain;
  height?: string;
  className?: string;
}) {
  const img = DOMAIN_IMAGES[domain];
  return (
    <div
      role="img"
      aria-label={img.alt}
      className={cx("relative w-full bg-cover bg-center", height, className)}
      style={{ backgroundImage: `url(${img.url})` }}
    >
      {/* slate-indigo duotone so photography sits inside the theme */}
      <div className="absolute inset-0 bg-indigo-950/25 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/35 to-transparent" />
    </div>
  );
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const GRADE_STYLE: Record<
  string,
  { text: string; bg: string; border: string; glow: string }
> = {
  A: {
    text: "text-mint",
    bg: "bg-mint/10",
    border: "border-mint/30",
    glow: "shadow-[0_8px_32px_rgba(16,185,129,0.16)]",
  },
  B: {
    text: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/30",
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.15)]",
  },
  C: {
    text: "text-rose",
    bg: "bg-rose/10",
    border: "border-rose/30",
    glow: "shadow-[0_8px_32px_rgba(239,68,68,0.14)]",
  },
};

export function gradeStyle(grade: string | null | undefined) {
  return GRADE_STYLE[grade ?? "C"] ?? GRADE_STYLE.C;
}

export function GradeBadge({
  grade,
  className,
}: {
  grade: string;
  className?: string;
}) {
  const s = gradeStyle(grade);
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-md border font-mono font-medium",
        s.text,
        s.bg,
        s.border,
        className ?? "h-5 w-5 text-[11px]",
      )}
    >
      {grade}
    </span>
  );
}

const DOMAIN_ICONS: Record<Domain, typeof HeartPulse> = {
  healthcare: HeartPulse,
  legal: Scale,
  finance: Landmark,
};

export function DomainTag({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const Icon = DOMAIN_ICONS[domain as Domain] ?? Landmark;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mut",
        className,
      )}
    >
      <Icon className="h-3 w-3 text-ind" />
      {domain}
    </span>
  );
}

export function DomainGlyph({ domain, className }: { domain: string; className?: string }) {
  const Icon = DOMAIN_ICONS[domain as Domain] ?? Landmark;
  return <Icon className={className ?? "h-4 w-4"} />;
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const score3 = (v: number) => v.toFixed(3);
export const fmtMs = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-ind">
      {children}
    </p>
  );
}
