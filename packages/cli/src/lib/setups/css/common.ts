export type CssSetupResult = {
  workPromise: Promise<unknown>;
  generatedAssets: string[];
};

export type CssSetupConfig = {
  rootDirectory: string;
  appDirectory: string;
};
