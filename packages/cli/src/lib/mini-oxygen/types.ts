import type {TokenItem} from '@shopify/cli-kit/node/ui';

export type MiniOxygenOptions = {
  root: string;
  appPort?: number;
  watch?: boolean;
  autoReload?: boolean;
  buildPathClient: string;
  buildPathWorkerFile: string;
  env: {[key: string]: string};
  debug?: boolean;
  inspectorPort?: number;
  assetsPort?: number;
};

export type MiniOxygenInstance = {
  listeningAt: string;
  port: number;
  reload: (options?: Partial<Pick<MiniOxygenOptions, 'env'>>) => Promise<void>;
  showBanner: (options?: {
    mode?: string;
    headlinePrefix?: string;
    host?: string;
    appName?: string;
    tunnelHost?: string;
  }) => void;
  close: () => Promise<void>;
};
