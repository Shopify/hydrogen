import {
  GENERATED_MUTATION_INTERFACE_NAME,
  GENERATED_QUERY_INTERFACE_NAME,
} from './plugin';

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

const defaultValues = Object.freeze({
  sfapi: {
    importTypesFrom: '@shopify/hydrogen/storefront-api-types',
    namespacedImportName: 'StorefrontAPI',
    interfaceExtensionCode: sfapiDefaultInterfaceExtensionCode,
  },
  caapi: {
    importTypesFrom: '@shopify/hydrogen/customer-account-api-types',
    namespacedImportName: 'CustomerAccountAPI',
    interfaceExtensionCode: caapiDefaultInterfaceExtensionCode,
  },
});

export const getDefaultOptions = (target: keyof typeof defaultValues) =>
  defaultValues[target];
