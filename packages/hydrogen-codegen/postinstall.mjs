// Monkey patch `graphl-tag-pluck` for now

import fs from 'fs';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

fs.copyFileSync(
  require.resolve('./vendor/graphql-tag-pluck/visitor.js'),
  require
    .resolve('@graphql-tools/graphql-tag-pluck')
    .replace('/index.js', '/visitor.js'),
);
