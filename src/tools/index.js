// src/tools/index.js
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
