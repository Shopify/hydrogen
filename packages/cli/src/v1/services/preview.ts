import {output, file, system, path} from '@shopify/cli-kit';
import {readAndParseDotEnv, DotEnvFile} from '@shopify/cli-kit/node/dot-env';

interface PreviewOptions {
  directory: string;
  port: number;
}

interface PreviewOptionsWorker extends PreviewOptions {
  envPath: string | undefined;
}

interface EnvConfig {
  env: DotEnvFile['variables'];
}

export async function previewInNode({directory, port}: PreviewOptions) {
  const buildOutputPath = await path.resolve(directory, 'dist/node');

  if (!(await file.exists(buildOutputPath))) {
    output.info(
      output.content`Couldn’t find a Node.js server build for this project. Running ${output.token.packagejsonScript(
        'yarn',
        'shopify hydrogen build',
        '--target=node',
      )} to create one.`,
    );

    await system.exec(
      'yarn',
      ['shopify', 'hydrogen', 'build', '--target=node'],
      {
        cwd: directory,
        stdout: process.stdout,
        stderr: process.stderr,
      },
    );
  }

  await system.exec('node', ['--enable-source-maps', buildOutputPath], {
    env: {PORT: `${port}`},
    cwd: directory,
    stdout: process.stdout,
    stderr: process.stderr,
  });
}

export async function previewInWorker({port, envPath}: PreviewOptionsWorker) {
  const {default: miniOxygen} = await import('@shopify/mini-oxygen');
  const miniOxygenPreview =
    miniOxygen.default ?? (miniOxygen as unknown as typeof miniOxygen.default);

  await miniOxygenPreview({
    port,
    workerFile: 'dist/worker/index.js',
    assetsDir: 'dist/client',
    buildCommand: 'yarn build',
    modules: true,
    watch: true,
    buildWatchPaths: ['./src'],
    autoReload: true,
    ...(envPath && (await parseEnvPath(envPath))),
  });

  async function parseEnvPath(envPath: string): Promise<EnvConfig> {
    const {variables} = await readAndParseDotEnv(envPath);
    return {
      env: variables,
    };
  }
}
