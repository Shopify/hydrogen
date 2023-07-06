import type {Storefront as HydrogenStorefront} from '@shopify/hydrogen';
import type {
  CountryCode,
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  label: string;
  currency: CurrencyCode;
};

export type Localizations = Record<string, Locale>;

export type I18nLocale = Locale & {
  pathPrefix: string;
};

export type Storefront = HydrogenStorefront<I18nLocale>;

export enum CartAction {
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  UPDATE_CART = 'UPDATE_CART',
  UPDATE_DISCOUNT = 'UPDATE_DISCOUNT',
  UPDATE_BUYER_IDENTITY = 'UPDATE_BUYER_IDENTITY',
}
export type CartActions = keyof typeof CartAction;

/**
 * This is not a complete type definition of the return type
 * for the Alchemy endpoint this tutorial will be using.
 *
 * The types for the Alchemy endpoint's payload are subject to change.
 */
type NFTMediaObject = {
  gateway: string;
  thumbnail: string;
  raw: string;
  format: string;
  bytes: number;
};

type Metadata = {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttribute[];
};

type MetadataAttribute = {
  value: string;
  trait_type: string;
};

type ContractMetadata = {
  name: string;
  symbol: string;
  totalSupply: string;
  tokenType: string;
  contractDeployer: string;
  deployedBlockNumber: number;
  openSea: {
    floorPrice: number;
    collectionName: string;
    safelistRequestStatus: string;
    imageUrl: string;
    description: string;
    externalUrl: string;
    twitterUsername: string;
    discordUrl: string;
    lastIngestedAt: string;
  };
};

type NFT = {
  contract: {
    address: string;
  };
  id: {
    tokenId: string;
    tokenMetadata: {
      tokenType: string;
    };
  };
  balance: string;
  title: string;
  description: string;
  tokenUri: {
    gateway: string;
    raw: string;
  };
  media: NFTMediaObject[];
  metadata: Metadata;
  timeLastUpdated: string;
  contractMetadata: ContractMetadata;
};

export type AlchemyGetNFTsForContractBody = {
  ownedNfts: NFT[];
  totalCount: number;
  blockHash: string;
};

export type GateContext = {
  id: string;
  hmac: string;
};
