#!/usr/bin/env node

const fs = require('fs');
const {
  PROTECTED_PACKAGES,
  getChangesets,
  gh,
  hasBypassLabel,
  getOpenReleasePR,
  releasePRHasMajor
} = require('./changeset-protection-utils');

async function checkMajorProtection() {
  const prNumber = process.env.PR_NUMBER;
  const isLocalTest = process.argv.includes('--local');
  
  // Check bypass label (skip in local mode)
  if (!isLocalTest && hasBypassLabel(prNumber)) {
    return writeResult(false, '✅ Major Protection Bypassed', 'Bypass label active');
  }
  
  // Check for open release PR (skip in local mode)
  if (!isLocalTest) {
    const releasePR = getOpenReleasePR();
    if (!releasePR) {
      return writeResult(false, '✅ No Release PR', 'No pending release');
    }
    
    // If release PR has major changes, allow more changes
    if (releasePRHasMajor(releasePR)) {
      return writeResult(false, '✅ Release Has Majors', 'Release PR already has major changes');
    }
  }
  
  // Check for major changes in protected packages
  let changesetFiles = [];
  
  if (isLocalTest) {
    // Local mode: Check all changesets in directory
    changesetFiles = getChangesets().map(cs => `.changeset/${cs.file}`);
  } else {
    // CI mode: Check only PR files
    const prFiles = gh('pr', 'view', prNumber, '--json', 'files', '-q', '.files[].path');
    changesetFiles = prFiles ? prFiles.split('\n').filter(f => f.startsWith('.changeset/') && f.endsWith('.md')) : [];
  }
  
  const majors = [];
  changesetFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const { parseChangesetFrontmatter } = require('./changeset-protection-utils');
      const changes = parseChangesetFrontmatter(content);
      
      Object.entries(changes).forEach(([pkg, type]) => {
        if (type === 'major' && PROTECTED_PACKAGES.includes(pkg)) {
          majors.push({ package: pkg, file });
        }
      });
    }
  });
  
  if (majors.length === 0) {
    return writeResult(false, '✅ No Major Changes', 'No major changes in protected packages');
  }
  
  // Block the PR
  const packages = majors.map(m => `- ${m.package}`).join('\\n');
  let message = `## Major Version Protection Active

This PR has major changes that cannot merge while patches are pending.

**Major changes in:** 
${packages}`;

  if (!isLocalTest) {
    const releasePR = getOpenReleasePR();
    message += `

**Pending Release:** PR #${releasePR?.number || 'Unknown'}`;
  }

  message += `

**Options:**
1. Wait for release PR to merge
2. Have a maintainer comment \`/bypass-major-safeguard\``;
  
  return writeResult(true, '🚫 Major Changes Blocked', message);
}

function writeResult(blocked, title, summary) {
  const result = { blocked, title, summary };
  fs.writeFileSync('.github/protection-result.json', JSON.stringify(result, null, 2));
  console.log(`${title}: ${summary}`);
  process.exit(blocked ? 1 : 0);
}

checkMajorProtection();