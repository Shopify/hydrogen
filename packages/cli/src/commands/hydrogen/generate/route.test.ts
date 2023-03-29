import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runGenerate, GENERATOR_TEMPLATES_DIR} from './route.js';
import {ui} from '@shopify/cli-kit';
import {readFile, writeFile, mkdir} from '@shopify/cli-kit/node/fs';
import {joinPath, dirname} from '@shopify/cli-kit/node/path';

describe('generate/route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('@shopify/cli-kit/node/output');
    vi.mock('@shopify/cli-kit', async () => {
      const cliKit: any = await vi.importActual('@shopify/cli-kit');
      return {
        ...cliKit,
        ui: {
          prompt: vi.fn(),
        },
      };
    });
  });

  it('generates a route file', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const route = 'pages/$pageHandle';
      const {appRoot, templatesRoot} = await createHydrogen(tmpDir, {
        files: [],
        templates: [[route, `const str = "hello world"`]],
      });

      // When
      await runGenerate(route, {
        directory: appRoot,
        templatesRoot,
      });

      // Then
      expect(
        await readFile(joinPath(appRoot, 'app/routes', `${route}.jsx`)),
      ).toContain(`const str = 'hello world'`);
    });
  });

  it('produces a typescript file when typescript argument is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const route = 'pages/$pageHandle';
      const {appRoot, templatesRoot} = await createHydrogen(tmpDir, {
        files: [],
        templates: [[route, 'const str = "hello typescript"']],
      });

      // When
      await runGenerate(route, {
        directory: appRoot,
        templatesRoot,
        typescript: true,
      });

      // Then
      expect(
        await readFile(joinPath(appRoot, 'app/routes', `${route}.tsx`)),
      ).toContain(`const str = 'hello typescript'`);
    });
  });

  it('prompts the user if there the file already exists', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      vi.mocked(ui.prompt).mockImplementationOnce(async () => {
        return {value: 'overwrite'};
      });

      const route = 'page/$pageHandle';
      const {appRoot, templatesRoot} = await createHydrogen(tmpDir, {
        files: [[`app/routes/${route}.jsx`, 'const str = "I exist"']],
        templates: [[route, 'const str = "hello world"']],
      });

      // When
      await runGenerate(route, {
        directory: appRoot,
        templatesRoot,
      });

      // Then
      expect(ui.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('already exists'),
          }),
        ]),
      );
    });
  });

  it('does not prompt the user if the force property is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      vi.mocked(ui.prompt).mockImplementationOnce(async () => {
        return {value: 'overwrite'};
      });

      const route = 'page/$pageHandle';
      const {appRoot, templatesRoot} = await createHydrogen(tmpDir, {
        files: [[`app/routes/${route}.jsx`, 'const str = "I exist"']],
        templates: [[route, 'const str = "hello world"']],
      });

      // When
      await runGenerate(route, {
        directory: appRoot,
        templatesRoot,
        force: true,
      });

      // Then
      expect(ui.prompt).not.toHaveBeenCalled();
    });
  });
});

async function createHydrogen(
  directory: string,
  {
    files,
    templates,
  }: {files: [string, string][]; templates: [string, string][]} = {
    files: [],
    templates: [],
  },
) {
  for (const item of files) {
    const [filePath, fileContent] = item;
    const fullFilePath = joinPath(directory, 'app', filePath);
    await mkdir(dirname(fullFilePath));
    await writeFile(fullFilePath, fileContent);
  }

  for (const item of templates) {
    const [filePath, fileContent] = item;
    const fullFilePath = joinPath(
      directory,
      GENERATOR_TEMPLATES_DIR,
      'routes',
      `${filePath}.tsx`,
    );
    await mkdir(dirname(fullFilePath));
    await writeFile(fullFilePath, fileContent);
  }

  return {
    appRoot: joinPath(directory, 'app'),
    templatesRoot: directory,
  };
}
