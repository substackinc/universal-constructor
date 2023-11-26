import test from 'ava';
import showFile from '../../src/tools/showFile.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'showFileTests');
const testFilePath = path.join(testDir, 'testShowFile.tmp.txt');
const testContent = 'Line 1\nLine 2\nLine 3';

// Create a temporary test directory and file before the tests
test.before(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFilePath, testContent, 'utf8');
});

// Cleanup test directory and file after the tests
test.after.always(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});

test('showFile reads and returns content of a file', async (t) => {
    const result = await showFile({ filepath: testFilePath });
    t.is(result.content, testContent, 'Content should match the test content');
});
