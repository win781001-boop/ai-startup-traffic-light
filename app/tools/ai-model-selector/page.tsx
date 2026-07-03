﻿﻿﻿"use client";

import { useState, useCallback } from "react";
import { categories } from "./data";
import { recommendFromOptionIds } from "./rules";
import type { RecommendationResult } from "./rules";

type Screen = "intro" | "select" | "result";

export default function AiModelSelectorPage() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [expandedId, setExpandedId] = useState<string | null>("usage");
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [devNotice, setDevNotice] = useState<string | null>(null);

  const [submittedRecommendationResult, setSubmittedRecommendationResult] = useState<RecommendationResult | null>(null);

  const handleToggle = useCallback((categoryId: string, itemId: string) => {
    setSelections((prev) => {
      const current = prev[categoryId] ?? [];

      // Category 4 & 5: single-select per subgroup (radio behavior)
      if (categoryId === "budget" || categoryId === "current") {
        const cat = categories.find((c) => c.id === categoryId);
        const group = cat?.subGroups.find((g) =>
          g.items.some((i) => i.id === itemId)
        );
        if (group) {
          if (current.includes(itemId)) return prev;
          const groupIds = new Set(group.items.map((i) => i.id));
          const filtered = current.filter((id) => !groupIds.has(id));
          return { ...prev, [categoryId]: [...filtered, itemId] };
        }
      }

      // Categories 1-3: multi-select checkbox behavior
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
    setSubmittedRecommendationResult(null);
    setScreen("select");
  }, []);

  const handleStart = useCallback(() => {
    setScreen("select");
    setExpandedId("usage");
  }, []);

  const handleNextCategory1 = useCallback(() => {
    setExpandedId("how_use");
    setDevNotice(null);
  }, []);

  const handleNextCategory2 = useCallback(() => {
    setExpandedId("priority");
    setDevNotice(null);
  }, []);

  const handleNextCategory3 = useCallback(() => {
    setExpandedId("budget");
    setDevNotice(null);
  }, []);

  const handleNextCategory4 = useCallback(() => {
    setExpandedId("current");
    setDevNotice(null);
  }, []);

  const handleNextCategory5 = useCallback(() => {
    const flatIds = Object.values(selections).flat();
    const recommendationResult = recommendFromOptionIds(flatIds);
    setSubmittedRecommendationResult(recommendationResult);
    setScreen("result");
  }, [selections]);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-12 sm:px-6 sm:py-20">
      <div
        className={`mx-auto ${screen === "select" ? "max-w-2xl" : "max-w-xl"}`}
      >
        {screen === "intro" && <IntroScreen onStart={handleStart} />}
        {screen === "select" && (
          <div className="space-y-4">
            {categories.map((cat) => {
              if (cat.id === "usage" || cat.id === "how_use" || cat.id === "priority" || cat.id === "budget" || cat.id === "current") {
                return (
                  <CategorySelectScreen
                    key={cat.id}
                    category={cat}
                    isExpanded={expandedId === cat.id}
                    selectedItems={selections[cat.id] ?? []}
                    devNotice={devNotice}
                    hideSubGroupTitles={cat.id === "how_use"}
                    subgroupSingleSelect={cat.id === "budget" || cat.id === "current"}
                    onToggle={(itemId) => handleToggle(cat.id, itemId)}
                    onExpandToggle={() =>
                      handleExpandToggle(expandedId === cat.id ? null : cat.id)
                    }
                    onNext={
                      cat.id === "usage" ? handleNextCategory1 :
                      cat.id === "how_use" ? handleNextCategory2 :
                      cat.id === "priority" ? handleNextCategory3 :
                      cat.id === "budget" ? handleNextCategory4 :
                      handleNextCategory5
                    }
                  />
                );
              }
              return <SkeletonCategoryCard key={cat.id} title={cat.title} />;
            })}
          </div>
        )}
        {screen === "result" && submittedRecommendationResult && (
          <ResultScreen
            recommendationResult={submittedRecommendationResult}
            onRestart={handleRestart}
          />
        )}
      </div>
    </main>
  );
}

// ??? Intro Screen ???

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          第一次該先試哪一個 AI？
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          幫你從問題開始，找到適合你的 AI
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm leading-relaxed text-text-secondary sm:p-6">
        <p>
          ChatGPT、Claude、Gemini、Grok、DeepSeek——五個目前最常見的 AI，第一次到底該先試哪一個？
          這是一個簡單的引導工具，你不需要懂任何技術。回答幾個關於自己的問題，就能幫你找到最適合起步的 AI。
          不用比功能、不用看規格——只要照你實際想做的事來選，就是最快的方式。
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-sm leading-relaxed text-text-secondary sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-white">
          我可以如何開始使用 AI？
        </h2>
        <ul className="space-y-2.5">
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">?</span>
            <span>先想一個你真正想完成的任務，而不是先研究每個 AI 能做什麼</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">?</span>
            <span>從最簡單的任務開始，確認你對這個工具有基本感覺</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">?</span>
            <span>同一件事可以換不同工具試試看，觀察它們各自怎麼處理</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-green-light">?</span>
            <span>不必一次就找到最完美的答案，先開始用才是最重要的事</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <p className="mb-4 text-base text-text-secondary">
          準備好開始你的 AI 了嗎？
        </p>
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-xl bg-green-light px-8 py-3.5 text-base font-semibold text-bg-primary transition hover:bg-green-light/90 active:scale-[0.97]"
        >
          第 1 步：選出適合你的 AI
        </button>
      </div>
    </div>
  );
}

