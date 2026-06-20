"use client";

import { useState, useCallback } from "react";
import {
  categories,
  modelInfo,
  calculateResult,
  generateSummary,
} from "./data";
import type { ModelId } from "./data";

type Screen = "intro" | "select" | "result";

export default function AiModelSelectorPage() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [expandedId, setExpandedId] = useState<string | null>("usage");
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [devNotice, setDevNotice] = useState<string | null>(null);

  // Preserved for backward compat with existing ResultScreen
  const [answers] = useState<Record<string, string>>({});

  const result = screen === "result" ? calculateResult(answers) : null;

  const handleToggle = useCallback((categoryId: string, itemId: string) => {
    setSelections((prev) => {
      const current = prev[categoryId] ?? [];
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, [categoryId]: next };
    });
    setDevNotice(null);
  }, []);

  const handleExpandToggle = useCallback((id: string | null) => {
    setExpandedId(id);
    setDevNotice(null);
  }, []);

  const handleRestart = useCallback(() => {
    setSelections({});
    setExpandedId("usage");
    setDevNotice(null);
    setScreen("select");
  }, []);

  const handleStart = useCallback(() => {
    setScreen("select");
    setExpandedId("usage");
  }, []);

  const handleDevAction = useCallback((label: string) => {
    setDevNotice(`「${label}」將在後續階段加入`);
  }, []);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-12 sm:px-6 sm:py-20">
      <div
        className={`mx-auto ${screen === "select" ? "max-w-2xl" : "max-w-xl"}`}
      >
        {screen === "intro" && <IntroScreen onStart={handleStart} />}
        {screen === "select" && (
          <CategorySelectScreen
            category={categories[0]}
            isExpanded={expandedId === categories[0].id}
            selectedItems={selections[categories[0].id] ?? []}
            devNotice={devNotice}
            onToggle={(itemId) => handleToggle(categories[0].id, itemId)}
            onExpandToggle={() =>
              handleExpandToggle(expandedId === categories[0].id ? null : categories[0].id)
            }
            onDevAction={handleDevAction}
          />
        )}
        {screen === "result" && result && (
          <ResultScreen
            first={result.first}
            second={result.second}
            answers={answers}
            onRestart={handleRestart}
          />
        )}
      </div>
    </main>
  );
}

// ─── Intro Screen ───

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          第一次選擇 AI 就上手
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          你知道你適合的 AI 大模型嗎？
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm leading-relaxed text-text-secondary sm:p-6">
        <p>
          ChatGPT、Claude、Gemini、Grok、DeepSeek 都各有適合的情境；
          不是每個看起來厲害的 AI 都適合每個人。
          選對第一個主力工具，可以少花冤枉訂閱費，也能更快開始把 AI 用在真正需要的工作上。
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm leading-relaxed text-text-secondary sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-white">
          為什麼要挑選適合的 AI？
        </h2>
        <ul className="space-y-2.5">
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">✓</span>
            <span>選錯不代表模型不好，而是可能不符合你實際的使用需求</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">✓</span>
            <span>不需要一開始訂閱很多工具，先從一個主力開始</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">✓</span>
            <span>先用一個主力 AI，用到遇見明確需求時再補第二個工具</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">✓</span>
            <span>這個工具不比誰最強，而是幫你找目前最適合的第一個主力 AI</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <p className="mb-4 text-base text-text-secondary">
          來看看你適合什麼 AI 大模型吧
        </p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-xl bg-green-light px-8 py-3.5 text-base font-semibold text-bg-primary transition hover:bg-green-light/90 active:scale-[0.97]"
        >
          用 1 分鐘找出我的主力 AI
        </button>
      </div>
    </div>
  );
}

// ─── Category Select Screen ───

