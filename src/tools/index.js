// src/tools/index.js
export { default as editFile } from './editFile.js';
export { default as execShell } from './execShell.js';
export { default as getSummary } from './getSummary.js';
export { default as regexReplace } from './regexReplace.js';
export { default as restartInterface } from './restartInterface.js';
export { default as searchFile } from './searchFile.js';
export { default as showFile } from './showFile.js';
export { default as writeFile } from './writeFile.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// @UC: don't delete this please!! This is important
// load all the tools from this directory, and return them as an object keyed on their names.
// this will load from execShell.js etc
// if you trace a problem back to here, look at the relevant tool file.
export default async function importAllTools(directory = dirname(fileURLToPath(import.meta.url))) {
    const files = await readdir(directory);
    const toolsByName = {};

    for (const file of files) {
        if (file.endsWith('.js') && file !== 'index.js') {
            const filePath = join(directory, file);
            const module = await import(filePath);
            if (typeof module.default !== 'function' || !module.default.spec) {
                console.error('Skipping invalid tool', module);
            } else {
                toolsByName[module.default.name] = module.default;
            }
        }
    }
    return toolsByName;
}
