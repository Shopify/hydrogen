import {setupI18nPathname} from './pathname.js';
import {setupI18nSubdomains} from './subdomains.js';
import {setupI18nDomains} from './domains.js';

export const SETUP_I18N_STRATEGIES = [
  'pathname',
  'domains',
  'subdomains',
] as const;

export type I18nStrategy = (typeof SETUP_I18N_STRATEGIES)[number];

export type SetupConfig = {
  rootDirectory: string;
  serverEntryPoint?: string;
};

export function setupI18nStrategy(
  strategy: I18nStrategy,
  options: SetupConfig,
) {
  switch (strategy) {
    case 'pathname':
      return setupI18nPathname(options);
    case 'domains':
      return setupI18nDomains(options);
    case 'subdomains':
      return setupI18nSubdomains(options);
    default:
      throw new Error('Unknown strategy');
  }
}
