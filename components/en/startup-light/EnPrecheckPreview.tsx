"use client";

import { useState } from "react";
import { EnField, enExamples, enFieldLimits, isEnFieldValid } from "./EnUi";

const previewFields = [
  {
    key: "idea",
    label: "What are you trying to build?",
    hint: "Describe the online tool, system, website, app, or digital service in plain language.",
  },
  {
    key: "targetUser",
    label: "Who is it for?",
    hint: "Name a specific group of people. Avoid broad answers like everyone, creators, or small businesses.",
  },
  {
    key: "problem",
    label: "What problem are they struggling with?",
    hint: "Describe the inconvenience, time sink, decision risk, money risk, or repeated frustration.",
  },
] as const;

type PreviewKey = (typeof previewFields)[number]["key"];

const initialPreview: Record<PreviewKey, string> = {
  idea: "",
  targetUser: "",
  problem: "",
};

export function EnPrecheckPreview() {
  const [form, setForm] = useState(initialPreview);
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({});
  const allValid = previewFields.every(({ key }) => isEnFieldValid(form[key]));

  function updateField(key: PreviewKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleExample(key: PreviewKey) {
    setExpandedExamples((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section id="preview-check" className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-green-light/80">Preview check</p>
        <h2 className="mb-2 text-lg font-semibold text-white">Start with three questions.</h2>
        <p className="text-sm leading-relaxed text-text-secondary">
          This English preview lets you shape the same first step as the main product. It does not submit, charge,
          analyze, or save anything.
        </p>
      </div>

      <div className="space-y-4">
        {previewFields.map(({ key, label, hint }) => {
          const value = form[key];
          const charLen = value.trim().length;
          const showLengthError = charLen > 0 && !isEnFieldValid(value);

          return (
            <EnField
              key={key}
              label={label}
              hint={
                <>
                  {hint}{" "}
                  <button
                    type="button"
                    onClick={() => toggleExample(key)}
                    className="text-xs text-white/40 underline underline-offset-2 transition hover:text-white/60"
                  >
                    Example
                  </button>
                </>
              }
            >
              <input
                type="text"
                value={value}
                onChange={(event) => updateField(key, event.target.value)}
                maxLength={enFieldLimits.max}
                className={`w-full rounded-xl border ${showLengthError ? "border-red-light/50" : "border-white/10"} bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]`}
              />
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-white/30">
                  Enter {enFieldLimits.min}-{enFieldLimits.max} characters
                </span>
                {charLen > 0 && (
                  <span className={`ml-auto text-xs ${showLengthError ? "text-red-light" : "text-white/30"}`}>
                    {charLen} / {enFieldLimits.max}
                  </span>
                )}
              </div>
              {showLengthError && (
                <p className="mt-1 text-xs text-red-light">
                  Please keep this answer between {enFieldLimits.min} and {enFieldLimits.max} characters.
                </p>
              )}
              {expandedExamples[key] && (
                <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-white/60">
                  {enExamples[key]}
                </div>
              )}
            </EnField>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-green-light/20 bg-green-light/[0.04] px-4 py-3">
        <p className="text-sm font-medium text-green-light">
          {allValid ? "Preview ready. The English analysis flow is not connected yet." : "Fill the three preview fields to see the draft state."}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-green-light/70">
          Your answers stay on this page. This preview does not send or save them.
        </p>
      </div>

      <button
        type="button"
        disabled
        className="mt-4 flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] opacity-50"
      >
        Preview only — full English check coming soon
      </button>
    </section>
  );
}
