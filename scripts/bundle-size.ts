#!/usr/bin/env node
// Usage:
//   node scripts/bundle-size.ts measure --package-dir packages/hydrogen --out head.json
//   node scripts/bundle-size.ts report --base base.json --head head.json --out report.md
//
// The package must already be built. Scenarios always come from this checkout,
// so measuring a base checkout uses the head's scenario list.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs, stripVTControlCharacters } from "node:util";
import { gzipSync } from "node:zlib";

import { rolldown } from "rolldown";

import {
  generateReport,
  isRecord,
  parseSnapshot,
  type SizeSnapshot,
} from "./bundle-size-report.ts";
import { scenarios, type BundleScenario } from "./bundle-size-scenarios.ts";

const PACKAGE_NAME = "@shopify/hydrogen";
const ENTRY_ID = "\0bundle-size-entry";

interface PackageManifest {
  exports: Record<string, unknown>;
  peerDependencies: string[];
}

function readManifest(packageDir: string): PackageManifest {
  const manifest: unknown = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  if (!isRecord(manifest) || !isRecord(manifest.exports)) {
    throw new Error(`${packageDir}/package.json has no exports map`);
  }
  return {
    exports: manifest.exports,
    peerDependencies: isRecord(manifest.peerDependencies)
      ? Object.keys(manifest.peerDependencies)
      : [],
  };
}

function resolveExport(target: unknown): string | undefined {
  if (typeof target === "string") return target;
  if (!isRecord(target)) return undefined;
  return resolveExport(target.import ?? target.default);
}

async function measureScenario(
  packageDir: string,
  manifest: PackageManifest,
  scenario: BundleScenario,
) {
  // Peers are installed by the storefront anyway; counting them would drown
  // out Hydrogen's own changes.
  const isPeer = (id: string) =>
    manifest.peerDependencies.some((peer) => id === peer || id.startsWith(`${peer}/`));

  const bundle = await rolldown({
    input: ENTRY_ID,
    platform: scenario.target === "client" ? "browser" : "neutral",
    external: isPeer,
    logLevel: "silent",
    plugins: [
      {
        name: "bundle-size-entry",
        resolveId(id) {
          if (id === ENTRY_ID) return id;
          if (id !== PACKAGE_NAME && !id.startsWith(`${PACKAGE_NAME}/`)) return null;
          const subpath = `.${id.slice(PACKAGE_NAME.length)}`;
          const file = resolveExport(manifest.exports[subpath]);
          if (file === undefined) throw new Error(`${PACKAGE_NAME} has no "${subpath}" export`);
          return resolve(packageDir, file);
        },
        load(id) {
          return id === ENTRY_ID ? scenario.code : null;
        },
      },
    ],
  });

  try {
    const { output } = await bundle.generate({
      format: "esm",
      minify: true,
      codeSplitting: false,
    });
    const code = output.flatMap((chunk) => (chunk.type === "chunk" ? [chunk.code] : [])).join("");
    return { minified: Buffer.byteLength(code), gzip: gzipSync(code).length };
  } finally {
    await bundle.close();
  }
}

async function measure(packageDir: string): Promise<SizeSnapshot> {
  const manifest = readManifest(packageDir);
  const snapshot: SizeSnapshot = { bundles: {}, failures: {} };
  for (const scenario of scenarios) {
    try {
      const size = await measureScenario(packageDir, manifest, scenario);
      snapshot.bundles[scenario.name] = { target: scenario.target, ...size };
      console.log(`✓ ${scenario.name}: ${size.gzip} B gzip`);
    } catch (error) {
      // Kept in the snapshot so the report can show it: on the base side it
      // usually means a new export, on the head side a broken scenario.
      const message = error instanceof Error ? error.message : String(error);
      const summary = stripVTControlCharacters(message)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");
      snapshot.failures[scenario.name] = { target: scenario.target, error: summary };
      console.warn(`✗ ${scenario.name}: ${summary}`);
    }
  }
  if (Object.keys(snapshot.bundles).length === 0) {
    throw new Error(`No scenario could be bundled. Is ${packageDir} built?`);
  }
  return snapshot;
}

function readSnapshot(file: string | undefined): SizeSnapshot | null {
  if (file === undefined) return null;
  try {
    return parseSnapshot(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    console.warn(`Ignoring snapshot ${file}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "package-dir": { type: "string", default: "packages/hydrogen" },
    out: { type: "string" },
    base: { type: "string" },
    head: { type: "string" },
  },
});

function write(output: string) {
  if (values.out === undefined) console.log(output);
  else writeFileSync(values.out, output);
}

const command = positionals[0];
if (command === "measure") {
  const snapshot = await measure(resolve(values["package-dir"]));
  write(`${JSON.stringify(snapshot, null, 2)}\n`);
} else if (command === "report") {
  const head = readSnapshot(values.head);
  if (!head) throw new Error(`Could not read --head snapshot: ${values.head}`);
  write(generateReport(head, readSnapshot(values.base)));
} else {
  console.error("Usage: node scripts/bundle-size.ts <measure|report> [options]");
  process.exit(1);
}
