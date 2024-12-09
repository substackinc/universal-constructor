import test from 'ava';
import readFile from '../../src/tools/readFile.js';
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

test('readFile reads and returns content of a file without line numbers', async (t) => {
    const result = await readFile({ filepath: testFilePath, omitLineNumbers: true });
    t.is(result.content, testContent, 'Content should match the test content exactly');
});

test('readFile reads and returns the content of a file with line numbers', async (t) => {
    const expectedResult = '1   Line 1\n2   Line 2\n3   Line 3';
    const result = await readFile({
        filepath: testFilePath,
    });
    t.is(result.content, expectedResult, 'Content should match the test content plus line numbers');
});

test('readFile reads and returns a correct range of lines from a file without line numbers', async (t) => {
    const range = '2-3';
    const expectedResult = 'Line 2\nLine 3';
    const result = await readFile({ filepath: testFilePath, range, omitLineNumbers: true });
    t.is(result.content, expectedResult, 'Content should match lines 2 to 3 inclusive without line numbers');
});

test('readFile reads and returns a correct range of lines from a file with line numbers', async (t) => {
    const range = '2-3';
    const expectedResult = '2   Line 2\n3   Line 3';
    const result = await readFile({ filepath: testFilePath, range });
    t.is(result.content, expectedResult, 'Content should match lines 2 to 3 inclusive with line numbers');
});
