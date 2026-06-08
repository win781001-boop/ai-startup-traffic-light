"use client";

import type { ReactNode } from "react";

// ─── Shared constants ───

export const STATUS_LABEL: Record<string, string> = {
  submitted: "已提交",
  completed: "已完成",
  rejected_invalid_idea: "非商業點子",
  rejected_low_information: "資訊不足",
  rejected_unsupported: "不支援的內容",
  failed_system_error: "系統錯誤",
  attempts_exhausted: "已達判定次數上限",
  needs_revision: "需補充內容",
};

export const lightConfig: Record<string, { label: string; dot: string; css: string; border: string }> = {
  red: { label: "紅燈", dot: "bg-red-light", css: "bg-red-light/15 text-red-light border-red-light/30 glow-red", border: "border-red-light/20" },
  yellow: { label: "黃燈", dot: "bg-yellow-light", css: "bg-yellow-light/15 text-yellow-light border-yellow-light/30 glow-yellow", border: "border-yellow-light/20" },
  green: { label: "綠燈", dot: "bg-green-light", css: "bg-green-light/15 text-green-light border-green-light/30 glow-green", border: "border-green-light/20" },
};

// ─── Helpers ───

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return Y + "/" + M + "/" + D + " " + h + ":" + m + ":" + s;
}

// ─── UI Components ───

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (<div className="rounded-xl border border-border-subtle bg-bg-card/60 p-5 backdrop-blur-sm"><h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">{title}</h3>{children}</div>);
}

export function Field({ label, hint, children }: { label: string; hint: ReactNode; children: ReactNode }) {
  return (<label className="block space-y-1.5"><span className="block text-sm font-medium text-white/80">{label}</span><span className="block text-xs text-white/30">{hint}</span>{children}</label>);
}

export function Spinner() {
  return (<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>);
}

// ─── Example data ───

export const EXAMPLE_TEXTS: Record<string, string> = {
  idea: "我想做一個給小型餐飲店使用的促銷文案產生網站，讓老闆輸入菜色、優惠內容、目標客群後，快速產生 Facebook、LINE、IG 可用的促銷文案。",
  targetUser: "主要是沒有行銷人員的小型餐飲店老闆，例如便當店、早餐店、飲料店、咖啡店。",
  problem: "很多小店老闆知道要做促銷，但不知道文案怎麼寫，也沒有時間每天想貼文內容，導致活動曝光很低。",
  pricing: "先用單次付費，一次產生 10 組促銷文案收 49 元。之後如果有人常用，再考慮月費方案。",
  firstVersion: "第一版只做一個簡單網頁，使用者填店名、商品、優惠內容、目標客群後，系統產生 10 組促銷文案，不先做會員、後台或複雜排程功能。",
  buildTime: "我預計 2 週內先做出可以使用的網頁版，先找 5 間熟識的小店試用，再看有沒有人願意付費。",
};
