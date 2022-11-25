import fs from 'fs/promises';
import {defineConfig} from 'tsup';
import {
  entry,
  devConfig,
  prodConfig,
  cjsEntryFile,
  cjsEntryContent,
} from '../../tsup.config';

const entryPoints = [entry, 'src/node/index.ts'];

export default [
  defineConfig({...devConfig, entryPoints}),
  defineConfig({
    ...prodConfig,
    entryPoints,
    onSuccess: () =>
      fs.writeFile(
        cjsEntryFile,
        cjsEntryContent.replaceAll('index.cjs', 'node/index.cjs'),
        'utf-8',
      ),
  }),
];