function CategorySelectScreen({
  category,
  isExpanded,
  selectedItems,
  devNotice,
  onToggle,
  onExpandToggle,
  onDevAction,
}: {
  category: (typeof categories)[number];
  isExpanded: boolean;
  selectedItems: string[];
  devNotice: string | null;
  onToggle: (itemId: string) => void;
  onExpandToggle: () => void;
  onDevAction: (label: string) => void;
}) {
  const selectedCount = selectedItems.length;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card/60">
        {/* Header */}
        <button
          onClick={onExpandToggle}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.03]"
        >
          <h2 className="text-lg font-semibold text-white">{category.title}</h2>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-sm text-text-secondary">
              {hasSelection ? `已選 ${selectedCount}` : "尚未選擇"}
            </span>
            <svg
              className={`h-4 w-4 text-white/40 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </button>

        {/* Body */}
        {isExpanded && (
          <div className="border-t border-border-subtle px-5 pb-5 pt-4">
            <div className="space-y-5">
              {category.subGroups.map((group) => (
                <div key={group.id}>
                  <h3 className="mb-2 text-sm font-semibold text-white/85">
                    {group.title}
                  </h3>
                  <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                    {group.items.map((item) => {
                      const isChecked = selectedItems.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-white/[0.04]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggle(item.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-green-light"
                          />
                          <span className="text-sm leading-snug text-text-secondary">
                            {item.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom action row */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                {/* Hint text — always in DOM, invisible when not needed */}
                <span
                  className={`text-sm ${
                    hasSelection ? "invisible" : "text-yellow-light/70"
                  }`}
                >
                  請至少選擇一項
                </span>
                <button
                  onClick={() => onDevAction("下一類")}
                  disabled={!hasSelection}
                  className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
                    hasSelection
                      ? "bg-green-light text-bg-primary hover:bg-green-light/90 active:scale-[0.97]"
                      : "cursor-not-allowed bg-white/5 text-white/30"
                  }`}
                >
                  下一類
                </button>
              </div>

              {devNotice && (
                <p className="text-center text-sm text-yellow-light/70">
                  {devNotice}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Screen ───

function ResultScreen({
  first,
  second,
  answers,
  onRestart,
}: {
  first: ModelId;
  second: ModelId;
  answers: Record<string, string>;
  onRestart: () => void;
}) {
  const m1 = modelInfo[first];
  const m2 = modelInfo[second];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-light/20 bg-green-light/[0.04] p-6 text-center sm:p-8">
        <p className="mb-1 text-sm font-medium uppercase tracking-wider text-green-light">
          推薦結果
        </p>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          你的主力 AI 建議：{m1.name}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{m1.tagline}</p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm leading-relaxed text-text-secondary sm:p-6">
        <p>{generateSummary(answers, first)}</p>
      </div>

      <Section title="為什麼推薦你使用它">
        <ul className="space-y-2.5">
          {m1.whyRecommend.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-text-secondary">
              <span className="mt-0.5 shrink-0 text-blue-light">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="最適合先拿來做什麼">
        <ul className="space-y-2">
          {m1.useCases.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-secondary"
            >
              <span className="shrink-0 text-green-light">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="第二推薦">
        <div className="rounded-lg border border-border-subtle bg-white/[0.03] px-4 py-3.5">
          <p className="mb-1 text-base font-semibold text-white">{m2.name}</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            {m2.altContext}
          </p>
        </div>
      </Section>

      <Section title="目前不一定需要急著訂閱">
        <div className="rounded-lg bg-white/[0.03] px-4 py-3.5">
          <p className="text-sm leading-relaxed text-text-secondary">
            你目前不需要一開始同時訂閱多個高階 AI 服務。
            先把一個主力工具用熟，等出現高頻長文件、程式或 Google 工作流需求時，
            再補第二個工具通常更划算。
          </p>
        </div>
      </Section>

      <div className="pt-2 text-center">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-card/40 px-6 py-3 text-sm font-semibold text-text-secondary transition hover:border-white/20 hover:text-white"
        >
          ← 重新選擇
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ───

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 sm:p-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
        {title}
      </h3>
      {children}
    </div>
  );
}
