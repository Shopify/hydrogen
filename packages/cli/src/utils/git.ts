import {simpleGit} from 'simple-git';

export async function isGitClean(directory: string): Promise<boolean> {
  const status = await simpleGit(directory).status();
  return status.isClean();
}
