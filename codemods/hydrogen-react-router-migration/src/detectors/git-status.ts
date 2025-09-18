import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface GitStatus {
  hasUncommittedChanges: boolean;
  modifiedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  message?: string;
}

/**
 * Checks if the project has uncommitted changes
 */
export function checkGitStatus(projectRoot: string): GitStatus {
  try {
    // Check if this is a git repository
    const gitDir = path.join(projectRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        message: 'Not a git repository - proceeding without git check'
      };
    }

    // Get git status
    const status = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).trim();

    if (!status) {
      // No changes
      return {
        hasUncommittedChanges: false,
        modifiedFiles: [],
        unstagedFiles: [],
        untrackedFiles: []
      };
    }

    // Parse git status output
    const lines = status.split('\n');
    const modifiedFiles: string[] = [];
    const unstagedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    lines.forEach(line => {
      if (!line) return;
      
      const statusCode = line.substring(0, 2);
      const filename = line.substring(3);

      // Check status codes
      // Ensure we don't add duplicates
      if ((statusCode[0] === 'M' || statusCode[1] === 'M') && !modifiedFiles.includes(filename)) {
        modifiedFiles.push(filename);
      }
      if (statusCode[0] === ' ' && statusCode[1] === 'M' && !unstagedFiles.includes(filename)) {
        unstagedFiles.push(filename);
      }
      if (statusCode === '??' && !untrackedFiles.includes(filename)) {
        untrackedFiles.push(filename);
      }
      if (statusCode[0] === 'A' && !modifiedFiles.includes(filename)) {
        modifiedFiles.push(filename); // Added files
      }
      if ((statusCode[0] === 'D' || statusCode[1] === 'D') && !modifiedFiles.includes(filename)) {
        modifiedFiles.push(filename); // Deleted files
      }
    });

    const hasUncommittedChanges = modifiedFiles.length > 0 || 
                                  unstagedFiles.length > 0;

    return {
      hasUncommittedChanges,
      modifiedFiles,
      unstagedFiles,
      untrackedFiles
    };
  } catch (error) {
    // Git command failed
    return {
      hasUncommittedChanges: false,
      modifiedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      message: `Could not check git status: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Formats an error message for uncommitted changes
 */
export function formatGitStatusError(status: GitStatus): string {
  const sections: string[] = [];

  sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  sections.push('⚠️  Uncommitted changes detected');
  sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  sections.push('');
  sections.push('This codemod will modify multiple files. Please commit or stash your changes first.');
  sections.push('');

  if (status.modifiedFiles.length > 0) {
    sections.push('Modified files:');
    status.modifiedFiles.slice(0, 10).forEach(file => {
      sections.push(`  • ${file}`);
    });
    if (status.modifiedFiles.length > 10) {
      sections.push(`  ... and ${status.modifiedFiles.length - 10} more`);
    }
    sections.push('');
  }

  if (status.unstagedFiles.length > 0) {
    sections.push('Unstaged changes:');
    status.unstagedFiles.slice(0, 10).forEach(file => {
      sections.push(`  • ${file}`);
    });
    if (status.unstagedFiles.length > 10) {
      sections.push(`  ... and ${status.unstagedFiles.length - 10} more`);
    }
    sections.push('');
  }

  sections.push('To proceed, you can:');
  sections.push('');
  sections.push('  1. Commit your changes:');
  sections.push('     git add .');
  sections.push('     git commit -m "WIP: Save work before codemod"');
  sections.push('');
  sections.push('  2. Or stash your changes:');
  sections.push('     git stash');
  sections.push('');
  sections.push('  3. Or discard your changes (⚠️  destructive):');
  sections.push('     git reset --hard');
  sections.push('');
  sections.push('After the codemod completes, you can restore stashed changes with:');
  sections.push('  git stash pop');
  sections.push('');
  sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return sections.join('\n');
}