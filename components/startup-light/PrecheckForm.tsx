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
      <p className="mb-2 text-sm text-text-secondary">{isBeta ? "先用 3 題整理你的線上工具點子。通過後再補充 3 題，系統會依需求強弱與執行疑慮給出紅黃綠檢查結果。" : "先用 3 題整理你的 AI 點子。付款後再補充 3 題，系統會依需求強弱與執行疑慮給出紅黃綠檢查結果。"}</p>
      <p className="mb-6 text-xs text-yellow-light/70 bg-yellow-light/[0.04] rounded-lg px-4 py-2.5 leading-relaxed">這份檢查表是為「線上工具、系統或數位服務」設計的，不適合實體開店、純批貨或一般商品買賣。</p>

      {(["idea", "targetUser", "problem"] as const).map((key) => {
        const labels: Record<string, { label: string; hint: string; placeholder: string }> = {
          idea: { label: "你想做的線上工具、系統或服務是什麼？", hint: "請用白話說明它是網站、表單、報告、查詢工具、媒合服務，或其他線上服務。", placeholder: "" },
          targetUser: { label: "最可能會使用或付費的人是誰？", hint: "請描述一群具體的人，不要只寫「大家」或「上班族」。", placeholder: "" },
          problem: { label: "這些人現在遇到什麼麻煩，才會需要這個工具或服務？", hint: "請寫出他們現在的不方便、痛點、浪費時間、判斷困難或花錢風險。", placeholder: "" },
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
