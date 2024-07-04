import * as _oclif_core_lib_interfaces_parser_js from '@oclif/core/lib/interfaces/parser.js';
import Command from '@shopify/cli-kit/node/base-command';
import { PackageManager } from '@shopify/cli-kit/node/node-package-manager';

declare const SETUP_I18N_STRATEGIES: readonly ["subfolders", "domains", "subdomains"];
type I18nStrategy = (typeof SETUP_I18N_STRATEGIES)[number];
declare const I18N_CHOICES: readonly ["subfolders", "domains", "subdomains", "none"];
type I18nChoice = (typeof I18N_CHOICES)[number];

declare function getCliCommand(directory?: string, forcePkgManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown'): Promise<"h2" | "yarn shopify hydrogen" | "pnpm shopify hydrogen" | "bun shopify hydrogen" | "npx shopify hydrogen">;
type CliCommand = Awaited<ReturnType<typeof getCliCommand>>;

declare const ASSETS_STARTER_DIR = "starter";
type AssetsDir = 'tailwind' | 'css-modules' | 'vanilla-extract' | 'postcss' | 'vite' | 'i18n' | 'routes' | 'bundle' | 'virtual-routes' | 'internal-templates' | 'external-templates' | typeof ASSETS_STARTER_DIR;

type CssStrategy = Extract<AssetsDir, 'tailwind' | 'css-modules' | 'vanilla-extract' | 'postcss'>;

declare const STYLING_CHOICES: readonly [...CssStrategy[], "none"];
type StylingChoice = (typeof STYLING_CHOICES)[number];

type InitOptions = {
    path?: string;
    template?: string;
    language?: Language;
    mockShop?: boolean;
    styling?: StylingChoice;
    i18n?: I18nChoice;
    token?: string;
    force?: boolean;
    routes?: boolean;
    shortcut?: boolean;
    installDeps?: boolean;
    git?: boolean;
    quickstart?: boolean;
    packageManager?: PackageManager;
};
declare const LANGUAGES: {
    readonly js: "JavaScript";
    readonly ts: "TypeScript";
};
type Language = keyof typeof LANGUAGES;

declare class Init extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        routes: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        git: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        quickstart: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'package-manager': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        shortcut: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        markets: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'mock-shop': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'install-deps': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        language: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        template: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
declare function runInit({ markets, ...options }?: InitOptions & {
    markets?: InitOptions['i18n'];
}): Promise<{
    language?: "js" | "ts";
    packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
    cssStrategy?: CssStrategy;
    cliCommand: CliCommand;
    depsInstalled: boolean;
    depsError?: Error;
    i18n?: I18nStrategy;
    i18nError?: Error;
    routes?: Record<string, string | string[]>;
    routesError?: Error;
    location: string;
    name: string;
    directory: string;
    storefrontTitle?: string;
} | undefined>;

export { Init as default, runInit };
