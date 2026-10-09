import {adminRequest, type AdminSession} from './client.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {setTimeout} from 'node:timers/promises';

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

export async function waitForJob(adminSession: AdminSession, jobId: string) {
  while (true) {
    await setTimeout(500);
    const job = await fetchJob(adminSession, jobId);
    if (job.errors.length > 0) {
      throw new AbortError(
        `Storefront setup failed: ${job.errors.map(({message, code}) => message || code).join(', ')}`,
      );
    }
    if (job.done) return;
  }
}
