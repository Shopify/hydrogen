import { vi } from 'vitest';
import { remove, createSymlink } from 'fs-extra/esm';
import { writeFile } from '@shopify/cli-kit/node/fs';
import { dirname, joinPath } from '@shopify/cli-kit/node/path';
import { getSkeletonSourceDir, getRepoNodeModules } from '../build.js';

const { renderTasksHook } = vi.hoisted(() => ({ renderTasksHook: vi.fn() }));
vi.mock("../template-downloader.js", async () => ({
  downloadMonorepoTemplates: () => Promise.resolve({
    version: "",
    templatesDir: dirname(getSkeletonSourceDir()),
    examplesDir: dirname(getSkeletonSourceDir()).replace(
      "templates",
      "examples"
    )
  }),
  downloadExternalRepo: () => Promise.resolve({
    templateDir: getSkeletonSourceDir()
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
