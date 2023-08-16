const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('github-token');
    const prNumber = core.getInput('pr-number');
    const body = core.getInput('comment');
    const octokit = github.getOctokit(token);

    await octokit.rest.issues.createComment({
       owner: github.context.repo.owner,
       repo: github.context.repo.repo,
       issue_number: prNumber,
       body,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
