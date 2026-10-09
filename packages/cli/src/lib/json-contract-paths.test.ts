import {resolve} from 'node:path';
import {expect, it} from 'vitest';
import {absolutePath} from './json-contract.js';

it('encodes absolute paths with native separators and normalized segments', () => {
  const directory = resolve('project').replaceAll('\\', '/');
  expect(absolutePath.parse(`${directory}/folder/../server.js`)).toBe(
    resolve(directory, 'server.js'),
  );
});

it('rejects relative artifact paths before normalizing separators', () => {
  expect(() => absolutePath.parse('folder/server.js')).toThrow();
});
