// src/tools2/index.js
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export default async function importAllTools(directory = dirname(fileURLToPath(import.meta.url))) {
    const files = await readdir(directory);
    const toolsByName = {};
    const toolSpecs = [];

    for (const file of files) {
        if (file.endsWith('.js') && file !== 'index.js') {
            const filePath = join(directory, file);
            const module = await import(filePath);
            if (typeof module.default !== 'function' || !module.default.spec) {
                console.error('Skipping invalid tool', module);
            } else {
                toolsByName[module.default.name] = module.default;
                toolSpecs.push(module.default.spec);
            }
        }
    }
    return { toolsByName, toolSpecs };
}
