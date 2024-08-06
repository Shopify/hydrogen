import {joinPath, dirname} from '@shopify/cli-kit/node/path';
import {writeFile, readFile, fileExists} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {getAssetsDir} from '../build.js';

export const BUNDLE_ANALYZER_JSON_FILE = 'metafile.server.json';
export const BUNDLE_ANALYZER_HTML_FILE = 'server-bundle-analyzer.html';

export async function classicBuildBundleAnalysis(buildPath: string) {
  const workerBuildPath = joinPath(buildPath, 'worker');
  const serverMetafile = BUNDLE_ANALYZER_JSON_FILE;
  const clientMetafile = 'metafile.js.json';

  const hasMetafile = (
    await Promise.all([
      fileExists(joinPath(workerBuildPath, serverMetafile)),
      fileExists(joinPath(workerBuildPath, clientMetafile)),
    ])
  ).every(Boolean);

  if (!hasMetafile) return null;

  try {
    await Promise.all([
      classicWriteBundleAnalyzerFile(
        workerBuildPath,
        serverMetafile,
        'worker-bundle-analyzer.html',
      ),
      classicWriteBundleAnalyzerFile(
        workerBuildPath,
        clientMetafile,
        'client-bundle-analyzer.html',
      ),
    ]);

    return 'file://' + joinPath(workerBuildPath, 'worker-bundle-analyzer.html');
  } catch (thrown) {
    const error = thrown as Error;

    renderWarning({
      headline: 'Could not generate bundle analysis',
      body: error?.stack ?? error?.message ?? error,
    });

    return null;
  }
}

export async function getAnalyzerTemplate() {
  return readFile(await getAssetsDir('bundle', 'analyzer.html'));
}

export function injectAnalyzerTemplateData(
  analysisTemplate: string,
  metafile: string,
) {
  return analysisTemplate.replace(
    `globalThis.METAFILE = '';`,
    `globalThis.METAFILE = '${Buffer.from(metafile, 'utf-8').toString(
      'base64',
    )}';`,
  );
}

async function classicWriteBundleAnalyzerFile(
  workerBuildPath: string,
  metafileName: string,
  outputFile: string,
) {
  const metafile = await readFile(joinPath(workerBuildPath, metafileName), {
    encoding: 'utf8',
  });

  await writeFile(
    joinPath(workerBuildPath, outputFile),
    injectAnalyzerTemplateData(await getAnalyzerTemplate(), metafile),
  );
}

export async function getBundleAnalysisSummary(distPath: string) {
  try {
    // This dependency is added globally by the CLI, and locally by Vite.
    const esbuild = await import('esbuild');

    const metafileAnalysis = await esbuild.analyzeMetafile(
      await readFile(joinPath(distPath, BUNDLE_ANALYZER_JSON_FILE)),
      {color: true},
    );

    return (
      '    │\n ' +
      metafileAnalysis
        .split('\n')
        .filter((line) => {
          const match = line.match(
            /(.*)(node_modules\/|server-assets-manifest:|server-entry-module:)(react-dom|@remix-run|@shopify\/hydrogen|react-router|react-router-dom)\/(.*)/g,
          );

          return !match;
        })
        .slice(2, 12)
        .join('\n')
        .replace(/dist\/worker\/_assets\/.*$/ms, '\n')
        .replace(/\n/g, '\n ')
        .replace(/(\.\.\/)+node_modules\//g, (match) => colors.dim(match))
    );
  } catch (error) {
    console.warn(
      'Could not generate bundle analysis summary:',
      (error as Error).message,
    );
  }
}

export function classicGetBundleAnalysisSummary(bundlePath: string) {
  return getBundleAnalysisSummary(dirname(bundlePath));
}
