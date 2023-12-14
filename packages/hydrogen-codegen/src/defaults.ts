import {
  GENERATED_MUTATION_INTERFACE_NAME,
  GENERATED_QUERY_INTERFACE_NAME,
} from './plugin.js';

const sfapiDefaultInterfaceExtensionCode = `
declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends ${GENERATED_QUERY_INTERFACE_NAME} {}
  interface StorefrontMutations extends ${GENERATED_MUTATION_INTERFACE_NAME} {}
}`;

const caapiDefaultInterfaceExtensionCode = `
declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends ${GENERATED_QUERY_INTERFACE_NAME} {}
  interface CustomerAccountMutations extends ${GENERATED_MUTATION_INTERFACE_NAME} {}
}`;

type DefaultValues = {
  importTypesFrom: string;
  namespacedImportName: string;
  interfaceExtensionCode: string;
};

const sfapiDefaultValues: DefaultValues = {
  importTypesFrom: '@shopify/hydrogen/storefront-api-types',
  namespacedImportName: 'StorefrontAPI',
  interfaceExtensionCode: sfapiDefaultInterfaceExtensionCode,
};

const caapiDefaultValues: DefaultValues = {
  importTypesFrom: '@shopify/hydrogen/customer-account-api-types',
  namespacedImportName: 'CustomerAccountAPI',
  interfaceExtensionCode: caapiDefaultInterfaceExtensionCode,
};

export function getDefaultOptions(outputFile = '') {
  return /^(customer|caapi\.)/i.test(outputFile)
    ? caapiDefaultValues
    : sfapiDefaultValues;
}
