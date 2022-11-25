import path from 'path';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';

export async function readEnv(rootPath = process.cwd()) {
  const content = await fs.readFile(path.resolve(rootPath, '.env'), 'utf-8');
  const env = dotenv.parse(content);

  return {...env, ...process.env};
}
