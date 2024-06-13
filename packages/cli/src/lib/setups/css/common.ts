export type CssSetupResult = {
  workPromise: Promise<unknown>;
  generatedAssets: string[];
  helpUrl: string;
};

export type CssSetupConfig = {
  rootDirectory: string;
  appDirectory: string;
};
