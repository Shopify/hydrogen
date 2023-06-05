import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {generateRoute} from './route.js';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {readFile, writeFile, mkdir} from '@shopify/cli-kit/node/fs';
import {joinPath, dirname} from '@shopify/cli-kit/node/path';
import {getRouteFile} from '../../../lib/build.js';

describe('generate/route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('@shopify/cli-kit/node/output');
    vi.mock('@shopify/cli-kit/node/ui');
  });

  it('generates a route file', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const route = 'pages/$pageHandle';
      const directories = await createHydrogenFixture(tmpDir, {
        files: [],
        templates: [[route, `const str = "hello world"`]],
      });

      // When
      await generateRoute(route, directories);

      // Then
      expect(
        await readFile(
          joinPath(directories.appDirectory, 'routes', `${route}.jsx`),
        ),
      ).toContain(`const str = 'hello world'`);
    });
  });

  it('generates a route file for Remix v2', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const route = 'custom/path/$handle/index';
      const directories = await createHydrogenFixture(tmpDir, {
        files: [],
        templates: [[route, `const str = "hello world"`]],
      });

      // When
      await generateRoute(route, {
        ...directories,
        v2Flags: {isV2RouteConvention: true},
      });

      // Then
      expect(
        await readFile(
          joinPath(
            directories.appDirectory,
            'routes',
            `custom.path.$handle._index.jsx`,
          ),
        ),
      ).toContain(`const str = 'hello world'`);
    });
  });

  it('produces a typescript file when typescript argument is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const route = 'pages/$pageHandle';
      const directories = await createHydrogenFixture(tmpDir, {
        files: [],
        templates: [[route, 'const str = "hello typescript"']],
      });

      // When
      await generateRoute(route, {
        ...directories,
        typescript: true,
      });

      // Then
      expect(
        await readFile(
          joinPath(directories.appDirectory, 'routes', `${route}.tsx`),
        ),
      ).toContain(`const str = 'hello typescript'`);
    });
  });

  it('prompts the user if there the file already exists', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockImplementationOnce(
        async () => true,
      );

      const route = 'page/$pageHandle';
      const directories = await createHydrogenFixture(tmpDir, {
        files: [[`app/routes/${route}.jsx`, 'const str = "I exist"']],
        templates: [[route, 'const str = "hello world"']],
      });

      // When
      await generateRoute(route, directories);

      // Then
      expect(renderConfirmationPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already exists'),
        }),
      );
    });
  });

  it('does not prompt the user if the force property is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      vi.mocked(renderConfirmationPrompt).mockImplementationOnce(
        async () => true,
      );

      const route = 'page/$pageHandle';
      const directories = await createHydrogenFixture(tmpDir, {
        files: [[`app/routes/${route}.jsx`, 'const str = "I exist"']],
        templates: [[route, 'const str = "hello world"']],
      });

      // When
      await generateRoute(route, {
        ...directories,
        force: true,
      });

      // Then
      expect(renderConfirmationPrompt).not.toHaveBeenCalled();
    });
  });
});

async function createHydrogenFixture(
  directory: string,
  {
    files,
    templates,
  }: {files: [string, string][]; templates: [string, string][]} = {
    files: [],
    templates: [],
  },
) {
  const projectDir = 'project';

  for (const item of files) {
    const [filePath, fileContent] = item;
    const fullFilePath = joinPath(directory, projectDir, filePath);
    await mkdir(dirname(fullFilePath));
    await writeFile(fullFilePath, fileContent);
  }

  for (const item of templates) {
    const [filePath, fileContent] = item;
    const fullFilePath = getRouteFile(filePath, directory);
    await mkdir(dirname(fullFilePath));
    await writeFile(fullFilePath, fileContent);
  }

  return {
    rootDirectory: joinPath(directory, projectDir),
    appDirectory: joinPath(directory, projectDir, 'app'),
    templatesRoot: directory,
  };
}
