import {adminRequest, type AdminSession} from './client.js';

export const FetchJobQuery = `#graphql
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

interface JobError {
  code: string;
  message: string | undefined;
}

export interface JobSchema {
  hydrogenStorefrontJob: {
    id: string;
    done: boolean;
    errors: JobError[];
  };
}

export async function fetchJob(adminSession: AdminSession, jobId: string) {
  const {hydrogenStorefrontJob} = await adminRequest<JobSchema>(
    FetchJobQuery,
    adminSession,
    {id: jobId},
  );

  return hydrogenStorefrontJob;
}

export function waitForJob(adminSession: AdminSession, jobId: string) {
  return new Promise<void>((resolve, reject) => {
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
