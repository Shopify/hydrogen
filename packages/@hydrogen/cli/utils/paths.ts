import path from 'path';

export function getProjectPaths(entry?: string) {
  const root = path.resolve(process.cwd(), '..', '..', '..');
  const publicPath = path.join(root, 'public');
  const buildPath = path.join(root, 'build');
  const buildPathClient = path.join(buildPath, 'client');
  const buildPathWorkerFile = path.join(buildPath, 'worker', 'index.js');
  const entryFile = entry ? path.join(root, entry) : '';

  return {
    root,
    entryFile,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  };
}
