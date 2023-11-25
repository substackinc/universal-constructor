// src/tools2/replaceInFile.js

replaceInFile.spec = {
    name: 'replaceInFile',
    description:
        'Replaces a specific substring within a given search context in a file, ensuring that the context appears only once.',
    parameters: {
        filepath: {
            type: 'string',
            description: 'The relative path to the file where the replacement should occur.',
        },
        searchContext: {
            type: 'string',
            description:
                'The surrounding context where the target substring is located. This should appear exactly once in the file.',
        },
        targetSubstring: {
            type: 'string',
            description: 'The exact substring within the search context that needs to be replaced.',
        },
        replacement: {
            type: 'string',
            description: 'The text that should replace the target substring.',
        },
    },
};

export default async function replaceInFile({ filepath, searchContext, targetSubstring, replacement }) {
    const fs = require('fs').promises;
    const path = require('path');
    const escapeStringRegexp = require('escape-string-regexp');
    // Tool implementation
    const fullPath = path.resolve(workingDirectory, filepath);
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const occurrences = fileContents.match(new RegExp(escapeStringRegexp(searchContext), 'g'));
    if (!occurrences || occurrences.length !== 1) {
        throw new Error('The search context must appear exactly once in the file.');
    }
    const updatedFileContents = fileContents.replace(new RegExp(escapeStringRegexp(targetSubstring), 'g'), replacement);
    await fs.writeFile(fullPath, updatedFileContents, 'utf8');
    return {
        success: true,
    };
}
