import path from 'node:path'

const BUILD_DIR = 'dist' // Hardcoded in Oxygen
const CLIENT_SUBDIR = 'client'
const WORKER_SUBDIR = 'worker' // Hardcoded in Oxygen

export function getProjectPaths(appPath?: string) {
  const root = appPath ?? process.cwd()
  const publicPath = path.join(root, 'public')
  const buildPath = path.join(root, BUILD_DIR)
  const buildPathClient = path.join(buildPath, CLIENT_SUBDIR)
  const buildPathWorkerFile = path.join(buildPath, WORKER_SUBDIR, 'index.js')

  return {
    root,
    buildPath,
    buildPathClient,
    buildPathWorkerFile,
    publicPath,
  }
}