// ??? Category Select Screen ???

function CategorySelectScreen({
  category,
  isExpanded,
  selectedItems,
  devNotice,
  hideSubGroupTitles,
  subgroupSingleSelect,
  onToggle,
  onExpandToggle,
  onNext,
}: {
  category: (typeof categories)[number];
  isExpanded: boolean;
  selectedItems: string[];
  devNotice: string | null;
  hideSubGroupTitles?: boolean;
  subgroupSingleSelect?: boolean;
  onToggle: (itemId: string) => void;
  onExpandToggle: () => void;
  onNext: () => void;
}) {
  const selectedCount = selectedItems.length;
  const hasSelection = selectedCount > 0;
  let headerLabel = hasSelection ? `已選 ${selectedCount}` : "尚未選擇";
  let filledSubgroups = 0;
  if (subgroupSingleSelect) {
    filledSubgroups = category.subGroups.filter((g) =>
      g.items.some((i) => selectedItems.includes(i.id))
    ).length;
    headerLabel = `已選 ${filledSubgroups} / ${category.subGroups.length} 題`;
  }

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
              {headerLabel}
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
                  {!hideSubGroupTitles && (
                    <h3 className="mb-2 text-sm font-semibold text-white/85">
                      {group.title}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                    {group.items.map((item) => {
                      const isChecked = selectedItems.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-white/[0.04]"
                        >
                          <input
                            type={subgroupSingleSelect ? "radio" : "checkbox"}
                            checked={isChecked}
                            name={subgroupSingleSelect ? `${category.id}-${group.id}` : undefined}
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
                {/* Hint text ??always in DOM, invisible when not needed */}
                <span
                  className={`text-sm ${
                    hasSelection ? "invisible" : "text-yellow-light/70"
                  }`}
                >
                  {subgroupSingleSelect ? "每個小題請選一項" : "可複選"}
                </span>
                <button
                  onClick={onNext}
                  disabled={subgroupSingleSelect ? filledSubgroups < category.subGroups.length : !hasSelection}
                  className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
                    hasSelection
                      ? "bg-green-light text-bg-primary hover:bg-green-light/90 active:scale-[0.97]"
                      : "cursor-not-allowed bg-white/5 text-white/30"
                  }`}
                >
                  {category.id === "current" ? "查看結果" : "繼續"}
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

function SkeletonCategoryCard({ title }: { title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card/60 opacity-60">
      <div className="flex w-full items-center justify-between px-5 py-4 text-left">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-sm text-text-secondary">載入中…</span>
      </div>
    </div>
  );
}


// ??? Formatter functions for ResultScreen ???


// === Model card display data ===

interface ModelCardData {
  name: string;
  intro: string;
  suitableFor: string[];
  firstThingToTry: string;
  beforeYouStart: string;
}

const MODEL_CARDS: Record<string, ModelCardData> = {
  chatgpt: {
    name: "ChatGPT",
    intro: "適合把一件事慢慢聊清楚、反覆修改，從模糊想法一路整理成可以執行的內容。",
    suitableFor: [
      "把腦中的想法整理成計畫、文章或工作步驟",
      "針對同一件事反覆追問、修改、補細節",
      "請它陪你拆解問題，而不是只拿一次性答案",
    ],
    firstThingToTry: "把你現在最卡的一件事直接貼上來，例如：\n「我想開始做一個小副業，但不知道第一步要做什麼。」\n接著連續追問它三次，看看它能不能跟上你的脈絡。",
    beforeYouStart: "不要只丟一句很短的問題。把你的背景、目標和限制一起講清楚，通常會比一直換問題更有用。",
  },
  claude: {
    name: "Claude",
    intro: "適合想把內容講清楚、整理乾淨，並希望回覆風格比較穩定、保守的人。",
    suitableFor: [
      "協助整理長文字、草稿、說明文件",
      "把複雜內容改寫得更清楚、更有條理",
      "在你還沒想清楚時，陪你把問題拆成幾個步驟",
    ],
    firstThingToTry: "找一段你自己寫過、但覺得很亂的文字，直接問它：\n「請幫我保留原本意思，改成一般人看得懂的版本，並告訴我原文最容易讓人看不懂的地方。」",
    beforeYouStart: "它不是要替你直接做決定。把它當成幫你整理思路、檢查表達的助手，會比把所有判斷都交給它更適合。",
  },
  gemini: {
    name: "Gemini",
    intro: "適合想快速開始使用 AI，也可能會在搜尋、文件、圖片與日常工作之間切換的人。",
    suitableFor: [
      "快速整理資料、發想內容、處理日常問題",
      "生成圖片或把圖片需求轉成具體描述",
      "在文件、搜尋與工作任務之間來回使用 AI",
    ],
    firstThingToTry: "用一個你真的要做的圖片需求測試它，例如：\n「幫我做一張適合台灣小餐飲店使用的夏季活動社群圖，風格乾淨、不要太像廉價促銷海報。」\n不要只看圖片漂不漂亮，也看它能不能理解你的用途和限制。",
    beforeYouStart: "第一次不用急著追求完美答案。先用一個真實任務試三次，你會更快知道它適不適合你的工作方式。",
  },
  deepseek: {
    name: "DeepSeek",
    intro: "適合想先免費開始，主要拿 AI 做文字整理、文件處理與日常工作輔助的人。",
    suitableFor: [
      "整理文件、會議重點與待辦事項",
      "協助把零散內容變成摘要、表格或草稿",
      "在還不想付費前，先建立自己的 AI 使用習慣",
    ],
    firstThingToTry: "把一段會議紀錄、聊天紀錄或工作筆記貼上去，直接問：\n「請幫我整理成三部分：\n1. 已確認的事情\n2. 還沒決定的事情\n3. 下一步待辦事項。」\n這是最容易判斷它有沒有幫你省時間的方式。",
    beforeYouStart: "免費工具很適合起步，但不要一開始就把所有重要工作都壓在單一工具上。先確認它能不能穩定處理你最常見的任務。",
  },
  grok: {
    name: "Grok",
    intro: "適合有較寬鬆內容需求，或不希望一開始就被過多創作限制卡住的人。",
    suitableFor: [
      "發想尺度較大、風格較明確的創作內容",
      "嘗試一般工具較容易保守處理的題材",
      "用比較直接的方式討論靈感、角色、故事或情境",
    ],
    firstThingToTry: "不要先拿普通問題測它。直接拿你真正想做、但以前常被其他工具卡住的創作需求試一次。\n\n例如：\n「我想寫一個黑色幽默風格的成人向故事設定，請先幫我列出角色關係、衝突和故事開場。」",
    beforeYouStart: "內容尺度較寬，不代表每一種需求都適合直接照單全收。涉及真實人物、隱私、違法或傷害他人的內容，仍然要自己判斷界線。",
  },
};


// === Extract display model IDs ===

function getDisplayModelIds(result: RecommendationResult): string[] {
  if (result.resultState === "single_clear_choice" && result.primaryRecommendation) {
    return [result.primaryRecommendation];
  }
  if (result.resultState === "multiple_candidates" && result.strongCompareCandidates.length > 0) {
    return [...result.strongCompareCandidates.slice(0, 2)];
  }
  return [];
}


// === Model Result Card ===

function ModelResultCard({ cardData }: { cardData: ModelCardData }) {
  return (
    <div className="space-y-5 rounded-xl border border-border-subtle bg-bg-card/60 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-white">{cardData.name}</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {cardData.intro}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white/50">它大致適合你做什麼</h3>
        <ul className="space-y-2">
          {cardData.suitableFor.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-text-secondary">
              <span className="mt-0.5 shrink-0 text-green-light">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border-subtle bg-white/[0.03] p-4">
        <h3 className="mb-2 text-sm font-semibold text-white/50">第一件可以拿來試的事</h3>
        <div className="space-y-1.5 text-sm leading-relaxed text-text-secondary">
          {cardData.firstThingToTry.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-white/50">開始前先知道</h3>
        <p className="text-sm leading-relaxed text-text-secondary/80">
          {cardData.beforeYouStart}
        </p>
      </div>
    </div>
  );
}


// === Result Screen ===

function ResultScreen({
  recommendationResult,
  onRestart,
}: {
  recommendationResult: RecommendationResult;
  onRestart: () => void;
}) {
  const displayModelIds = getDisplayModelIds(recommendationResult);

  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold text-white">你的起步建議</h1>

      {displayModelIds.length === 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 text-center sm:p-6">
          <p className="text-sm leading-relaxed text-text-secondary">
            目前選項的資訊還不太夠形成具體建議，可以回頭補充更多需求後再試一次。
          </p>
        </div>
      )}

      {displayModelIds.length === 2 && (
        <p className="text-center text-sm text-text-secondary">
            這兩個方向都適合你先試，你可以用同一個真實任務各測一次。
        </p>
      )}

      {displayModelIds.map((id) => {
        const cardData = MODEL_CARDS[id];
        if (!cardData) return null;
        return <ModelResultCard key={id} cardData={cardData} />;
      })}

      <div className="pt-2 text-center">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-card/40 px-6 py-3 text-sm font-semibold text-text-secondary transition hover:border-white/20 hover:text-white"
        >
          重新開始
        </button>
      </div>
    </div>
  );
}


// === Reusable section wrapper ===

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