import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderTextPrompt,
} from '@shopify/cli-kit/node/ui';
import {type AdminSession, login} from '../../lib/auth.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {runLink} from './link.js';
import {createStorefront} from '../../lib/graphql/admin/create-storefront.js';
import {waitForJob} from '../../lib/graphql/admin/fetch-job.js';
import {setStorefront} from '../../lib/shopify-config.js';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
    renderSelectPrompt: vi.fn(),
    renderTextPrompt: vi.fn(),
  };
});
vi.mock('../../lib/auth.js');
vi.mock('../../lib/shopify-config.js');
vi.mock('../../lib/graphql/admin/link-storefront.js');
vi.mock('../../lib/graphql/admin/create-storefront.js');
vi.mock('../../lib/graphql/admin/fetch-job.js');
vi.mock('../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));

describe('link', () => {
  const outputMock = mockAndCaptureOutput();

  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  const FULL_SHOPIFY_CONFIG = {
    shop: 'my-shop.myshopify.com',
    shopName: 'My Shop',
    email: 'email',
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Hydrogen',
    },
  };

  const UNLINKED_SHOPIFY_CONFIG = {
    ...FULL_SHOPIFY_CONFIG,
    storefront: undefined,
  };

  const expectedStorefrontName = 'New Storefront';
  const expectedJobId = 'gid://shopify/Job/1';

  beforeEach(async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: UNLINKED_SHOPIFY_CONFIG,
    });

    vi.mocked(getStorefronts).mockResolvedValue([
      {
        ...FULL_SHOPIFY_CONFIG.storefront,
        parsedId: '1',
        productionUrl: 'https://example.com',
      },
    ]);

    vi.mocked(renderSelectPrompt).mockResolvedValue(FULL_SHOPIFY_CONFIG.shop);

    vi.mocked(createStorefront).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        title: expectedStorefrontName,
        productionUrl: 'https://example.com',
      },
      jobId: expectedJobId,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    outputMock.clear();
  });

  it('fetches the storefronts', async () => {
    await runLink({});

    expect(getStorefronts).toHaveBeenCalledWith(ADMIN_SESSION);
  });

  it('renders a list of choices and forwards the selection to setStorefront', async () => {
    vi.mocked(renderSelectPrompt).mockResolvedValue(
      FULL_SHOPIFY_CONFIG.storefront.id,
    );

    await runLink({path: 'my-path'});

    expect(setStorefront).toHaveBeenCalledWith(
      'my-path',
      expect.objectContaining(FULL_SHOPIFY_CONFIG.storefront),
    );
  });

  describe('when you want to link an existing Hydrogen storefront', () => {
    beforeEach(async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(
        'gid://shopify/HydrogenStorefront/1',
      );
    });

    it('renders a list of choices and forwards the selection to setStorefront', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(
        FULL_SHOPIFY_CONFIG.storefront.id,
      );

      await runLink({path: 'my-path'});

      expect(setStorefront).toHaveBeenCalledWith(
        'my-path',
        expect.objectContaining(FULL_SHOPIFY_CONFIG.storefront),
      );
    });

    it('renders a success message', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(
        FULL_SHOPIFY_CONFIG.storefront.id,
      );

      await runLink({path: 'my-path'});

      expect(outputMock.info()).toMatch(/is now linked/i);
      expect(outputMock.info()).toMatch(/Run `h2 dev`/i);
    });
  });

  describe('when you want to link a new Hydrogen storefront', () => {


    beforeEach(async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue(null);
    });

    it('chooses to create a new storefront given the directory path', async () => {
      await runLink({path: 'my-path'});

      expect(renderTextPrompt).toHaveBeenCalledWith({
        message: expect.stringMatching(/name/i),
        defaultValue: 'My Path',
      });
    });

    it('handles the successful creation of the storefront on Admin', async () => {
      await runLink({});

      expect(waitForJob).toHaveBeenCalledWith(ADMIN_SESSION, expectedJobId);

      expect(outputMock.info()).toContain(
        `${expectedStorefrontName} is now linked`,
      );
    });

    it('handles the job errors when creating the storefront on Admin', async () => {
      vi.mocked(waitForJob).mockRejectedValue(undefined);

      await expect(runLink({})).rejects.toThrow(Error);
    });
  });

  describe('when a linked storefront already exists', () => {
    beforeEach(() => {
      vi.mocked(login).mockResolvedValue({
        session: ADMIN_SESSION,
        config: FULL_SHOPIFY_CONFIG,
      });
    });

    it('prompts the user to confirm', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await runLink({});

      expect(renderConfirmationPrompt).toHaveBeenCalledWith({
        message: expect.stringMatching(
          /link to a different Hydrogen storefront/i,
        ),
      });
    });

    describe('and the user cancels', () => {
      it('returns early', async () => {
        vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

        await runLink({});

        expect(getStorefronts).not.toHaveBeenCalled();
        expect(setStorefront).not.toHaveBeenCalled();
      });
    });

    describe('and the --force flag is provided', () => {
      it('does not prompt the user to confirm', async () => {
        await runLink({force: true});

        expect(renderConfirmationPrompt).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the --storefront flag is provided', () => {
    it('does not prompt the user to make a selection', async () => {
      await runLink({path: 'my-path', storefront: 'Hydrogen'});

      expect(renderSelectPrompt).not.toHaveBeenCalled();
      expect(setStorefront).toHaveBeenCalledWith(
        'my-path',
        expect.objectContaining({
          id: 'gid://shopify/HydrogenStorefront/1',
          title: 'Hydrogen',
        }),
      );
    });

    describe('and there is no matching storefront', () => {
      it('renders a warning message and returns early', async () => {
        const outputMock = mockAndCaptureOutput();

        await runLink({storefront: 'Does not exist'});

        expect(setStorefront).not.toHaveBeenCalled();

        expect(outputMock.warn()).toMatch(/Couldn\'t find Does not exist/g);
      });
    });
  });
});
