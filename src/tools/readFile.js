// src/tools/readFile.js
import fs from 'fs/promises';
import path from 'path';

readFile.spec = {
    name: readFile.name,
    description: 'Retrieves the full content of the file and some relevant info. Line numbers are artifially added to the content.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The path to the file within the working directory.',
            },
            range: {
                type: 'string',
                pattern: '^d+-d+$',
                description: 'Optional. A range of line numbers to read, formatted as "start-end".',
            },
        },
        required: ['filepath'],
    },
};

export default async function readFile({ filepath, range, omitLineNumbers = false }) {
    console.log(`Reading ${filepath}${range ? ` Lines: ${range}` : ''}`);
    const fullPath = path.resolve(filepath);
    try {
        let content = await fs.readFile(fullPath, 'utf8');
        if (omitLineNumbers) {
            if (range) {
                const [start, end] = range.split('-').map(Number);
                const lines = content.split('\n');
                content = lines.slice(start - 1, end).join('\n');
            }
            return { content };
        }
        content = addLineNumbers(content);
        if (range) {
            const [start, end] = range.split('-').map(Number);
            const lines = content.split('\n');
            content = lines.slice(start - 1, end).join('\n');
        }
        return {
            content,
        };
    } catch (error) {
        throw error; // Rethrow the error to be handled by the caller
    }
}

function addLineNumbers(content) {
    const withNumbers = content.split('\n').map((l, i) => {
        return `${i + 1}   ${l}`;
    });

    return withNumbers.join('\n');
}
