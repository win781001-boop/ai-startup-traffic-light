export interface Payment {
  /**
   * Payment lifecycle status.
   *
   * Currently used in mock phase: `pending` → `paid`.
   * `failed` and `expired` are reserved for real payment provider integration (not yet implemented).
   * `refunded` may be added later for customer service workflows.
   */
  id: string;
  status: "pending" | "paid" | "failed" | "expired";
  used: boolean;
  usedAt: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface Analysis {
  id: string;
  paymentId: string;
  inputs: {
    idea: string;
    targetUser: string;
    problem: string;
    pricing: string;
    firstVersion: string;
    buildTime: string;
  };
  used: boolean;
  status:
    | "pending"
    | "submitted"
    | "completed"
    | "needs_revision"
    | "failed_system_error" | "attempts_exhausted";
  signal: "red" | "yellow" | "green" | null;
  hasSignal: boolean;
  aiRawResponse: string | null;
  errorReason: string | null;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  completedAt: string | null;
}
export interface Feedback {
  id: string;
  analysisId: string;
  paymentId: string;
  value: "準" | "普通" | "不準";
  createdAt: string;
}
