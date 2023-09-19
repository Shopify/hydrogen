export type MiniOxygenOptions = {
  root: string;
  port?: number;
  watch?: boolean;
  autoReload?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
  env: {[key: string]: string};
};

export type MiniOxygenInstance = {
  listeningAt: string;
  port: number;
  reload: (options?: Partial<Pick<MiniOxygenOptions, 'env'>>) => Promise<void>;
  showBanner: (options?: {
    mode?: string;
    headlinePrefix?: string;
    extraLines?: string[];
    appName?: string;
  }) => void;
  close: () => Promise<void>;
};
