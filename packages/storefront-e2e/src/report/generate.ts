import { randomBytes } from "node:crypto";
import { lstat, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Redactor } from "../evidence.ts";
import { loadRuns, type LoadLimits } from "./load-runs.ts";
import type { ReportDocument } from "./view-model.ts";

export type ReportRenderer = (document: ReportDocument) => string;

/** Thrown for problems the user can fix: a missing input or an unsafe output. */
export class ReportInputError extends Error {}

/**
 * Builds the report document from saved artifacts under `inputRoot`, renders
 * it, and writes one HTML file. It reads artifacts only and never changes them.
 */
export async function generateReport(options: {
  inputRoot: string;
  outputFile: string;
  redactor: Redactor;
  render: ReportRenderer;
  now?: Date;
  limits?: Partial<LoadLimits>;
}): Promise<{ outputFile: string; document: ReportDocument }> {
  await assertDirectory(options.inputRoot);
  const outputFile = path.resolve(options.outputFile);
  await assertSafeOutput(outputFile);
  await mkdir(path.dirname(outputFile), { recursive: true });

  const loaded = await loadRuns({
    inputRoot: options.inputRoot,
    outputFile,
    redactor: options.redactor,
    ...(options.limits === undefined ? {} : { limits: options.limits }),
  });
  const document: ReportDocument = {
    generatedAt: (options.now ?? new Date()).toISOString(),
    runs: loaded.runs,
    warnings: loaded.warnings,
  };
  await writeAtomically(outputFile, options.render(document));
  return { outputFile, document };
}

async function assertDirectory(inputRoot: string): Promise<void> {
  try {
    if ((await stat(inputRoot)).isDirectory()) {
      return;
    }
  } catch {
    // Reported below.
  }
  throw new ReportInputError(
    `Input directory not found: ${inputRoot}. Run pnpm storefront-e2e first, or pass --input <artifact-root>.`,
  );
}

/**
 * The output must be an `.html` file. An existing output must be a regular
 * file, never a symlink, so the write cannot clobber another file.
 */
async function assertSafeOutput(outputFile: string): Promise<void> {
  if (path.extname(outputFile).toLowerCase() !== ".html") {
    throw new ReportInputError(`Output must be an .html file: ${outputFile}`);
  }
  try {
    const stats = await lstat(outputFile);
    if (!stats.isFile()) {
      throw new ReportInputError(
        `Output exists and is not a regular file (symlinks are refused): ${outputFile}`,
      );
    }
  } catch (error) {
    if (error instanceof ReportInputError) {
      throw error;
    }
  }
}

/** Writes a new temporary file, then renames it over the output. A rename replaces a symlink, it never follows one. */
async function writeAtomically(outputFile: string, html: string): Promise<void> {
  const temporary = path.join(
    path.dirname(outputFile),
    `.${path.basename(outputFile)}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeFile(temporary, html, { encoding: "utf8", flag: "wx" });
    await rename(temporary, outputFile);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
