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
  { key: "idea", label: "你想做的線上工具、系統或服務是什麼？", hint: "請用白話說明它是網站、表單、報告、查詢工具、媒合服務，或其他線上服務。" },
  { key: "targetUser", label: "最可能會使用或付費的人是誰？", hint: "請描述一群具體的人，不要只寫「大家」或「上班族」。" },
  { key: "problem", label: "這些人現在遇到什麼麻煩，才會需要這個工具或服務？", hint: "請寫出他們現在的不方便、痛點、浪費時間、判斷困難或花錢風險。" },
  { key: "pricing", label: "你打算怎麼收費？大約收多少錢？", hint: "請寫出可能的收費方式和金額，例如單次 49 元、月費 199 元、抽成 10%，或先免費測試再收費。" },
  { key: "firstVersion", label: "你打算先做出哪些功能，就拿去給人測試？", hint: "請說明第一版會提供哪些功能，哪些功能先不做，避免一開始做太大。" },
  { key: "buildTime", label: "你預計多久能做出可測試版本？打算先找誰試用？", hint: "請估計時間，並說明你會先找朋友、社群、客戶或特定族群測試。" },
];

export function PaidQuestionForm({ form, onChange, onSubmit, fullLoading, expandedExamples, onToggleExample }: PaidQuestionFormProps) {
  const renderHint = (hint: string, key: string) => {
    if (key === "idea" || key === "targetUser" || key === "problem" || key === "pricing" || key === "firstVersion" || key === "buildTime") {
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
      <p className="mb-2 text-sm text-text-secondary">已帶入前 3 題，請再補充 3 題，依需求強弱與執行疑慮給出紅黃綠檢查結果。</p>
      <p className="mb-6 text-xs text-yellow-light/70 bg-yellow-light/[0.04] rounded-lg px-4 py-2.5 leading-relaxed">這份檢查表是為「線上工具、系統或數位服務」設計的，不適合實體開店、純批貨或一般商品買賣。</p>
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
          {fullLoading ? <><Spinner />系統正在判定中，請稍候。</> : "送出完整判定"}
        </button>
      </form>
    </section>
  );
}
