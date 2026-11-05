/**
 * Public data contract between the report generator (load/generate) and the
 * HTML renderer (render.ts). Strings retain saved report data. All hrefs are
 * validated, relative to the output HTML file, and percent-encoded per path
 * segment. The renderer must still HTML-escape every string.
 */

export type ReportVerdict = "pass" | "fail" | "indeterminate" | "skipped";

export type ReportDocument = {
  generatedAt: string;
  runs: ReportRun[];
  warnings: string[];
};

export type ReportRun = {
  id: string;
  storeName: string;
  storefrontUrl: string;
  scenario: string;
  verdict: ReportVerdict;
  reason: string;
  startedAt: string;
  durationMs: number;
  model?: string;
  /** `configured`: set by `--country` and `--language`, not read from the page (newer runs). */
  context: { country?: string; language?: string; mismatch?: string; configured?: true };
  pinned?: {
    productTitle: string;
    variantTitle: string;
    variantId?: string;
    selectedOptions: Array<{ name: string; value: string }>;
  };
  objective?: string;
  buyerSummary?: string;
  timeline: ReportEvent[];
  screenshots: ReportScreenshot[];
  checkpoints: ReportCheckpoint[];
  warnings: string[];
  resultHref: string;
  evidenceHref?: string;
  /** True for the newest run per storefrontUrl + scenario. Totals use only these. */
  latest: boolean;
};

export type ReportEvent = {
  id: string;
  timestamp: number;
  kind: string;
  title: string;
  summary?: string;
  data: Record<string, unknown>;
  screenshotHref?: string;
  step?: number;
};

export type ReportScreenshot = {
  step: number;
  href: string;
  summary: string;
  timestamp: number;
};

export type ReportCheckpoint = {
  name: string;
  verdict: string;
  reason: string;
  objective: string;
  buyer?: { completed: boolean; reason: string; summary: string };
  details?: Record<string, unknown>;
};
