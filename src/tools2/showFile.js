// src/tools2/showFile.js
import fs from 'fs/promises';
import path from 'path';
import execMulti from './execShell.js';

showFile.spec = {
    name: 'show_file',
    description: 'Retrieves the full content of the file and some relevant info.',
    parameters: {
        filepath: {
            type: 'string',
            description: 'The path to the file within the working directory.',
        },
    },
};

export default async function showFile({ filepath }) {
    const fullPath = path.resolve(filepath);
    try {
        const content = await fs.readFile(fullPath, 'utf8');
        const info = await execMulti(`git diff ${filepath}`, `git log -n 5 ${filepath}`, `prettier -c ${filepath}`);
        return { content, info };
    } catch (error) {
        throw error; // Rethrow the error to be handled by the caller
    }
}
