import {expect, it} from 'vitest';
import {captureJsonOutput} from '../../tests/output.js';
import {renderInfo} from './ui.js';

it('writes banner diagnostics to stderr without contaminating stdout', async () => {
  const {stdout, stderr} = await captureJsonOutput(() =>
    renderInfo({body: 'Preparing project'}),
  );
  expect(stdout).toBe('');
  expect(JSON.parse(stderr)).toMatchObject({
    type: 'diagnostic',
    level: 'info',
    message: 'Preparing project',
  });
});
