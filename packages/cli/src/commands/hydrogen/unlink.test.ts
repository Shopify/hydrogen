import {describe, it, expect, vi, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

import {getConfig, unsetStorefront} from '../../lib/shopify-config.js';

import {unlinkStorefront} from './unlink.js';

vi.mock('../../lib/shopify-config.js');

describe('link', () => {
  const outputMock = mockAndCaptureOutput();

  afterEach(() => {
    vi.resetAllMocks();
    outputMock.clear();
  });

  it('removes the storefront information from the config file', async () => {
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/2',
        title: 'Existing Link',
      },
    });

    await unlinkStorefront({path: 'my-path'});

    expect(unsetStorefront).toHaveBeenCalledWith('my-path');
    expect(outputMock.output()).toMatch(
      /You are no longer linked to Existing Link/g,
    );
  });

  describe('when there is no existing storefront link', () => {
    it('renders a warning message and returns early', async () => {
      vi.mocked(getConfig).mockResolvedValue({});

      await unlinkStorefront({});

      expect(outputMock.output()).toMatch(
        /This project isn\'t linked to a Hydrogen storefront\./g,
      );
      expect(unsetStorefront).not.toHaveBeenCalled();
    });
  });
});
