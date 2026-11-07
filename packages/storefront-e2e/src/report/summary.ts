import type { Redactor } from "../evidence.ts";
import type { RunResult } from "../result.ts";

/** Terminal summary. Every line goes through the redactor. */
export function formatSummary(result: RunResult, redactor: Redactor): string {
  const lines = [
    `Storefront E2E: ${result.scenario} -> ${result.verdict.toUpperCase()}`,
    `Reason: ${result.reason}${result.errorKind === undefined ? "" : ` [${result.errorKind}]`}`,
    `Target: ${result.target.storefrontUrl} (API ${result.target.apiOrigin}, ${result.target.apiVersion})`,
  ];
  if (result.metadata.buyer !== undefined) {
    lines.push(`Buyer model: ${result.metadata.buyer.model}`);
  }
  if (result.startUrl !== undefined) {
    lines.push(`Start page: ${result.startUrl}`);
  }
  if (result.pinned !== undefined) {
    lines.push(`Pinned: ${redactor.serialize(result.pinned)}`);
  }
  for (const checkpoint of result.checkpoints) {
    lines.push(
      `Checkpoint ${checkpoint.name}: ${checkpoint.verdict} (buyer: ${checkpoint.buyer.reason}) - ${checkpoint.reason}`,
    );
  }
  for (const warning of result.warnings) {
    lines.push(`Warning: ${warning}`);
  }
  lines.push(`Artifacts: ${result.artifacts.directory}`);
  return lines.map((line) => redactor.text(line)).join("\n");
}
