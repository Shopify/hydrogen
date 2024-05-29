import {joinPath, dirname} from '@shopify/cli-kit/node/path';
import {fileURLToPath} from 'node:url';
import {writeFile, readFile, fileExists} from '@shopify/cli-kit/node/fs';
import colors from '@shopify/cli-kit/node/colors';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {getAssetsDir} from '../build.js';

export async function buildBundleAnalysis(buildPath: string) {
  const workerBuildPath = joinPath(buildPath, 'worker');
  const serverMetafile = 'metafile.server.json';
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
      writeBundleAnalyzerFile(
        workerBuildPath,
        serverMetafile,
        'worker-bundle-analyzer.html',
      ),
      writeBundleAnalyzerFile(
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

async function writeBundleAnalyzerFile(
  workerBuildPath: string,
  metafileName: string,
  outputFile: string,
) {
  const metafile = await readFile(joinPath(workerBuildPath, metafileName), {
    encoding: 'utf8',
  });

  const metafile64 = Buffer.from(metafile, 'utf-8').toString('base64');

  const analysisTemplate = await readFile(
    await getAssetsDir('bundle-analyzer.html'),
  );

  const templateWithMetafile = analysisTemplate.replace(
    `globalThis.METAFILE = '';`,
    `globalThis.METAFILE = '${metafile64}';`,
  );

  await writeFile(joinPath(workerBuildPath, outputFile), templateWithMetafile);
}

export async function getBundleAnalysisSummary(bundlePath: string) {
  const esbuild = await import('esbuild').catch(() => {});

  if (esbuild) {
    const metafilePath = joinPath(dirname(bundlePath), 'metafile.server.json');

    return (
      '    │\n ' +
      (
        await esbuild.analyzeMetafile(await readFile(metafilePath), {
          color: true,
        })
      )
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
  }
}
