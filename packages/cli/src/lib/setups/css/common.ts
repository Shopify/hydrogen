export type SetupResult = {
  workPromise: Promise<unknown>;
  generatedAssets: string[];
  helpUrl: string;
};

export type SetupConfig = {
  rootDirectory: string;
  appDirectory: string;
  tailwind?: boolean;
  postcss?: boolean;
};
