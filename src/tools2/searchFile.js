// src/tools2/searchFile.js
import fs from 'fs/promises';
import path from 'path';

searchFile.spec = {
    name: 'search_file',
    description: 'Searches for a string in a file and returns all matches.',
    parameters: {
        filepath: {
            type: 'string',
            description: 'The path to the file within the working directory.',
        },
        search: {
            type: 'string',
            description: 'The search string to find in the file.',
        },
    },
};

function sliceLines(str, lines) {
    return str.split('\n').slice(lines).join('\n');
}

export default async function searchFile({ filepath, search }) {
    const fullPath = path.resolve(filepath);
    const fileContent = await fs.readFile(fullPath, 'utf8');
    const splitContent = fileContent.split(search);
    let matches = [];

    splitContent.forEach((left, index) => {
        if (index + 1 < splitContent.length) {
            const right = splitContent[index + 1];
            matches.push({
                // Include search term in bold
                found: `${sliceLines(left, -1)}\u001b[1m${search}\u001b[22m${sliceLines(right, 1)}`,
                context: `${sliceLines(left, -5)}${search}${sliceLines(right, 5)}`,
            });
        }
    });

    return {
        success: true,
        filepath,
        search,
        matchCount: matches.length,
        matches,
    };
}
