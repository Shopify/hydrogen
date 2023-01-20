import {createRequire} from 'module';
export type HydrogenConfig = any;

const require = createRequire(import.meta.url);
const {loadConfig} = require('@shopify/hydrogen/load-config') as {
  loadConfig: (options: {root: string}) => Promise<HydrogenConfig>;
};

export {loadConfig};
