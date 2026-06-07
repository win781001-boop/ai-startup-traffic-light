export interface Payment {
  id: string;
  status: "created" | "paid" | "failed" | "refunded";
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
  status:
    | "submitted"
    | "completed"
    | "rejected_invalid_idea"
    | "rejected_low_information"
    | "rejected_unsupported"
    | "failed_system_error";
  signal: "red" | "yellow" | "green" | null;
  hasSignal: boolean;
  aiRawResponse: string | null;
  errorReason: string | null;
  createdAt: string;
  completedAt: string | null;
}
