// src/tools2/showFile.js

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
    const fs = require('fs').promises;
    const path = require('path');
    // Tool implementation
    const fullPath = path.resolve(workingDirectory, filepath);
    try {
        const content = await fs.readFile(fullPath, 'utf8');
        return {
            content: content,
            // Relevant info would go here
        };
    } catch (error) {
        return { error };
    }
}
