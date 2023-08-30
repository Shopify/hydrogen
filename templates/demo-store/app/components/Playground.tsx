import {useEffect} from 'react';

export function Playground({
  portableWalletsFqdn,
  country,
  variantIds,
}: {
  portableWalletsFqdn: string;
  country: string;
  variantIds: string[];
}) {
  usePortableWalletsPlayground(portableWalletsFqdn);

  // This is defined in `portable-wallets`
  return [
    <wallet-button
      wallet-id="paypal"
      store-domain={
        'https://shop1.shopify.portable-wallets-69z1.william-shanks.us.spin.dev'
      }
      buyer-country={country}
      variants={JSON.stringify(variantIds)}
      key="paypal"
    />,
    <wallet-button
      wallet-id="buy_it_now"
      store-domain={
        'https://shop1.shopify.portable-wallets-69z1.william-shanks.us.spin.dev'
      }
      buyer-country={country}
      variants={JSON.stringify(variantIds)}
      key="buy-it-now"
    />,
    // <wallet-button
    //   id="paypal"
    //   store-domain="https://shop1.shopify.portable-wallets-azek.geoff-caven.us.spin.dev"
    // ></wallet-button>
  ];
}

function usePortableWalletsPlayground(fqdn: string) {
  const prototypeSpinPath = '/src/components/hydrogen-playground/playground.ts';

  useEffect(
    function setupScripts() {
      const HMR_SCRIPT_ID = 'portable-wallets-hmr';
      const PROTOTYPE_SCRIPT_ID = 'portable-wallets-prototype';

      if (!document.getElementById(HMR_SCRIPT_ID)) {
        setupHmrScript();
      }

      if (!document.getElementById(PROTOTYPE_SCRIPT_ID)) {
        setupPrototypeScript();
      }

      function setupHmrScript() {
        const hmrScript = document.createElement('script');
        hmrScript.id = HMR_SCRIPT_ID;
        hmrScript.type = 'module';
        hmrScript.src = `//${fqdn}/@vite/client`;
        document.head.appendChild(hmrScript);
      }

      function setupPrototypeScript() {
        const prototypeScript = document.createElement('script');
        prototypeScript.id = PROTOTYPE_SCRIPT_ID;
        prototypeScript.type = 'module';
        prototypeScript.src = `//${fqdn}${prototypeSpinPath}`;
        document.head.appendChild(prototypeScript);
      }
    },
    [fqdn],
  );
}
