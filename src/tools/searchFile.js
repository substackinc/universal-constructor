// src/tools/searchFile.js
import fs from 'fs/promises';
import path from 'path';

searchFile.spec = {
    name: searchFile.name,
    description: 'Searches for a string in a file and returns all matches.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The path to the file within the working directory.',
            },
            search: {
                type: 'string',
                description: 'The search string to find in the file.',
            },
        },
        required: ['filepath', 'search']
    },
};

function sliceLinesRight(str, nlines) {
    return str.split('\n').slice(-nlines).join('\n');
}

function sliceLinesLeft(str, nlines) {
    return str.split('\n').slice(0, nlines).join('\n');
}

export default async function searchFile({ filepath, search }) {
    console.log(`Searching ${filepath} for ${search}`);
    const fullPath = path.resolve(filepath);
    const fileContent = await fs.readFile(fullPath, 'utf8');
    const splitContent = fileContent.split(search);
    let matches = [];

    splitContent.forEach((left, index) => {
        if (index + 1 < splitContent.length) {
            const right = splitContent[index + 1];
            matches.push({
                // Include search term in bold
                found: `${sliceLinesRight(left, 1)}\u001b[1m${search}\u001b[22m${sliceLinesLeft(right, 1)}`,
                context: `${sliceLinesRight(left, 5)}${search}${sliceLinesLeft(right, 50)}`,
            });
        }
    });

    //console.log(matches);

    return {
        success: true,
        filepath,
        search,
        matchCount: matches.length,
        matches,
    };
}
