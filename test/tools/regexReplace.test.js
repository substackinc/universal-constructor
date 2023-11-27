import test from 'ava';
import { regexReplace } from '../../src/tools/index.js';
import { promises as fsPromises } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
const { writeFile, readFile } = fsPromises;

let i=0
const testDir = path.join(os.tmpdir(), 'replaceInFileTests');
const content = 'Hello World! Hello People! Hello Universe!';

async function setup() {
  let testFile = path.join(testDir, `test_regex_replace.tmp${i++}.txt`);
  await writeFile(testFile, content);
  return {testFile}
}

// Creating a temporary test file before the tests
test.before(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

// Cleanup: remove the temporary file and directory after the tests
test.after.always(async () => {
  await fs.rm(testDir, { force: true, recursive: true });
});

test('regexReplace - replaces content matching a regex pattern without dryRun', async (t) => {
  const {testFile} = await setup();
  const result = await regexReplace({
    regex: /Hello/g,
    filepath: testFile,
    replacement: 'Hi',
    dryRun: false
  });

  const updatedContent = await readFile(testFile, 'utf-8');

  t.true(result.success);
  t.is(result.matchCount, 3);
  t.is(updatedContent, 'Hi World! Hi People! Hi Universe!');
});

test('regexReplace - dryRun should not change the file content', async (t) => {
  const {testFile} = await setup();
  const result = await regexReplace({
    regex: /Hello/g,
    filepath: testFile,
    replacement: 'Hi',
    dryRun: true
  });

  const unchangedContent = await readFile(testFile, 'utf-8');

  t.true(result.success);
  t.is(result.matchCount, 3);
  t.is(result.originalContent, content);
  t.is(unchangedContent, content);
  t.is(result.updatedContent, null);
});
