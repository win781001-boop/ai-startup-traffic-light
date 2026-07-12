import type { ReactNode } from "react";

export const enFieldLimits = {
  min: 10,
  max: 100,
} as const;

export const enExamples: Record<string, string> = {
  idea: "A simple web app that turns a solo consultant's messy notes into a polished client recap and follow-up task list.",
  targetUser: "Independent consultants and fractional operators who manage several client calls each week.",
  problem: "They lose time rewriting notes after calls and often delay follow-up because the next steps are scattered.",
};

export function EnSectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-light/90">
      {children}
    </p>
  );
}

export function EnField({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint: ReactNode;
  children: ReactNode;
}>) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-white/85">{label}</span>
      <span className="block text-xs leading-relaxed text-white/35">{hint}</span>
      {children}
    </label>
  );
}

export function isEnFieldValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= enFieldLimits.min && trimmed.length <= enFieldLimits.max;
}
