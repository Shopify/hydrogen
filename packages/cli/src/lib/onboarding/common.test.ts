import './setup-template.mocks.js';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  inTemporaryDirectory,
  writeFile,
  mkdir,
  fileExists,
  readdir,
} from '@shopify/cli-kit/node/fs';
import {
  renderConfirmationPrompt,
  renderTextPrompt,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {handleProjectLocation, createAbortHandler} from './common.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {execAsync} from '../process.js';

vi.mock('@shopify/cli-kit/node/ui');

describe('handleProjectLocation', () => {
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preserving .git directory', () => {
    it('preserves .git/ directory when user confirms deletion in non-empty directory', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create a .git directory with some content
        const gitDir = joinPath(projectDir, '.git');
        await mkdir(gitDir);
        await writeFile(joinPath(gitDir, 'HEAD'), 'ref: refs/heads/main');
        await writeFile(
          joinPath(gitDir, 'config'),
          '[core]\nrepositoryformatversion = 0',
        );

        // Create other files that should be deleted
        await writeFile(joinPath(projectDir, 'existing-file.txt'), 'content');
        await mkdir(joinPath(projectDir, 'existing-dir'));
        await writeFile(
          joinPath(projectDir, 'existing-dir', 'nested.txt'),
          'nested content',
        );

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeDefined();

        // .git directory should still exist
        await expect(fileExists(gitDir)).resolves.toBe(true);
        await expect(fileExists(joinPath(gitDir, 'HEAD'))).resolves.toBe(true);
        await expect(fileExists(joinPath(gitDir, 'config'))).resolves.toBe(
          true,
        );

        // Other files should be deleted
        await expect(
          fileExists(joinPath(projectDir, 'existing-file.txt')),
        ).resolves.toBe(false);
        await expect(
          fileExists(joinPath(projectDir, 'existing-dir')),
        ).resolves.toBe(false);

        // Verify the confirmation message mentions .git preservation
        expect(renderConfirmationPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('.git'),
          }),
        );
      });
    });

    it('preserves .git file (gitfile/submodule worktree) when user confirms deletion', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create a .git file (gitfile pointing to actual git directory)
        await writeFile(
          joinPath(projectDir, '.git'),
          'gitdir: /path/to/actual/git/dir',
        );

        // Create other files that should be deleted
        await writeFile(joinPath(projectDir, 'existing-file.txt'), 'content');

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeDefined();

        // .git file should still exist
        await expect(fileExists(joinPath(projectDir, '.git'))).resolves.toBe(
          true,
        );
        const gitContent = await readFile(joinPath(projectDir, '.git'));
        expect(gitContent).toContain('gitdir:');

        // Other files should be deleted
        await expect(
          fileExists(joinPath(projectDir, 'existing-file.txt')),
        ).resolves.toBe(false);
      });
    });

    it('removes all contents when no .git is present (regression test)', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create files that should all be deleted
        await writeFile(joinPath(projectDir, 'file1.txt'), 'content1');
        await writeFile(joinPath(projectDir, 'file2.txt'), 'content2');
        await mkdir(joinPath(projectDir, 'dir1'));
        await writeFile(joinPath(projectDir, 'dir1', 'nested.txt'), 'nested');

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeDefined();

        // All files should be deleted
        await expect(
          fileExists(joinPath(projectDir, 'file1.txt')),
        ).resolves.toBe(false);
        await expect(
          fileExists(joinPath(projectDir, 'file2.txt')),
        ).resolves.toBe(false);
        await expect(fileExists(joinPath(projectDir, 'dir1'))).resolves.toBe(
          false,
        );

        // Directory should be empty
        const entries = await readdir(projectDir);
        expect(entries).toHaveLength(0);
      });
    });

    it('does not mention .git in confirmation message when no .git exists', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create files but NO .git
        await writeFile(joinPath(projectDir, 'file.txt'), 'content');

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

        await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        // The confirmation message should NOT mention .git
        expect(renderConfirmationPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.not.stringContaining('.git'),
          }),
        );
      });
    });

    it('preserves .git with --force flag (no prompt)', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create a .git directory
        const gitDir = joinPath(projectDir, '.git');
        await mkdir(gitDir);
        await writeFile(joinPath(gitDir, 'HEAD'), 'ref: refs/heads/main');

        // Create other files
        await writeFile(joinPath(projectDir, 'existing-file.txt'), 'content');

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: true,
        });

        expect(result).toBeDefined();

        // .git should still exist
        await expect(fileExists(gitDir)).resolves.toBe(true);

        // Other files should be deleted
        await expect(
          fileExists(joinPath(projectDir, 'existing-file.txt')),
        ).resolves.toBe(false);

        // Should not have prompted
        expect(renderConfirmationPrompt).not.toHaveBeenCalled();
      });
    });

    it('skips confirmation prompt when directory contains only .git', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create only a .git directory
        const gitDir = joinPath(projectDir, '.git');
        await mkdir(gitDir);
        await writeFile(joinPath(gitDir, 'HEAD'), 'ref: refs/heads/main');

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeDefined();

        // .git should still exist
        await expect(fileExists(gitDir)).resolves.toBe(true);

        // Directory should only contain .git
        const entries = await readdir(projectDir);
        expect(entries).toEqual(['.git']);

        // Should NOT have prompted since the directory only contains .git
        expect(renderConfirmationPrompt).not.toHaveBeenCalled();
      });
    });

    it('does not delete anything when user declines confirmation', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Create a .git directory and other files
        const gitDir = joinPath(projectDir, '.git');
        await mkdir(gitDir);
        await writeFile(joinPath(gitDir, 'HEAD'), 'ref: refs/heads/main');
        await writeFile(joinPath(projectDir, 'existing-file.txt'), 'content');

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeUndefined();

        // Nothing should be deleted
        await expect(fileExists(gitDir)).resolves.toBe(true);
        await expect(
          fileExists(joinPath(projectDir, 'existing-file.txt')),
        ).resolves.toBe(true);
      });
    });

    it('preserves existing git repo and adds scaffold commit on top', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Initialize a real git repo with commits
        await execAsync('git init', {cwd: projectDir});
        await execAsync('git config user.name "Test User"', {cwd: projectDir});
        await execAsync('git config user.email "test@example.com"', {
          cwd: projectDir,
        });
        await writeFile(
          joinPath(projectDir, 'original.txt'),
          'original content',
        );
        await execAsync('git add .', {cwd: projectDir});
        await execAsync('git commit -m "Initial commit"', {cwd: projectDir});

        // Add another commit
        await writeFile(joinPath(projectDir, 'second.txt'), 'second content');
        await execAsync('git add .', {cwd: projectDir});
        await execAsync('git commit -m "Second commit"', {cwd: projectDir});

        // Get the commit count before scaffolding
        const {stdout: beforeLog} = await execAsync('git log --oneline', {
          cwd: projectDir,
        });
        const commitsBefore = beforeLog.split('\n').filter(Boolean).length;
        expect(commitsBefore).toBe(2);

        vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

        const result = await handleProjectLocation({
          path: projectDir,
          controller,
          force: false,
        });

        expect(result).toBeDefined();

        // .git should still exist
        const gitDir = joinPath(projectDir, '.git');
        await expect(fileExists(gitDir)).resolves.toBe(true);

        // Original files should be gone (cleared by handleProjectLocation)
        await expect(
          fileExists(joinPath(projectDir, 'original.txt')),
        ).resolves.toBe(false);
        await expect(
          fileExists(joinPath(projectDir, 'second.txt')),
        ).resolves.toBe(false);

        // The git history should still have the original commits
        const {stdout: afterLog} = await execAsync('git log --oneline', {
          cwd: projectDir,
        });
        const commitsAfter = afterLog.split('\n').filter(Boolean);

        // Should still have the 2 original commits
        expect(commitsAfter.length).toBeGreaterThanOrEqual(2);
        expect(afterLog).toContain('Initial commit');
        expect(afterLog).toContain('Second commit');
      });
    });

    it('createInitialCommit works with existing git repo', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const projectDir = joinPath(tmpDir, 'test-project');
        await mkdir(projectDir);

        // Initialize a real git repo with commits
        await execAsync('git init', {cwd: projectDir});
        await execAsync('git config user.name "Test User"', {cwd: projectDir});
        await execAsync('git config user.email "test@example.com"', {
          cwd: projectDir,
        });
        await writeFile(
          joinPath(projectDir, 'original.txt'),
          'original content',
        );
        await execAsync('git add .', {cwd: projectDir});
        await execAsync('git commit -m "Original commit"', {cwd: projectDir});

        // Get commit count before
        const {stdout: beforeLog} = await execAsync('git log --oneline', {
          cwd: projectDir,
        });
        const commitsBefore = beforeLog.split('\n').filter(Boolean).length;
        expect(commitsBefore).toBe(1);

        // Add new files and call createInitialCommit
        await writeFile(joinPath(projectDir, 'new-file.txt'), 'new content');
        const {createInitialCommit} = await import('./common.js');
        await createInitialCommit(projectDir);

        // Verify git history is preserved and new commit added
        const {stdout: afterLog} = await execAsync('git log --oneline', {
          cwd: projectDir,
        });
        const commitsAfter = afterLog.split('\n').filter(Boolean);

        // Should have 2 commits now (original + scaffold)
        expect(commitsAfter.length).toBe(2);
        expect(afterLog).toContain('Original commit');
        expect(afterLog).toContain('Scaffold Storefront');

        // .gitignore should exist (created by createInitialCommit)
        await expect(
          fileExists(joinPath(projectDir, '.gitignore')),
        ).resolves.toBe(true);
      });
    });
  });
});

