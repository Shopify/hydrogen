/** Shared record shape for observations saved in private run reports. */
export type EvidenceRecord = {
  kind: string;
  timestamp: number;
  data: Record<string, unknown>;
};

export type EvidenceSink = (record: EvidenceRecord) => void | Promise<void>;

/** Preserve report data, but do not dump SDK request/response properties from errors. */
export function serializeEvidence(value: unknown, indent?: number): string {
  return JSON.stringify(
    value,
    (_key, entry: unknown) =>
      entry instanceof Error ? { name: entry.name, message: entry.message } : entry,
    indent,
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error";
}
