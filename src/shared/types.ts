export type GrantSearchQuery = {
  keyword?: string;
  region?: string;
  sort?: string;
  order?: "ASC" | "DESC";
  acceptance?: "0" | "1";
  openFrom?: string;
  openTo?: string;
};

export type GrantSummary = {
  id: string;
  title: string;
  organization: string;
  deadline?: string;
  region?: string;
};

export type GrantDetail = GrantSummary & {
  description?: string;
  eligibility?: string;
  subsidyRate?: string;
  contact?: string;
};

export type FavoriteGrant = {
  id: string;
  title: string;
  organization: string;
  savedAt: string;
};

export type RequestTraceContext = {
  requestId?: string;
};

export type LogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: unknown;
};
