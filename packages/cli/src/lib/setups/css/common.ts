export type CssSetupResult = {
  workPromise: Promise<unknown>;
  generatedAssets: string[];
  needsInstallDeps: boolean;
};

export type CssSetupConfig = {
  rootDirectory: string;
  appDirectory: string;
};
