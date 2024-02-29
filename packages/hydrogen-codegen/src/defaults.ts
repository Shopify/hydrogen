import type {PresetConfig} from '@shopify/graphql-codegen';

const QUERIES_PLACEHOLDER = '%queries%';
const MUTATIONS_PLACEHOLDER = '%mutations%';

const sfapiDefaultInterfaceExtensionCode = `
declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends ${QUERIES_PLACEHOLDER} {}
  interface StorefrontMutations extends ${MUTATIONS_PLACEHOLDER} {}
}`;

const caapiDefaultInterfaceExtensionCode = `
declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends ${QUERIES_PLACEHOLDER} {}
  interface CustomerAccountMutations extends ${MUTATIONS_PLACEHOLDER} {}
}`;

function replacePlaceholders(
  code: string,
  queryType: string,
  mutationType: string,
) {
  return code
    .replace(QUERIES_PLACEHOLDER, queryType)
    .replace(MUTATIONS_PLACEHOLDER, mutationType);
}

type DefaultValues = {
  importTypesFrom: string;
  namespacedImportName: string;
  interfaceExtensionCode: PresetConfig['interfaceExtension'];
};

const sfapiDefaultValues: DefaultValues = {
  importTypesFrom: '@shopify/hydrogen/storefront-api-types',
  namespacedImportName: 'StorefrontAPI',
  interfaceExtensionCode: ({queryType, mutationType}) =>
    replacePlaceholders(
      sfapiDefaultInterfaceExtensionCode,
      queryType,
      mutationType,
    ),
};

const caapiDefaultValues: DefaultValues = {
  importTypesFrom: '@shopify/hydrogen/customer-account-api-types',
  namespacedImportName: 'CustomerAccountAPI',
  interfaceExtensionCode: ({queryType, mutationType}) =>
    replacePlaceholders(
      caapiDefaultInterfaceExtensionCode,
      queryType,
      mutationType,
    ),
};

export function getDefaultOptions(outputFile = '') {
  return /^(customer|caapi\.)/i.test(outputFile)
    ? caapiDefaultValues
    : sfapiDefaultValues;
}
