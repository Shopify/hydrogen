import {describe, expect, test} from 'vitest';
import v2023_1_6 from './v2023.1.6.js';
import {file, path} from '@shopify/cli-kit';

import {createFixture} from '../../utils/test.js';
import {parseGuide, type Changeset} from '../../utils/parse-guide.js';

const testCases = parseGuide(import.meta.url);

describe.each(testCases)('$description', (change: Changeset) => {
  const {before = '', after = '', description = '', filename = ''} = change;

  test(description, async () => {
    await file.inTemporaryDirectory(async (directory) => {
      // given
      await createFixture(directory, {[filename]: before});

      // when
      const runner = await v2023_1_6(directory);
      await runner.run();

      // then
      const result = await file.read(path.join(directory, filename));
      expect(after.trim()).toBe(result.trim());
    });
  });
});
