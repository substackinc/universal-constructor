// src/tools/editFile.js
import fs from 'fs/promises';
import path from 'path';

editFile.spec = {
    name: editFile.name,
    description:
        'Replaces a specific substring within a given search context in a file, ensuring that the context appears only once.',
    parameters: {
        type: 'object',
        properties: {
            filepath: {
                type: 'string',
                description: 'The relative path to the file where the replacement should occur.',
            },
            editContext: {
                type: 'string',
                description:
                    'The surrounding context where the target substring is located. This should literally appear exaclty once in the file.',
            },
            targetSubstring: {
                type: 'string',
                description: 'The exact substring within the search context that needs to be replaced. Can be multiple lines.',
            },
            replacement: {
                type: 'string',
                description: 'The text that should replace the target substring.',
            },
        },
    },
};

/*
 * If you're wondering what the heck is goign on with this API:
 * it was actually fairly tricky to get this to be ergonomic for UC
 * it really struggles with line numbers or any type of counting
 *
 * This thing is basically: give me a literal window of context, and
 * replace within it. The context has to be unique, so it prevents the
 * a lot of common pitfalls.
 */
export default async function editFile({filepath, editContext, targetSubstring, replacement}) {
    console.log('Editing', filepath);
    // console.log('CBTEST ctx', editContext)
    // console.log('CBTEST sbstr', targetSubstring)
    // console.log('CBTEST repl', replacement)
    const fullPath = path.resolve(filepath);
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const searchContextIndex = fileContents.indexOf(editContext);
    if (searchContextIndex === -1) {
        throw new Error('editContext not found in file');
    } else if (searchContextIndex !== fileContents.lastIndexOf(editContext)) {
        throw new Error('editContext found more than once in the file');
    }

    const targetSubstringIndex = editContext.indexOf(targetSubstring);
    if (targetSubstringIndex === -1) {
        throw new Error('targetSubstring does not appear in the editContext');
    } else if (targetSubstringIndex !== editContext.lastIndexOf(targetSubstring)) {
        throw new Error('targetSubstring appears more than once in the editContext');
    }

    let editedContext = editContext.replace(targetSubstring, replacement);
    let updatedFileContents = fileContents.replace(editContext, editedContext);

    await fs.writeFile(fullPath, updatedFileContents, 'utf8');
    return {
        success: true,
        updatedContent: updatedFileContents,
    };
}
