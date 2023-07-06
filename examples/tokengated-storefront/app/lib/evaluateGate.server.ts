import type {Wallet} from '@shopify/connect-wallet';
import type {AppLoadContext} from '@shopify/remix-oxygen';
import type {UnlockingToken} from '@shopify/tokengate';

import type {GateConfiguration} from '~/generated/storefront-api-types';

import type {AlchemyGetNFTsForContractBody, GateContext} from './type';

type EvaluateGateParams = {
  context: AppLoadContext;
  gateConfiguration?: GateConfiguration;
  wallet?: Wallet;
};

type EvaluateGateResponse = {
  gateContext?: GateContext;
  unlockingTokens: UnlockingToken[];
};

type GetNFTsParams = {
  context: AppLoadContext;
  contractAddresses: string[];
  wallet: Wallet;
  withMetadata?: boolean;
};

async function getNFTs({
  context,
  contractAddresses,
  wallet,
  withMetadata = true,
}: GetNFTsParams) {
  try {
    const apiKey = context.env.ALCHEMY_API_KEY;
    const baseURL = `https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;

    /**
     * Construct the URL for our request.
     *
     * Note: If you're using a different endpoint or blockchain query provider
     * you can update the apiKey and baseURL above to match your provider.
     */
    const endpoint = new URL(baseURL);

    // Append our search params for the request.
    endpoint.searchParams.append('owner', wallet.address);

    /**
     * For Alchemy, contract address params are an array of strings.
     * This means that each contract address is appended as a search parameter.
     *
     * Example:
     * https://{requestUrl}/nft/v2/{apiKey}/getNFTs?owner={address}&contractAddresses[]={address1}&contractAddresses[]={address2}
     *
     * See the getNfts documentation: https://docs.alchemy.com/reference/getnfts
     */
    contractAddresses.forEach((contract) =>
      endpoint.searchParams.append('contractAddresses[]', contract),
    );

    endpoint.searchParams.append('withMetadata', withMetadata.toString());

    const request = await fetch(endpoint, {
      method: 'GET',
    });

    const response = await request.text();

    const body = JSON.parse(response) as AlchemyGetNFTsForContractBody;

    // Extract ownedNfts from the response body. In the event that
    // the body is empty, default to an empty array.
    return body?.ownedNfts || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      'Error caught while attempting to fetch nfts owned for wallet address.',
      error,
    );

    return [];
  }
}

/**
 * Evaluate a provided gate with provided gate configuration and wallet.
 * @param gateConfiguration GateConfiguration https://shopify.dev/docs/api/admin-graphql/unstable/objects/GateConfiguration
 * @param wallet Wallet https://shopify.dev/docs/api/blockchain/components/connect-wallet#wallet
 */
export async function evaluateGate({
  context,
  gateConfiguration,
  wallet,
}: EvaluateGateParams): Promise<EvaluateGateResponse> {
  const empty = {
    unlockingTokens: [],
  };

  if (!gateConfiguration || !wallet) {
    return empty;
  }

  // Create an array of collection addresses for the provided gateConfiguration.
  const gateRequirements = gateConfiguration.metafields.filter((metafield) => {
    return metafield && metafield.key === 'requirements';
  })[0]?.value;

  if (!gateRequirements) {
    return empty;
  }

  const gateRequirement = JSON.parse(gateRequirements);

  const contractAddresses = gateRequirement.conditions.map(
    ({contractAddress}: {contractAddress: string}) => contractAddress,
  );

  const nfts = await getNFTs({
    context,
    contractAddresses: contractAddresses || [],
    wallet,
  });

  if (!nfts.length) {
    return empty;
  }

  const unlockingTokens: UnlockingToken[] = nfts.map(
    ({contract, contractMetadata, media, metadata}) => {
      return {
        name: metadata.name,
        // metadata.image has a possibility of being an ipfs url, so try to use
        // the first media element's thumbnail and then default to metadata.image
        imageUrl: media.length ? media[0].thumbnail : metadata.image,
        collectionName: contractMetadata.name,
        contractAddress: contract.address,
      };
    },
  );

  /**
   * Generate the HMAC to be attributed to the cart.
   *
   * The HMAC is an encrypted version of the gateConfiguration.id
   * and is encrypted with the SHOPIFY_FUNCTION_SECRET value which
   * will allow the Shopify Function to decode the value at checkout
   * to validate all products with gates have their gate requirements
   * met and their reaction applied prior to completing the checkout.
   */
  const hmac = await generateHMAC(
    gateConfiguration.id,
    context.env.SHOPIFY_FUNCTION_SECRET,
  );

  return {
    gateContext: {
      id: gateConfiguration.id,
      hmac,
    },
    unlockingTokens,
  };
}

/**
 * Generates an HMAC (hash-based message authentication code) which is later attached to Cart attributes.
 *
 * This gets used by the Shopify Function at checkout to determine if the purchase should proceed (or if a discount should be added).
 *
 * Learn more about HMACs here: https://developer.mozilla.org/en-US/docs/Glossary/HMAC
 *
 * @param payload String The provided gateConfiguration.id
 * @param secret String The secret used by your Shopify Function which will perform operations at checkout to enforce "hard-gating."
 */
async function generateHMAC(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: {
        name: 'SHA-256',
      },
    },
    false,
    ['sign', 'verify'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload),
  );

  const hashArray = new Uint8Array(signature);

  const digestArray = [...hashArray];
  const digest = digestArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return digest;
}
