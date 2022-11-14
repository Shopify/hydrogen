const fs = require('fs-extra');
const path = require('path');

module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {},
    'postcss-preset-env': {
      features: {'nesting-rules': false},
    },
    'postcss-modules': {
      async getJSON(cssFilepath, json, outputFilepath) {
        if (!cssFilepath.includes('.module.')) return;

        const jsFilepath = path.resolve(
          './app/styles/' + path.basename(cssFilepath) + '.js',
        );

        let code = `export default '${outputFilepath.split('public')[1]}';\n\n`;

        for (const [key, value] of Object.entries(json)) {
          code += `export const ${key} = '${value}';\n`;
        }

        await fs
          .mkdir(path.dirname(jsFilepath), {recursive: true})
          .catch(() => null);

        await fs.writeFile(jsFilepath, code);
      },
    },
  },
};
