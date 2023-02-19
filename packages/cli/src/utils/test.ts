import {file, path} from '@shopify/cli-kit';

export async function createFixture(
  directory: string,
  files: Record<string, string>,
) {
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(directory, filename);

    await file.write(filePath, content);
  }
}
