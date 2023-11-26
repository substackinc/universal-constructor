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
    }
  }
};

export default async function searchFile({ filepath, search }) {
  const fullPath = path.resolve(filepath);
  const fileContent = await fs.readFile(fullPath, 'utf8');
  const splitContent = fileContent.split(search);
  let matches = [];

  splitContent.forEach((content, index) => {
    if (index < splitContent.length - 1) { // Ignore the last split part as it won't be followed by the search term
      const startContext = content.length > 30 ? content.slice(-30) : content;
      const endContextIndex = splitContent[index + 1].length > 30 ? 30 : splitContent[index + 1].length;
      const endContext = splitContent[index + 1].slice(0, endContextIndex);
      matches.push({
        found: `${startContext}\u001b[1m${search}\u001b[22m${endContext}`, // Include search term in bold
        context: `${content.slice(-100)}${search}${splitContent[index + 1].slice(0, 100)}` // Provide 100 chars of context
      });
    }
  });

  return {
    success: true,
    filepath,
    search,
    matches,
  };
}
