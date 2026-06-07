export interface Payment {
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
    | "rejected_invalid_idea"
    | "rejected_low_information"
    | "rejected_unsupported"
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



