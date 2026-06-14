"use client";

import { Field, Spinner, EXAMPLE_TEXTS } from "./ui";
import { FIRST_REPORT_PRICE_TWD } from "@/lib/pricing";

const MIN_LENGTH = 10;
const MAX_LENGTH = 100;

function isFieldValid(v: string): boolean {
  const t = v.trim();
  return t.length >= MIN_LENGTH && t.length <= MAX_LENGTH;
}

interface PrecheckFormProps {
  idea: string;
  targetUser: string;
  problem: string;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  expandedExamples: Record<string, boolean>;
  onToggleExample: (key: string) => void;
  /** When true, show beta-friendly copy with no payment mentions. */
  isBeta?: boolean;
}

export function PrecheckForm({ idea, targetUser, problem, onChange, onNext, expandedExamples, onToggleExample, isBeta = false }: PrecheckFormProps) {
  const fields = { idea, targetUser, problem };
  const allValid = isFieldValid(idea) && isFieldValid(targetUser) && isFieldValid(problem);
  const btnDisabled = !allValid;

  return (
    <section className="mb-8 rounded-2xl border border-border-subtle bg-bg-card/80 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="mb-2 text-lg font-semibold text-white">{isBeta ? "先填 3 題，確認要檢查的點子" : "先填 3 題，確認要判定的點子"}</h2>
      <p className="mb-6 text-sm text-text-secondary">{isBeta ? "先用 3 題整理你的點子。通過後再補充 3 題，系統會依需求強弱與執行疑慮給出紅黃綠檢查結果。" : "先用 3 題整理你的 AI 點子。付款後再補充 3 題，系統會依需求強弱與執行疑慮給出紅黃綠檢查結果。"}</p>

      {(["idea", "targetUser", "problem"] as const).map((key) => {
        const labels: Record<string, { label: string; hint: string; placeholder: string }> = {
          idea: { label: "你的點子是什麼？", hint: "簡短描述你的創業或副業點子", placeholder: "例如：AI 食譜產生器" },
          targetUser: { label: "目標使用者是誰？", hint: "描述你的目標族群", placeholder: "例如：每天煮飯的家庭主婦" },
          problem: { label: "它解決什麼問題？", hint: "描述這個點子想解決的核心問題", placeholder: "例如：不知道每天要煮什麼" },
        };
        const { label, hint, placeholder } = labels[key];
        const val = fields[key];
        const charLen = val.trim().length;
        const showLengthError = charLen > 0 && (charLen < MIN_LENGTH || charLen > MAX_LENGTH);
        return (
          <Field key={key} label={label} hint={<>{hint} <button type="button" onClick={() => onToggleExample(key)} className="text-xs text-white/40 hover:text-white/60 transition cursor-pointer underline underline-offset-2">（範例）</button></>}>
            <input
              type="text"
              value={val}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
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
            {expandedExamples[key] && (
              <div className="mt-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60 leading-relaxed">
                {EXAMPLE_TEXTS[key]}
              </div>
            )}
          </Field>
        );
      })}

      <button type="button" onClick={onNext} disabled={btnDisabled} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f0f14] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
        {isBeta ? "下一步：免費開始檢查" : "下一步：付費 49 元開始檢查"}
      </button>
    </section>
  );
}
