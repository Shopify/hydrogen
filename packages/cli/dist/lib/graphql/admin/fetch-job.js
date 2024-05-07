import { adminRequest } from './client.js';

const FetchJobQuery = `#graphql
  query FetchJob($id: ID!) {
    hydrogenStorefrontJob(id: $id) {
      id
      done
      errors {
        code
        message
      }
    }
  }
`;
async function fetchJob(adminSession, jobId) {
  const { hydrogenStorefrontJob } = await adminRequest(
    FetchJobQuery,
    adminSession,
    { id: jobId }
  );
  return hydrogenStorefrontJob;
}
function waitForJob(adminSession, jobId) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const job = await fetchJob(adminSession, jobId);
      if (job.errors.length > 0) {
        clearInterval(interval);
        return reject();
      }
      if (job.done) {
        clearInterval(interval);
        return resolve();
      }
    }, 500);
  });
}

export { FetchJobQuery, fetchJob, waitForJob };
