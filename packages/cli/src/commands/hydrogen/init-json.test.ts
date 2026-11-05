import {afterEach, expect, it, vi} from 'vitest';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {runInit} from './init.js';
import {checkCurrentCLIVersion} from '../../lib/check-cli-version.js';
import {setupTemplate} from '../../lib/onboarding/index.js';

vi.mock('../../lib/check-cli-version.js');
vi.mock('../../lib/onboarding/index.js');

const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
});

it('emits upgrade notices as JSON before direct initialization', async () => {
  process.argv = [process.execPath, 'create-hydrogen', '--json'];
  vi.mocked(checkCurrentCLIVersion).mockResolvedValueOnce(() => {
    renderInfo({
      headline: 'Upgrade available',
      body: 'Install the latest version.',
    });
    return {currentVersion: '1.0.0', newVersion: '1.0.1'};
  });
  vi.mocked(setupTemplate).mockResolvedValueOnce(undefined);

  await withCapturedStandardStreams(async (streams) => {
    await runInit({});

    expect(streams.stdout()).toBe('');
    expect(JSON.parse(streams.stderr())).toMatchObject({
      type: 'diagnostic',
      level: 'info',
      message: expect.stringContaining('Upgrade available'),
    });
    expect(setupTemplate).toHaveBeenCalledOnce();
  });
});
