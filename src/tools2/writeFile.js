// src/tools2/writeFile.js

writeFile.spec = {
    name: 'write_file',
    description: 'Writes content to a specified file, replacing its contents, within the working directory',
    parameters: {
        filepath: {
            type: 'string',
            description: 'The relative path to the file within the working directory',
        },
        content: {
            type: 'string',
            description: 'The content to write to the file',
        },
    },
};

export default async function writeFile({ filepath, content }) {
    const fs = require('fs').promises;
    const path = require('path');
    // Tool implementation
    const fullPath = path.resolve(workingDirectory, filepath);
    let oldContent = '';
    try {
        oldContent = await fs.readFile(fullPath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        // File doesn't exist which is fine
    }
    await fs.writeFile(fullPath, content, 'utf8');
    return {
        success: true,
        oldContent: oldContent,
        newContent: content,
    };
}
