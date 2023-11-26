import test from 'ava';
import replaceInFile from '../../src/tools2/replaceInFile.js';
import fs from 'fs/promises';
import path from 'path';

const testDir = path.resolve('test/tmp');
const testFile = path.join(testDir, 'testReplaceInFile.tmp.txt');

// Creating a temporary test file before the tests
test.before(async () => {
  await fs.writeFile(testFile, 'Hello World', 'utf8');
});

// Cleanup: remove the temporary file and directory after the tests
test.after.always(async () => {
  await fs.unlink(testFile);
  await fs.rmdir(testDir);
});

test('replaceInFile replaces a string within a file', async t => {
  await replaceInFile({
    filepath: testFile,
    searchContext: 'Hello World',
    targetSubstring: 'World',
    replacement: 'AVA'
  });
  const content = await fs.readFile(testFile, 'utf8');
  t.is(content, 'Hello AVA', 'Content should be replaced correctly');
});
