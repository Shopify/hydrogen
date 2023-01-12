/* eslint-disable no-console */
const fs = require('fs');

const run = ({rootDirectory}) => {
  // TEMPORARY during dev preview:
  // If _env and _gitignore exist, rename them as .env and .gitignore
  if (fs.existsSync(`${rootDirectory}/_env`)) {
    fs.renameSync(`${rootDirectory}/_env`, `${rootDirectory}/.env`);
  }
  if (fs.existsSync(`${rootDirectory}/_gitignore`)) {
    fs.renameSync(`${rootDirectory}/_gitignore`, `${rootDirectory}/.gitignore`);
  }

  console.log();
  console.log(`Finished creating your Hydrogen storefront in ${rootDirectory}`);
  console.log(`📚 Docs: https://shopify.dev/custom-storefronts/hydrogen`);
  console.log(
    `👋 Note: your project will display inventory from the Hydrogen Demo Store.`,
  );
  console.log();
};

module.exports = run;

/* eslint-enable no-console */
