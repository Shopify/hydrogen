import {adminRequest} from '../../graphql.js';
import {getAdminSession} from '../../admin-session.js';

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

export async function fetchJob(shop: string, jobId: string) {
  const adminSession = await getAdminSession(shop);

  const {hydrogenStorefrontJob} = await adminRequest<JobSchema>(
    FetchJobQuery,
    adminSession,
    {
      id: jobId,
    },
  );

  return {
    adminSession,
    id: hydrogenStorefrontJob.id,
    done: hydrogenStorefrontJob.done,
    errors: hydrogenStorefrontJob.errors,
  };
}

export function waitForJob(shop: string, jobId: string) {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      const job = await fetchJob(shop, jobId);

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
