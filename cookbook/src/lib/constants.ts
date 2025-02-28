import path from 'path';
import {getRepoRoot} from './util';

/**
 * The root directory of the repository.
 */
export const REPO_ROOT = getRepoRoot();

/**
 * The directory of the template.
 */
export const TEMPLATE_DIRECTORY = 'templates/skeleton/';

/**
 * The path of the template.
 */
export const TEMPLATE_PATH = path.join(REPO_ROOT, TEMPLATE_DIRECTORY);

/**
 * The directory of the cookbook.
 */
export const COOKBOOK_PATH = path.join(REPO_ROOT, 'cookbook');

/**
 * The files to ignore for generate.
 */
export const FILES_TO_IGNORE_FOR_GENERATE = ['.env'];

/**
 * The file name of the github README.
 */
export const RENDER_FILENAME_GITHUB = 'README.md';

/**
 * The file name of the shopify README.
 */
export const RENDER_FILENAME_SHOPIFY = 'README.shopify.md';
