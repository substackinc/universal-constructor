// src/tools2/searchFile.js

searchFile.spec = {
    name: 'search_file',
    description: 'Searches for a string in a file and returns all matches with context.',
    parameters: {
        filepath: {
            type: 'string',
            description: 'The path to the file within the working directory.',
        },
        search: {
            type: 'string',
            description: 'The search string to find in the file.',
        },
        contextBefore: {
            type: 'integer',
            description: 'Lines of context to return before the match. (Default 5)',
        },
        contextAfter: {
            type: 'integer',
            description: 'Lines of context to return after the match. (Default 5)',
        },
    },
};

export default async function searchFile({ filepath, search, contextBefore = 5, contextAfter = 5 }) {
    const fs = require('fs').promises;
    const escapeStringRegexp = require('escape-string-regexp');
    // Tool implementation
    const fileContent = await fs.readFile(filepath, 'utf8');
    const searchRegex = new RegExp(
        `(?:.*\\n){0,${contextBefore}}(.*${escapeStringRegexp(search)}.*)(?:\\n.*){0,${contextAfter}}`,
        'gi'
    );
    let matches = [];
    let match;
    while ((match = searchRegex.exec(fileContent)) !== null) {
        let [context, line] = match;
        matches.push({ line, context });
    }
    return {
        success: true,
        filepath,
        search,
        matches,
    };
}
