/* eslint-disable no-console */

const run = ({rootDirectory}: {rootDirectory: string}) => {
  console.log();
  console.log(`Finished creating your Hydrogen storefront in ${rootDirectory}`);
  console.log(`📚 Docs: https://shopify.dev/custom-storefronts/hydrogen`);
  console.log(
    `👋 Note: your project will display inventory from the Hydrogen Demo Store.`,
  );
  console.log();
};

export default run;

/* eslint-enable no-console */
