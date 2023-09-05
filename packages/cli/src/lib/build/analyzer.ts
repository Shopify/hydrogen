import { joinPath } from "@shopify/cli-kit/node/path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile } from "@shopify/cli-kit/node/fs";
import { outputInfo } from "@shopify/cli-kit/node/output";
import terminalLink from "terminal-link";

export async function buildBundleAnalysis(buildPath: string) {
  await Promise.all([
    writeBundleAnalyzerFile(
      buildPath,
      "metafile.server.json",
      "worker-bundle-analyzer.html",
    ),
    writeBundleAnalyzerFile(
      buildPath,
      "metafile.js.json",
      "client-bundle-analyzer.html",
    ),
  ]);

  return "file://" + joinPath(buildPath, "worker", "worker-bundle-analyzer.html");
}

async function writeBundleAnalyzerFile(
  buildPath: string,
  metafileName: string,
  outputFile: string,
) {
  const metafile = await readFile(joinPath(buildPath, "worker", metafileName), {
    encoding: "utf8",
  });

  const metafile64 = Buffer.from(metafile, "utf-8").toString("base64");

  const analysisTemplate = await readFile(
    fileURLToPath(
      new URL(`../../lib/build/bundle-analyzer.html`, import.meta.url),
    ),
  );

  const templateWithMetafile = analysisTemplate.replace(
    `globalThis.METAFILE = '';`,
    `globalThis.METAFILE = '${metafile64}';`,
  );

  await writeFile(
    joinPath(buildPath, "worker", outputFile),
    templateWithMetafile,
  );
}
