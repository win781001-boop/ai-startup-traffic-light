// ─── Quadrant Classification Rules v0.18 ───
// Maps "demand strength x execution concern" to traffic light results.

export type DemandLevel = "high" | "low";
export type ConcernLevel = "high" | "low";

export type QuadrantKey =
  | "high-demand_low-concern"
  | "high-demand_high-concern"
  | "low-demand_low-concern"
  | "low-demand_high-concern";

export type TrafficLight = "green" | "yellow" | "red";

interface QuadrantInfo {
  light: TrafficLight;
  label: string;
  summary: string;
}

const QUADRANT_MAP: Record<QuadrantKey, QuadrantInfo> = {
  "high-demand_low-concern": {
    light: "green",
    label: "高需求 × 低疑慮",
    summary: "需求跡象較明確，初期執行疑慮相對低。",
  },
  "high-demand_high-concern": {
    light: "yellow",
    label: "高需求 × 高疑慮",
    summary: "可能有需求，但執行、信任、交付或競爭疑慮較高。",
  },
  "low-demand_low-concern": {
    light: "yellow",
    label: "低需求 × 低疑慮",
    summary: "執行疑慮不高，但需求強度不明顯。",
  },
  "low-demand_high-concern": {
    light: "red",
    label: "低需求 × 高疑慮",
    summary: "需求跡象偏弱，同時執行疑慮較高。",
  },
};

function toKey(demand: DemandLevel, concern: ConcernLevel): QuadrantKey {
  return `${demand}-demand_${concern}-concern` as QuadrantKey;
}

export function getTrafficLightFromQuadrant(
  demand: DemandLevel,
  concern: ConcernLevel
): TrafficLight {
  return QUADRANT_MAP[toKey(demand, concern)].light;
}

export function getQuadrantLabel(
  demand: DemandLevel,
  concern: ConcernLevel
): string {
  return QUADRANT_MAP[toKey(demand, concern)].label;
}

export function getQuadrantSummary(
  demand: DemandLevel,
  concern: ConcernLevel
): string {
  return QUADRANT_MAP[toKey(demand, concern)].summary;
}

export function classifyQuadrant(
  demand: DemandLevel,
  concern: ConcernLevel
): { key: QuadrantKey; light: TrafficLight; label: string; summary: string } {
  const info = QUADRANT_MAP[toKey(demand, concern)];
  return { key: toKey(demand, concern), ...info };
}

