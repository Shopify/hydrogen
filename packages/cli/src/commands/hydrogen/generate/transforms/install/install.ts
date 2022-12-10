import {ui, npm} from '@shopify/cli-kit';

export default async function installHydrogen({path: appPath}: {path: string}) {
  let tasks: ui.ListrTasks = [
    {
      title: `Install dependencies`,
      task: async () => {
        const packageJSON = await npm.readPackageJSON(appPath);

        packageJSON.dependencies = {
          ...packageJSON.dependencies,
          '@shopify/cli': '^3.23.0',
          '@shopify/cli-h2-test': '^4.0.4',
          '@shopify/hydrogen-react': '^2022.10.3',
          '@shopify/h2-test-remix-oxygen': '^0.0.4',
          '@shopify/h2-test-hydrogen': '^2.0.2',
          '@shopify/h2-test-hydrogen-remix': '^0.0.4',
        };

        packageJSON.devDependencies = {
          ...packageJSON.devDependencies,
          '@shopify/oxygen-workers-types': '^3.17.2',
        };

        packageJSON.scripts = {
          build: 'shopify hydrogen build --entry server.ts',
          dev: 'shopify hydrogen dev --entry server.ts',
          preview: 'npm run build && shopify hydrogen preview',
        };

        await npm.writePackageJSON(appPath, packageJSON);
      },
    },
    {
      title: `Add Oxygen server`,
      task: async () => {},
    },
    {
      title: `Replace imports to oxygen adaptor`,
      task: async () => {},
    },
    {
      title: `Fetch storefront data in root loader`,
      task: async () => {},
    },
  ];

  const list = ui.newListr(tasks, {
    concurrent: false,
    rendererOptions: {collapse: false},
  });

  await list.run();
}
