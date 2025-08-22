#!/usr/bin/env node

const { gh, getOpenReleasePR } = require('./changeset-protection-utils');

async function processBypass() {
  const prNumber = process.env.PR_NUMBER;
  const commenter = process.env.COMMENTER;
  
  // Verify maintainer permissions
  const permission = gh('api', `/repos/${process.env.GITHUB_REPOSITORY}/collaborators/${commenter}/permission`, '-q', '.permission');
  const isMaintainer = permission === 'admin' || permission === 'maintain';
  
  if (!isMaintainer) {
    gh('pr', 'comment', prNumber, '--body', `❌ @${commenter}, you need maintainer permissions to bypass.`);
    return setOutput(false);
  }
  
  // Close release PR if exists
  const releasePR = getOpenReleasePR();
  if (releasePR) {
    gh('pr', 'comment', releasePR.number.toString(), '--body', '🔄 Closing due to bypass');
    gh('pr', 'close', releasePR.number.toString());
  }
  
  // Add bypass label
  gh('pr', 'edit', prNumber, '--add-label', 'major-bypass-active');
  
  // Post success message
  const message = `✅ **Bypass activated by @${commenter}**
${releasePR ? `Closed release PR #${releasePR.number}` : 'No release PR was open'}
This PR can now merge with major changes.`;
  
  gh('pr', 'comment', prNumber, '--body', message);
  
  return setOutput(true);
}

function setOutput(success) {
  console.log(`::set-output name=success::${success}`);
  process.exit(success ? 0 : 1);
}

processBypass();