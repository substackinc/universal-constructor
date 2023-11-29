// src/tools/writeFile.js
import fs from 'fs/promises';
import path from 'path';

writeFile.spec = {
    name: writeFile.name,
    description: 'Writes content to a specified file, replacing its contents, within the working directory',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The relative path to the file within the working directory',
            },
            content: {
                type: 'string',
                description: 'The content to write to the file',
            },
        },
    },
};

export default async function writeFile({ filepath, content }) {
    const dir = path.dirname(filepath);
    // Ensure the directory exists before attempting to write the file
    await fs.mkdir(dir, { recursive: true });

    const fullPath = path.resolve(filepath);
    let oldContent = '';
    console.log(oldContent ? 'Overwriting' : 'Writing to', filepath);
    try {
        oldContent = await fs.readFile(fullPath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error; // If the error is not file not found, rethrow it
    }
    await fs.writeFile(fullPath, content, 'utf8');
    return {
        success: true,
        oldContent,
        newContent: content,
    };
}
