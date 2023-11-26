// src/tools2/replaceInFile.js
import fs from 'fs/promises';
import path from 'path';

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
    const fullPath = path.resolve(filepath);
    const fileContents = await fs.readFile(fullPath, 'utf8');

    const searchContextIndex = fileContents.indexOf(searchContext);
    if (searchContextIndex === -1) {
        console.log('CBCTEST context', searchContext);
        console.log('CBCTEST fileContent', fileContents);
        throw new Error('searchContext not found in file');
    } else if (searchContextIndex != fileContents.lastIndexOf(searchContext)) {
        throw new Error('searchContext found more than once in the file');
    }

    const targetSubstringIndex = searchContext.indexOf(targetSubstring);
    if (targetSubstringIndex === -1) {
        throw new Error('targetSubstring does not appear in the searchContext');
    } else if (targetSubstringIndex != searchContext.lastIndexOf(targetSubstring)) {
        throw new Error('targetSubstring appears more than once in the searchContext');
    }

    let editedContext = searchContext.replace(targetSubstring, replacement);
    let updatedFileContents = fileContents.replace(searchContext, editedContext);

    await fs.writeFile(fullPath, updatedFileContents, 'utf8');
    return {
        success: true,
        updatedContent: updatedFileContents,
    };
}
