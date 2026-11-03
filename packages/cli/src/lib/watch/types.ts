import {zod} from '@shopify/cli-kit/node/schema';
import {absolutePath} from '../json-contract.js';

export const watchStartedSchema = zod
  .object({type: zod.literal('watch-started'), directory: absolutePath})
  .strict();

export const watchStoppedSchema = zod
  .object({type: zod.literal('watch-stopped')})
  .strict();

export const cycleSchema = zod.number().int().positive();
export const watchErrorSchema = zod
  .object({message: zod.string(), tryMessage: zod.string().optional()})
  .strict();