async function readFile(path: string): Promise<string> {
  const {readFile: fsReadFile} = await import('node:fs/promises');
  return fsReadFile(path, 'utf-8');
}

describe('createAbortHandler', () => {
  let controller: AbortController;
  const originalProcessExit = process.exit;

  beforeEach(() => {
    controller = new AbortController();
    vi.clearAllMocks();
    // Mock process.exit to prevent test termination
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exit = originalProcessExit;
  });

  it('preserves .git directory on abort', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const projectDir = joinPath(tmpDir, 'test-project');
      await mkdir(projectDir);

      // Create a .git directory
      const gitDir = joinPath(projectDir, '.git');
      await mkdir(gitDir);
      await writeFile(joinPath(gitDir, 'HEAD'), 'ref: refs/heads/main');

      // Create scaffolded files that should be cleaned up
      await writeFile(joinPath(projectDir, 'package.json'), '{}');
      await mkdir(joinPath(projectDir, 'app'));
      await writeFile(joinPath(projectDir, 'app', 'root.tsx'), '// root');

      const abort = createAbortHandler(controller, {directory: projectDir});

      // Simulate an abort error
      const error = new Error('Simulated failure') as any;
      error.tryMessage = 'Try again';

      try {
        await abort(error);
      } catch {
        // Expected - abort throws or exits
      }

      // .git should still exist
      await expect(fileExists(gitDir)).resolves.toBe(true);
      await expect(fileExists(joinPath(gitDir, 'HEAD'))).resolves.toBe(true);

      // Scaffolded files should be cleaned up
      await expect(
        fileExists(joinPath(projectDir, 'package.json')),
      ).resolves.toBe(false);
      await expect(fileExists(joinPath(projectDir, 'app'))).resolves.toBe(
        false,
      );
    });
  });
});
