import type {SupportedPackage} from './types.js';

/**
 * Returns the dependency type for a given upgradable package
 * @param packageName - The package name
 * @returns The dependency type
 * @throws If the package name is unknown
 * @example
 * ```ts
 * const type = getDependencyType('@shopify/hydrogen');
 * // type === 'dependency' | 'devDependency'
 * ```
 */
export function getDependencyType(packageName: SupportedPackage) {
  switch (packageName) {
    case '@shopify/hydrogen':
    case '@shopify/remix-oxygen':
      return 'dependency';

    case '@shopify/oxygen-workers-types':
    case '@shopify/cli-hydrogen':
    case '@shopify/cli':
    case '@shopify/prettier-config':
      return 'devDependency';

    default:
      throw new Error(`Unknown package ${packageName}`);
  }
}
