type Api = 'storefront';

/**
 * Resolves the schema path for the Storefront API bundled in hydrogen-temp.
 */
export function getSchema(api: Api): string {
  if (api !== 'storefront') {
    throw new Error(
      `The provided API type "${api}" is unknown. Only "storefront" is supported.`,
    );
  }

  try {
    return require.resolve(`${__PACKAGE_NAME__}/storefront.schema.json`);
  } catch {
    throw new Error(
      `Could not find the storefront schema.\nPlease make sure \`${__PACKAGE_NAME__}\` is installed.`,
    );
  }
}
