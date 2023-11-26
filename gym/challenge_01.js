/**
 * CHALLENGE: Create a new file
 *
 * DESCRIPTION:
 * Use the writeFile function to create a new file named 'greet.txt'
 * in the 'gym/arena' directory with the content 'Hello, World!'.
 *
 * SUCCESS CRITERIA:
 * The challenge is successful if the 'greet.txt' file exists in the 'arena' directory
 * and contains the correct content.
 */

import fs from 'fs';
import path from 'path';

const filePath = path.join(new URL('.', import.meta.url).pathname, 'arena/greet.txt');
const expectedContent = 'Hello, World!';

fs.readFile(filePath, 'utf8', (err, content) => {
  if (err) throw new Error('Challenge failed: File does not exist.');
  if (content !== expectedContent) throw new Error('Challenge failed: Content is incorrect.');
  console.log('Challenge passed: File created with correct content.');
});
