/* eslint-disable jest/no-standalone-expect */
import {it, expect} from './test-framework';

it('renders a basic page', async ({fs, instance}) => {
  await fs.write(
    'src/index.ts',
    `
      const root = document.createElement('div')
      const button = document.createElement('button')
      button.id = 'btn'

      let count = 0

      button.textContent = \`Clicked $\{count} time(s)\`

      button.onclick = () => {
        count++
        button.textContent = \`Clicked $\{count} time(s)\`
      }

      root.appendChild(button)
      document.body.appendChild(root)
    `
  );
  await fs.write(
    'index.html',
    `
      <!DOCTYPE html>
      <html>

      <head>
        <meta charset="utf-8">
        <title>Playwright Vitest Test Page</title>
        <script type="module" src="/src/index.ts"></script>
      </head>

      <body>
      </body>

      </html>
    `
  );
  await fs.write(
    'vite.config.ts',
    `
      import { defineConfig } from 'vite'
      export default defineConfig({})
    `
  );

  await fs.write(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react',
        },
      },
      null,
      2
    )
  );

  const page = await instance.dev();

  await page.goto(instance.url());
  const button = page.locator('#btn');
  await expect(button).toBeDefined();

  await expect(await button.textContent()).toBe('Clicked 0 time(s)');

  await button.click();
  await expect(await button.textContent()).toBe('Clicked 1 time(s)');
});

it('builds a site', async ({fs, instance}) => {
  await fs.write(
    'src/index.ts',
    `
        const root = document.createElement('div')
        const button = document.createElement('button')
        button.id = 'btn'
  
        let count = 0
  
        button.textContent = \`Clicked $\{count} time(s)\`
  
        button.onclick = () => {
          count++
          button.textContent = \`Clicked $\{count} time(s)\`
        }
  
        root.appendChild(button)
        document.body.appendChild(root)
      `
  );
  await fs.write(
    'index.html',
    `
        <!DOCTYPE html>
        <html>
  
        <head>
          <meta charset="utf-8">
          <title>Playwright Vitest Test Page</title>
          <script type="module" src="/src/index.ts"></script>
        </head>
  
        <body>
        </body>
  
        </html>
      `
  );
  await fs.write(
    'vite.config.ts',
    `
        import { defineConfig } from 'vite'
        export default defineConfig({})
      `
  );

  await fs.write(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react',
        },
      },
      null,
      2
    )
  );

  await instance.build();
  await instance.start();
});
/* eslint-enable jest/no-standalone-expect */
