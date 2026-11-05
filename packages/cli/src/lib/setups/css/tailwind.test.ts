import {expect, it, vi} from 'vitest';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {setupTailwind} from './tailwind.js';

vi.mock('@shopify/cli-kit/node/ui', async (original) => ({
  ...(await original<typeof import('@shopify/cli-kit/node/ui')>()),
  renderConfirmationPrompt: vi.fn(),
}));

it('preserves existing Tailwind CSS when overwrite is declined', async () => {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'hydrogen-tailwind-'));
  const appDirectory = join(rootDirectory, 'app');
  const cssPath = join(appDirectory, 'styles/tailwind.css');
  try {
    await mkdir(join(appDirectory, 'styles'), {recursive: true});
    await writeFile(cssPath, '/* custom styles */');
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);
    expect(await setupTailwind({rootDirectory, appDirectory})).toBeUndefined();
    expect(renderConfirmationPrompt).toHaveBeenCalledOnce();
    expect(await readFile(cssPath, 'utf8')).toBe('/* custom styles */');
  } finally {
    await rm(rootDirectory, {recursive: true, force: true});
  }
});
