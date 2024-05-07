import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { remove, createSymlink } from 'fs-extra/esm';
import { writeFile } from '@shopify/cli-kit/node/fs';
import { joinPath } from '@shopify/cli-kit/node/path';
import { getRepoNodeModules } from '../build.js';

const { renderTasksHook } = vi.hoisted(() => ({ renderTasksHook: vi.fn() }));
vi.mock("../template-downloader.js", async () => ({
  downloadMonorepoTemplates: () => Promise.resolve({
    version: "",
    templatesDir: fileURLToPath(
      new URL("../../../../../templates", import.meta.url)
    ),
    examplesDir: fileURLToPath(
      new URL("../../../../../examples", import.meta.url)
    )
  }),
  downloadExternalRepo: () => Promise.resolve({
    templateDir: fileURLToPath(
      new URL("../../../../../templates/skeleton", import.meta.url)
    )
  })
}));
vi.mock("@shopify/cli-kit/node/ui", async () => {
  const original = await vi.importActual("@shopify/cli-kit/node/ui");
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
    renderSelectPrompt: vi.fn(),
    renderTextPrompt: vi.fn(),
    renderTasks: vi.fn(async (args) => {
      await original.renderTasks(args);
      renderTasksHook();
    })
  };
});
vi.mock(
  "@shopify/cli-kit/node/node-package-manager",
  async (importOriginal) => {
    const original = await importOriginal();
    return {
      ...original,
      getPackageManager: () => Promise.resolve("npm"),
      packageManagerFromUserAgent: () => "npm",
      installNodeModules: vi.fn(async ({ directory }) => {
        renderTasksHook.mockImplementationOnce(async () => {
          await writeFile(`${directory}/package-lock.json`, "{}");
        });
        await remove(joinPath(directory, "node_modules")).catch(() => {
        });
        await createSymlink(
          await getRepoNodeModules(),
          joinPath(directory, "node_modules")
        );
      })
    };
  }
);
vi.mock("./common.js", async (importOriginal) => {
  const original = await importOriginal();
  return Object.keys(original).reduce((acc, item) => {
    const key = item;
    const value = original[key];
    if (typeof value === "function") {
      acc[key] = vi.fn(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
});
