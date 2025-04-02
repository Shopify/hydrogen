import {createClient} from '@sanity/client';

export const createSanityClient = (env: Env) =>
  createClient({
    projectId: env.PUBLIC_SANITY_PROJECT_ID,
    dataset: env.PUBLIC_SANITY_DATASET,
    apiVersion: '2024-12-01',
    useCdn: true,
    stega: {
      studioUrl: env.PUBLIC_SANITY_STUDIO_URL,
    },
  });
