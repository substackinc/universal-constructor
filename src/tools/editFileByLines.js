// src/tools/editFileByLines.js
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

editFileByLines.spec = {
    name: editFileByLines.name,
    description:
        'Replaces a specific range of lines within a file. Will replace inclusively everything from the start line to end line.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The relative path to the file where the replacement should occur.',
            },
            range: {
                type: 'string',
                pattern: '^d+-d+$',
                description: 'The range of line numbers to replace, formatted as "start-end".',
            },
            replacement: {
                type: 'string',
                description: 'The text content (discluding line numbers) that should replace the target lines.',
            },
        },
        required: ['filepath', 'range', 'replacement'],
    },
};

export default async function editFileByLines({ filepath, range, replacement }) {
    console.log('Editing by lines', filepath);
    const fullPath = path.resolve(filepath);

    console.log('Replacing with: ', replacement);

    const exists = existsSync(fullPath);
    if (!exists) {
        throw new Error(`File not found at ${fullPath}`);
    }

    const fileContents = await fs.readFile(fullPath, 'utf8');

    const [start, end] = range.split('-').map(Number);
    const lines = fileContents.split('\n');

    const toInsert = replacement.split('\n');

    let updatedFileContents = [...lines.slice(0, start - 1), ...toInsert, ...lines.slice(end)].join('\n');

    await fs.writeFile(fullPath, updatedFileContents, 'utf8');
    return {
        success: true,
        previousContent: fileContents,
        updatedContent: updatedFileContents,
    };
}
