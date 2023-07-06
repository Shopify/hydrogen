import {buildConnectors} from '@shopify/connect-wallet';
import {configureChains, createConfig} from 'wagmi';
import {mainnet} from 'wagmi/chains';
import {publicProvider} from 'wagmi/providers/public';

const {chains, publicClient, webSocketPublicClient} = configureChains(
  [mainnet],
  [publicProvider()],
);

const {connectors, wagmiConnectors} = buildConnectors({chains});

const config = createConfig({
  autoConnect: true,
  connectors: wagmiConnectors,
  publicClient,
  webSocketPublicClient,
});

export {chains, config, connectors};
