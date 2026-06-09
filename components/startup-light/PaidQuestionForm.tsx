"use client";

import { Field, Spinner, EXAMPLE_TEXTS } from "./ui";

const MIN_LENGTH = 10;
const MAX_LENGTH = 100;

function isFieldValid(v: string): boolean {
  const t = v.trim();
  return t.length >= MIN_LENGTH && t.length <= MAX_LENGTH;
}

interface PaidQuestionFormProps {
  form: { idea: string; targetUser: string; problem: string; pricing: string; firstVersion: string; buildTime: string };
  onChange: (key: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  fullLoading: boolean;
  expandedExamples: Record<string, boolean>;
  onToggleExample: (key: string) => void;
}

const FIELDS = [
  { key: "idea", label: "你的點子是什麼？", hint: "簡短描述你的創業或副業點子" },
  { key: "targetUser", label: "目標使用者是誰？", hint: "描述你的目標族群" },
  { key: "problem", label: "它解決什麼問題？", hint: "描述這個點子想解決的核心問題" },
  { key: "pricing", label: "你想怎麼收費？", hint: "描述收費方式或商業模式" },
  { key: "firstVersion", label: "第一版你打算怎麼做？", hint: "描述第一版的範圍" },
  { key: "buildTime", label: "你預估多久能完成？", hint: "預估開發時間" },
];

export function PaidQuestionForm({ form, onChange, onSubmit, fullLoading, expandedExamples, onToggleExample }: PaidQuestionFormProps) {
  const renderHint = (hint: string, key: string) => {
    if (key === "idea" || key === "targetUser" || key === "problem") {
      return <>{hint} <button type="button" onClick={() => onToggleExample(key)} className="text-xs text-white/40 hover:text-white/60 transition cursor-pointer underline underline-offset-2">（範例）</button></>;
    }
    return hint;
  };

  const allValid = FIELDS.every(({ key }) => isFieldValid((form as Record<string, string>)[key]));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;
    onSubmit(e);
  }

  return (
    <section className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="mb-2 text-lg font-semibold text-white">完整判定</h2>
      <p className="mb-6 text-sm text-text-secondary">已帶入風險掃描的 3 題，請再補充 3 題，取得正式紅黃綠燈結果。</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(({ key, label, hint }) => {
          const val = (form as Record<string, string>)[key];
          const charLen = val.trim().length;
          const showLengthError = charLen > 0 && (charLen < MIN_LENGTH || charLen > MAX_LENGTH);
          return (
            <Field key={key} label={label} hint={renderHint(hint, key)}>
              <input
                type="text"
                value={val}
                onChange={(e) => onChange(key, e.target.value)}
                required
                maxLength={MAX_LENGTH}
                className={`w-full rounded-xl border ${showLengthError ? "border-red-light/50" : "border-white/10"} bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]`}
              />
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-white/30">請輸入 {MIN_LENGTH}～{MAX_LENGTH} 字</span>
                {charLen > 0 && (
                  <span className={`ml-auto text-xs ${showLengthError ? "text-red-light" : "text-white/30"}`}>
                    {charLen} / {MAX_LENGTH}
                  </span>
                )}
              </div>
              {showLengthError && (
                <p className="mt-1 text-xs text-red-light">每題請輸入 {MIN_LENGTH}～{MAX_LENGTH} 字。</p>
              )}
              {(key === "idea" || key === "targetUser" || key === "problem") && expandedExamples[key] && (
                <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60 leading-relaxed">
                  {EXAMPLE_TEXTS[key]}
                </div>
              )}
              {key !== "idea" && key !== "targetUser" && key !== "problem" && expandedExamples[key] && (
                <div className="mt-1.5">
                  <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60 leading-relaxed">
                    {EXAMPLE_TEXTS[key]}
                  </div>
                </div>
              )}
            </Field>
          );
        })}
        <button type="submit" disabled={fullLoading || !allValid} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
          {fullLoading ? <><Spinner />系統判定中，請勿關閉頁面</> : "送出完整判定"}
        </button>
      </form>
    </section>
  );
}
