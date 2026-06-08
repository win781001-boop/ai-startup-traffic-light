"use client";

import { Field, Spinner, EXAMPLE_TEXTS } from "./ui";

interface PaidQuestionFormProps {
  form: { idea: string; targetUser: string; problem: string; pricing: string; firstVersion: string; buildTime: string };
  onChange: (key: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  fullLoading: boolean;
  expandedExamples: Record<string, boolean>;
  onToggleExample: (key: string) => void;
}

const FIELDS = [
  { key: "idea", label: "你的點子是什麼？", hint: "簡短描述你的創業或副業點子", maxLen: 300 },
  { key: "targetUser", label: "目標使用者是誰？", hint: "描述你的目標族群", maxLen: 300 },
  { key: "problem", label: "它解決什麼問題？", hint: "描述這個點子想解決的核心問題", maxLen: 300 },
  { key: "pricing", label: "你想怎麼收費？", hint: "描述收費方式或商業模式", maxLen: 400 },
  { key: "firstVersion", label: "第一版你打算怎麼做？", hint: "描述第一版的範圍", maxLen: 400 },
  { key: "buildTime", label: "你預估多久能完成？", hint: "預估開發時間", maxLen: 400 },
];

export function PaidQuestionForm({ form, onChange, onSubmit, fullLoading, expandedExamples, onToggleExample }: PaidQuestionFormProps) {
  const renderHint = (hint: string, key: string) => {
    if (key === "idea" || key === "targetUser" || key === "problem") {
      return <>{hint} <button type="button" onClick={() => onToggleExample(key)} className="text-xs text-white/40 hover:text-white/60 transition cursor-pointer underline underline-offset-2">（範例）</button></>;
    }
    return hint;
  };

  return (
    <section className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="mb-2 text-lg font-semibold text-white">完整判定</h2>
      <p className="mb-6 text-sm text-text-secondary">已帶入風險掃描的 3 題，請再補充 3 題，取得正式紅黃綠燈結果。</p>
      <form onSubmit={onSubmit} className="space-y-4">
        {FIELDS.map(({ key, label, hint, maxLen }) => (
          <Field key={key} label={label} hint={renderHint(hint, key)}>
            <input type="text" value={(form as Record<string, string>)[key]} onChange={(e) => onChange(key, e.target.value)} required maxLength={maxLen} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07]" />
            {key !== "idea" && key !== "targetUser" && key !== "problem" && expandedExamples[key] && (
              <div className="mt-1.5">
                <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60 leading-relaxed">
                  {EXAMPLE_TEXTS[key]}
                </div>
              </div>
            )}
            {(key === "idea" || key === "targetUser" || key === "problem") && expandedExamples[key] && (
              <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60 leading-relaxed">
                {EXAMPLE_TEXTS[key]}
              </div>
            )}
          </Field>
        ))}
        <button type="submit" disabled={fullLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
          {fullLoading ? <><Spinner />系統判定中，請勿關閉頁面</> : "送出完整判定"}
        </button>
      </form>
    </section>
  );
}
