const run = ({rootDirectory}: {rootDirectory: string}) => {
  console.log(`Finished creating your Hydrogen storefront in ${rootDirectory}`);
  console.log(`📚 Docs: https://shopify.dev/custom-storefronts/hydrogen`);
  console.log(
    `👋 Note: your project will display inventory from the Hydrogen Demo Store.`,
  );
};

export default run;
