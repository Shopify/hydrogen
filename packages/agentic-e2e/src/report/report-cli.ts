import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { errorMessage } from "../evidence.ts";
import { generateReport, ReportInputError, type ReportRenderer } from "./generate.ts";
import { renderReport } from "./render.ts";

export const DEFAULT_INPUT_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "agentic-e2e-results",
);

export const REPORT_FILE = "index.html";

export const REPORT_USAGE = `Usage: pnpm agentic-e2e:report [options]

Builds one static HTML report from saved agentic-e2e runs. It reads
result.json, evidence.jsonl, and step-NNN.png files, and changes none of them.
It starts no browser, server, or model.

Options:
  --input <dir>     Artifact root to search for runs
                    (default: packages/agentic-e2e/agentic-e2e-results).
  --output <file>   HTML file to write (default: <input>/${REPORT_FILE}). Must end in .html.
                    An existing symlink or non-file at this path is refused.
  -h, --help        Show this help.

Relative paths resolve from the current directory, which is packages/agentic-e2e/
when run through pnpm scripts.

Exit codes: 0 report written, 1 report not written, 64 usage error.`;

const EXIT = { ok: 0, error: 1, usage: 64 } as const;

export type ReportCliParse =
  | { kind: "run"; inputRoot: string; outputFile: string }
  | { kind: "help" }
  | { kind: "error"; message: string };

export function parseReportArgs(argv: readonly string[], cwd: string): ReportCliParse {
  try {
    const { values, positionals } = parseArgs({
      args: argv[0] === "--" ? argv.slice(1) : [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        input: { type: "string" },
        output: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    if (values.help === true) {
      return { kind: "help" };
    }
    if (positionals.length > 0) {
      return { kind: "error", message: `Unexpected argument: ${positionals[0]}` };
    }
    const inputRoot =
      values.input === undefined ? DEFAULT_INPUT_ROOT : resolvePath(values.input, cwd, "--input");
    const outputFile =
      values.output === undefined
        ? path.join(inputRoot, REPORT_FILE)
        : resolvePath(values.output, cwd, "--output");
    return { kind: "run", inputRoot, outputFile };
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
}

function resolvePath(value: string, cwd: string, flag: string): string {
  if (value.trim() === "" || value.includes("\0")) {
    throw new Error(`${flag} must be a non-empty path.`);
  }
  return path.resolve(cwd, value);
}

export async function main(
  argv: readonly string[],
  io: {
    cwd?: string;
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
    render?: ReportRenderer;
  } = {},
): Promise<number> {
  const stdout = io.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = io.stderr ?? ((text: string) => process.stderr.write(text));
  const parsed = parseReportArgs(argv, io.cwd ?? process.cwd());
  if (parsed.kind === "help") {
    stdout(`${REPORT_USAGE}\n`);
    return EXIT.ok;
  }
  if (parsed.kind === "error") {
    stderr(`${parsed.message}\n\n${REPORT_USAGE}\n`);
    return EXIT.usage;
  }
  try {
    const { outputFile, document } = await generateReport({
      inputRoot: parsed.inputRoot,
      outputFile: parsed.outputFile,
      render: io.render ?? renderReport,
    });
    const latest = document.runs.filter((run) => run.latest).length;
    stdout(
      [
        `Report: ${outputFile}`,
        `Open: ${pathToFileURL(outputFile).href}`,
        `Runs: ${document.runs.length} (${latest} latest), warnings: ${document.warnings.length}`,
        "",
      ].join("\n"),
    );
    return EXIT.ok;
  } catch (error) {
    const prefix = error instanceof ReportInputError ? "" : "Report not written: ";
    stderr(`${prefix}${errorMessage(error)}\n`);
    return EXIT.error;
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = await main(process.argv.slice(2));
}
