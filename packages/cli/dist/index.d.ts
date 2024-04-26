import * as _oclif_core_lib_interfaces_parser_js from '@oclif/core/lib/interfaces/parser.js';
import Command from '@shopify/cli-kit/node/base-command';
import * as _oclif_core_lib_interfaces_alphabet_js from '@oclif/core/lib/interfaces/alphabet.js';
import Init from './commands/hydrogen/init.js';
import '@shopify/cli-kit/node/node-package-manager';

declare class Build extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        diff: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        codegen: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'codegen-config-path': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'disable-route-warning': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'lockfile-check': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'bundle-stats': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        sourcemap: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class GenerateRoute$1 extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    static args: {
        resource: _oclif_core_lib_interfaces_parser_js.Arg<string, Record<string, unknown>>;
    };
    run(): Promise<void>;
}

declare class Codegen extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        'codegen-config-path': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'force-sfapi-version': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        watch: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class CustomerAccountPush extends Command {
    static description: string;
    static flags: {
        'storefront-id': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'dev-origin': _oclif_core_lib_interfaces_parser_js.OptionFlag<string, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'relative-redirect-uri': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'relative-logout-uri': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class DebugCpu extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        output: _oclif_core_lib_interfaces_parser_js.OptionFlag<string, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Deploy extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: any;
    run(): Promise<void>;
    private flagsToOxygenDeploymentOptions;
}

declare class Dev extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        verbose: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'customer-account-push__unstable': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        diff: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'disable-version-check': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'env-branch': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        env: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'inspector-port': _oclif_core_lib_interfaces_parser_js.OptionFlag<number | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        debug: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'disable-virtual-routes': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        sourcemap: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        codegen: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'codegen-config-path': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'legacy-runtime': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        worker: {
            type: "option";
            name: string;
            char?: _oclif_core_lib_interfaces_alphabet_js.AlphabetLowercase | _oclif_core_lib_interfaces_alphabet_js.AlphabetUppercase | undefined;
            summary?: string | undefined;
            description?: string | undefined;
            helpLabel?: string | undefined;
            helpGroup?: string | undefined;
            env?: string | undefined;
            hidden?: boolean | undefined;
            required?: boolean | undefined;
            dependsOn?: string[] | undefined;
            exclusive?: string[] | undefined;
            exactlyOne?: string[] | undefined;
            relationships?: _oclif_core_lib_interfaces_parser_js.Relationship[] | undefined;
            deprecated?: true | _oclif_core_lib_interfaces_parser_js.Deprecation | undefined;
            aliases?: string[] | undefined;
            charAliases?: (_oclif_core_lib_interfaces_alphabet_js.AlphabetLowercase | _oclif_core_lib_interfaces_alphabet_js.AlphabetUppercase)[] | undefined;
            deprecateAliases?: boolean | undefined;
            noCacheDefault?: boolean | undefined;
            helpValue?: string | undefined;
            options?: readonly string[] | undefined;
            multiple?: boolean | undefined;
            multipleNonGreedy?: boolean | undefined;
            delimiter?: "," | undefined;
            allowStdin?: boolean | "only" | undefined;
            parse: _oclif_core_lib_interfaces_parser_js.FlagParser<unknown, string, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
            defaultHelp?: unknown;
            input: string[];
            default?: unknown;
        };
        port: _oclif_core_lib_interfaces_parser_js.OptionFlag<number | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class EnvList extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class EnvPull extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'env-branch': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        env: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class EnvPush extends Command {
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'env-file': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        env: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class GenerateRouteShortcut extends Command {
    static description: string;
    static strict: boolean;
    static hidden: boolean;
    run(): Promise<void>;
}

declare class GenerateRoute extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        adapter: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        typescript: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'locale-param': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    static hidden: true;
    static args: {
        routeName: _oclif_core_lib_interfaces_parser_js.Arg<string, Record<string, unknown>>;
    };
    run(): Promise<void>;
}

declare class GenerateRoutes extends Command {
    static description: string;
    static hidden: true;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        adapter: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        typescript: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'locale-param': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Link extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        storefront: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}

declare class List extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Login extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        shop: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Logout extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Preview extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        verbose: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        debug: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        'inspector-port': _oclif_core_lib_interfaces_parser_js.OptionFlag<number | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'env-branch': _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        env: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        'legacy-runtime': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        worker: {
            type: "option";
            name: string;
            char?: _oclif_core_lib_interfaces_alphabet_js.AlphabetLowercase | _oclif_core_lib_interfaces_alphabet_js.AlphabetUppercase | undefined;
            summary?: string | undefined;
            description?: string | undefined;
            helpLabel?: string | undefined;
            helpGroup?: string | undefined;
            env?: string | undefined;
            hidden?: boolean | undefined;
            required?: boolean | undefined;
            dependsOn?: string[] | undefined;
            exclusive?: string[] | undefined;
            exactlyOne?: string[] | undefined;
            relationships?: _oclif_core_lib_interfaces_parser_js.Relationship[] | undefined;
            deprecated?: true | _oclif_core_lib_interfaces_parser_js.Deprecation | undefined;
            aliases?: string[] | undefined;
            charAliases?: (_oclif_core_lib_interfaces_alphabet_js.AlphabetLowercase | _oclif_core_lib_interfaces_alphabet_js.AlphabetUppercase)[] | undefined;
            deprecateAliases?: boolean | undefined;
            noCacheDefault?: boolean | undefined;
            helpValue?: string | undefined;
            options?: readonly string[] | undefined;
            multiple?: boolean | undefined;
            multipleNonGreedy?: boolean | undefined;
            delimiter?: "," | undefined;
            allowStdin?: boolean | "only" | undefined;
            parse: _oclif_core_lib_interfaces_parser_js.FlagParser<unknown, string, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
            defaultHelp?: unknown;
            input: string[];
            default?: unknown;
        };
        port: _oclif_core_lib_interfaces_parser_js.OptionFlag<number | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Setup extends Command {
    static description: string;
    static flags: {
        'install-deps': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        shortcut: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        markets: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class SetupCSS extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        'install-deps': _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    static args: {
        strategy: _oclif_core_lib_interfaces_parser_js.Arg<string | undefined, Record<string, unknown>>;
    };
    run(): Promise<void>;
}

declare class SetupMarkets extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    static args: {
        strategy: _oclif_core_lib_interfaces_parser_js.Arg<string | undefined, Record<string, unknown>>;
    };
    run(): Promise<void>;
}

declare class SetupVite extends Command {
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Shortcut extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    run(): Promise<void>;
}

declare class Unlink extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare class Upgrade extends Command {
    static descriptionWithMarkdown: string;
    static description: string;
    static flags: {
        version: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
        force: _oclif_core_lib_interfaces_parser_js.BooleanFlag<boolean>;
        path: _oclif_core_lib_interfaces_parser_js.OptionFlag<string | undefined, _oclif_core_lib_interfaces_parser_js.CustomOptions>;
    };
    run(): Promise<void>;
}

declare const COMMANDS: {
    'hydrogen:dev': typeof Dev;
    'hydrogen:build': typeof Build;
    'hydrogen:check': typeof GenerateRoute$1;
    'hydrogen:codegen': typeof Codegen;
    'hydrogen:deploy': typeof Deploy;
    'hydrogen:g': typeof GenerateRouteShortcut;
    'hydrogen:init': typeof Init;
    'hydrogen:link': typeof Link;
    'hydrogen:list': typeof List;
    'hydrogen:login': typeof Login;
    'hydrogen:logout': typeof Logout;
    'hydrogen:preview': typeof Preview;
    'hydrogen:setup': typeof Setup;
    'hydrogen:shortcut': typeof Shortcut;
    'hydrogen:unlink': typeof Unlink;
    'hydrogen:upgrade': typeof Upgrade;
    'hydrogen:customer-account-push': typeof CustomerAccountPush;
    'hydrogen:debug:cpu': typeof DebugCpu;
    'hydrogen:env:list': typeof EnvList;
    'hydrogen:env:pull': typeof EnvPull;
    'hydrogen:env:push': typeof EnvPush;
    'hydrogen:generate:route': typeof GenerateRoute;
    'hydrogen:generate:routes': typeof GenerateRoutes;
    'hydrogen:setup:css': typeof SetupCSS;
    'hydrogen:setup:markets': typeof SetupMarkets;
    'hydrogen:setup:vite': typeof SetupVite;
};

export { COMMANDS as default };
