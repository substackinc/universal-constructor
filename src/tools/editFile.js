// src/tools/editFile.js
import fs from 'fs/promises';
import path from 'path';

editFile.spec = {
    name: editFile.name,
    description:
        'Replaces a specific substring within a file. Will replace the first instance after the start of the specified unique search context.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The relative path to the file where the replacement should occur.',
            },
            uniqueContext: {
                type: 'string',
                description:
                    'The context that shows where in the file to start looking',
            },
            exactTarget: {
                type: 'string',
                description: 'The exact substring to be replaced. Can be multiple lines.',
            },
            replacement: {
                type: 'string',
                description: 'The text that should replace the target substring.',
            },
        },
        required: ['filepath', 'uniqueContext', 'exactTarget', 'replacements'],
    },
};

/*
 * If you're wondering what the heck is goign on with this API:
 * it was actually fairly tricky to get this to be ergonomic for UC
 * it really struggles with line numbers or any type of counting
 *
 * This thing tries to make this ergonomic for UC
 */
export default async function editFile({
                                           filepath,
                                           uniqueContext,
                                           exactTarget,
                                           replacement,
                                       }) {
    console.log('Editing', filepath);
    // console.log('CBTEST ctx', uniqueContext)
    // console.log('CBTEST sbstr', exactTarget)
    // console.log('CBTEST repl', replacement)
    const fullPath = path.resolve(filepath);
    const fileContents = await fs.readFile(fullPath, 'utf8');

    const chunks = fileContents.split(uniqueContext);
    if (chunks.length !== 2) {
        throw new Error('uniqueContext should appear exactly once in file, but found ' + (chunks.length - 1));
    }

    let left = chunks[0];
    let right = uniqueContext + chunks[1];

    if (right.indexOf(exactTarget) === -1) {
        throw new Error('exactTarget found 0 times within or after the context');
    }

    let updatedFileContents = left + right.replace(exactTarget, replacement);

    await fs.writeFile(fullPath, updatedFileContents, 'utf8');
    return {
        success: true,
        previousContent: fileContents,
        updatedContent: updatedFileContents,
    };
}
