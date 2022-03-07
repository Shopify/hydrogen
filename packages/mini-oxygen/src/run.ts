#!/usr/bin/env npx ts-node

import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {preview} from './preview';
import {configFileName, MiniOxygenPreviewOptions} from "./preview";

const cwd = process.cwd()
let configOptions = {};

try {
    const configFilePath = join(cwd, configFileName);
    if (existsSync(configFilePath)) {
        const data = readFileSync(configFilePath, {
            encoding: 'utf-8'
        });
        configOptions = JSON.parse(data) as unknown as MiniOxygenPreviewOptions;
    }
} catch (e) {
    console.error(`Cannot load mini-oxygen:\n${e}`);
    process.exit(1)
}

preview(configOptions).catch((e: unknown) => console.error(e));
