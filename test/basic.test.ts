/* eslint-disable jest/no-standalone-expect */
import {it, expect, template} from './test-framework';

it(
  'renders a basic page',
  async ({fs, instance, meta}) => {
    await fs.write('index.html', template['index.html']({title: meta.name}));
    await fs.write('vite.config.js', template['vite.config.js']());
    await fs.write('hydrogen.config.js', template['hydrogen.config.js']());
    await fs.write('src/App.server.jsx', template['App.Server.jsx']());
    await fs.write(
      'src/routes/index.server.tsx',
      `
      export default function Home() {
        return <div className="text-hello-world">Hello World</div>;
      }
  
    `
    );
    await fs.write('src/index.css', '');

    const page = await instance.start({target: ['worker']});
    // const page = await instance.dev();

    await page.navigate(instance.url());
    const text = await page.text('.text-hello-world');

    expect(text).toBe('Hello Worldff');
  },
  {debug: true}
);

/* eslint-enable jest/no-standalone-expect */
