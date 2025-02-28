import fs from 'fs';
import path from 'path';
import {COOKBOOK_PATH} from './constants';

export function listRecipes(): string[] {
  return fs
    .readdirSync(path.join(COOKBOOK_PATH, 'recipes'), {withFileTypes: true})
    .filter((file) => file.isDirectory())
    .map((file) => file.name);
}
