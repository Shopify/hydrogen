#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Protected packages that trigger major version protection
const PROTECTED_PACKAGES = ['@shopify/hydrogen', '@shopify/hydrogen-react', 'skeleton'];

// Parse changeset frontmatter (shared by all scripts)
function parseChangesetFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/m);
  if (!match) return {};
  
  const changes = {};
  match[1].split('\n').forEach(line => {
    const m = line.match(/^['"]?(.+?)['"]?\s*:\s*(.+)$/);
    if (m) {
      const pkg = m[1].trim().replace(/['"]/g, '');
      const type = m[2].trim().replace(/['"]/g, '');
      if (['major', 'minor', 'patch'].includes(type)) changes[pkg] = type;
    }
  });
  return changes;
}

// Get changesets from directory
function getChangesets(dir = '.changeset') {
  if (!fs.existsSync(dir)) return [];
  
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(file => {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      return { file, changes: parseChangesetFrontmatter(content) };
    })
    .filter(cs => Object.keys(cs.changes).length > 0);
}

// GitHub CLI wrapper (prevents shell injection)
function gh(...args) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

// Check if PR has bypass label
function hasBypassLabel(prNumber) {
  const labels = gh('pr', 'view', prNumber, '--json', 'labels', '-q', '.labels[].name');
  return labels && labels.includes('major-bypass-active');
}

// Get open release PR
function getOpenReleasePR() {
  const result = gh('pr', 'list', '--state', 'open', '--head', 'changeset-release/main', 
                    '--json', 'number,title,body', '--limit', '1');
  if (!result) return null;
  const prs = JSON.parse(result);
  return prs.length > 0 ? prs[0] : null;
}

// Check if release PR has major changes
function releasePRHasMajor(pr) {
  if (!pr?.body) return false;
  const body = pr.body;
  const hasMajorSection = /###\s+Major\s+Changes/i.test(body);
  if (!hasMajorSection) return false;
  
  // Check if protected packages appear in major section
  const majorIndex = body.search(/###\s+Major\s+Changes/i);
  return PROTECTED_PACKAGES.some(pkg => {
    const pkgIndex = body.indexOf(pkg);
    return pkgIndex > majorIndex;
  });
}

module.exports = {
  PROTECTED_PACKAGES,
  parseChangesetFrontmatter,
  getChangesets,
  gh,
  hasBypassLabel,
  getOpenReleasePR,
  releasePRHasMajor
};