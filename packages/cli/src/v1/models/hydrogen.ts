import {loadConfig} from '../utilities/load-config.js';
import {error as kitError} from '@shopify/cli-kit';
import {
  getDependencies,
  getPackageName,
  PackageManager,
  pnpmLockfile,
  yarnLockfile,
} from '@shopify/cli-kit/node/node-package-manager';
import {path} from '@shopify/cli-kit';
import {file} from '@shopify/cli-kit';
import type {HydrogenConfig} from '../utilities/load-config.js';

const joinPath = path.join;
const basename = path.basename;

const fileExists = file.exists;

export interface HydrogenApp {
  name: string;
  directory: string;
  packageManager: PackageManager;
  configuration: HydrogenConfig;
  nodeDependencies: {[key: string]: string};
  language: 'JavaScript' | 'TypeScript';
  errors?: AppErrors;
}

interface AppLoaderConstructorArgs {
  directory: string;
}

class AppErrors {
  private errors: {
    [key: string]: string;
  } = {};

  addError(path: string, message: string): void {
    this.errors[path] = message;
  }

  getError(path: string) {
    return this.errors[path];
  }

  isEmpty() {
    return Object.keys(this.errors).length === 0;
  }

  toJSON(): string[] {
    return Object.values(this.errors);
  }
}

class HydrogenAppLoader {
  private directory: string;
  private errors: AppErrors = new AppErrors();

  constructor({directory}: AppLoaderConstructorArgs) {
    this.directory = directory;
  }

  async loaded() {
    if (!(await fileExists(this.directory))) {
      throw new kitError.Abort(`Couldn't find directory ${this.directory}`);
    }

    const {configuration} = await this.loadConfig();

    const yarnLockPath = joinPath(this.directory, yarnLockfile);
    const yarnLockExists = await fileExists(yarnLockPath);
    const pnpmLockPath = joinPath(this.directory, pnpmLockfile);
    const pnpmLockExists = await fileExists(pnpmLockPath);
    const packageJSONPath = joinPath(this.directory, 'package.json');
    const name = await getPackageName(packageJSONPath);
    const nodeDependencies = await getDependencies(packageJSONPath);
    const tsConfigExists = await fileExists(
      joinPath(this.directory, 'tsconfig.json'),
    );
    const language =
      tsConfigExists && nodeDependencies.typescript
        ? 'TypeScript'
        : 'JavaScript';

    let packageManager: PackageManager;
    if (yarnLockExists) {
      packageManager = 'yarn';
    } else if (pnpmLockExists) {
      packageManager = 'pnpm';
    } else {
      packageManager = 'npm';
    }

    const app: HydrogenApp = {
      name: name ?? basename(this.directory),
      directory: this.directory,
      configuration,
      packageManager,
      nodeDependencies,
      language,
    };

    if (!this.errors.isEmpty()) app.errors = this.errors;

    return app;
  }

  async loadConfig() {
    const abortError = new kitError.Abort(
      `Couldn't find hydrogen configuration file`,
    );

    try {
      const config = await loadConfig({root: this.directory});

      if (!config) {
        throw abortError;
      }

      return config;
    } catch (error: any) {
      abortError.stack = error.stack;
      throw abortError;
    }
  }
}

export async function load(directory: string): Promise<HydrogenApp> {
  const loader = new HydrogenAppLoader({directory});

  return loader.loaded();
}
