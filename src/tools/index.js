// src/tools/index.js
export { default as editFileBySubstring } from './editFileBySubstring.js';
export { default as editFileByLines } from './editFileByLines.js';
export { default as execShell } from './execShell.js';
export { default as getSummary } from './getSummary.js';
export { default as regexReplace } from './regexReplace.js';
export { default as restartInterface } from './restartInterface.js';
export { default as searchFile } from './searchFile.js';
export { default as readFile } from './readFile.js';
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
            let toolsFound = 0;
            for (let k of Object.keys(module)) {
                if (typeof module[k] === 'function' && module[k].spec && !module[k].spec.exclude) {
                    const name = module[k].name;
                    if (toolsByName[name]) {
                        throw new Error('Duplicate tool name: ' + name);
                    }
                    toolsByName[name] = module[k];
                    toolsFound++;
                }
            }
            if (toolsFound === 0) {
                console.error(`No valid tools found in ${file}. Did you forget the spec?`);
            }
        }
    }
    return toolsByName;
}
