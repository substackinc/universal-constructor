// src/tools2/replaceInFile.js
import fs from 'fs/promises';
import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';

replaceInFile.spec = {
  name: 'replaceInFile',
  description: 'Replaces a specific substring within a given search context in a file, ensuring that the context appears only once.',
  parameters: {
    filepath: {
      type: 'string',
      description: 'The relative path to the file where the replacement should occur.',
    },
    searchContext: {
      type: 'string',
      description: 'The surrounding context where the target substring is located. This should appear exactly once in the file.',
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
  let fileContents = await fs.readFile(fullPath, 'utf8');
  const regex = new RegExp(escapeStringRegexp(searchContext), 'g');
  if (!regex.test(fileContents)) {
    throw new Error(`The search context:\n${searchContext}\nwas not found in the file.`);
  }
  fileContents = fileContents.replace(new RegExp(escapeStringRegexp(targetSubstring), 'g'), replacement);
  await fs.writeFile(fullPath, fileContents, 'utf8');
  return {
    success: true,
    updatedContent: fileContents,
  };
}
