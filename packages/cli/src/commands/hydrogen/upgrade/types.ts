export type RenderCommandProps = {
  appPath: string;
};

export type Dependencies = Record<string, string>;

export type Choice<T> = {
  label: string;
  value: T;
  key?: string;
  group?: string;
};

export type SupportedPackage =
  | '@shopify/hydrogen'
  | '@shopify/cli-hydrogen'
  | '@shopify/cli'
  | '@shopify/remix-oxygen'
  | '@shopify/oxygen-workers-types'
  | '@shopify/prettier-config';

export type PackageToUpgrade = {
  version: string;
  name: SupportedPackage;
  type: 'dependency' | 'devDependency';
};

export type CmdArgs = Array<string>;

export type Cmd = {
  dependencies: CmdArgs;
  devDependencies: CmdArgs;
};
