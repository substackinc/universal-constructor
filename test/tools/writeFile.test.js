import test from 'ava';
import writeFile from '../../src/tools/writeFile.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'writeFileTests');
let i = 0;
function setup() {
    return {
        testFile: path.join(testDir, `test${i++}.txt`),
    };
}

// Create a temporary test directory and files before the tests
test.before(async () => {
    await fs.mkdir(testDir, { recursive: true });
});

// Cleanup test directory after the tests
test.after.always(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});

test('writeFile creates a file with given content', async (t) => {
    const { testFile } = setup();
    await writeFile({ filepath: testFile, content: 'New content yo' });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, 'New content yo', 'File content should match the new content');
});

test('writeFile overwrites existing file and oldContent and newContent should be correct', async (t) => {
    const { testFile } = setup();
    await writeFile({ filepath: testFile, content: 'Content the first' });
    const result = await writeFile({ filepath: testFile, content: 'Content the second' });
    t.truthy(result.success);
    t.is(result.oldContent, 'Content the first');
    t.is(result.newContent, 'Content the second');
});

test('writeFile creates directories recursively', async (t) => {
    const subDir = path.join(testDir, `subdir-${Math.random().toString(16).slice(2)}`);
    const testFileInSubDir = path.join(subDir, 'file.txt');
    await writeFile({ filepath: testFileInSubDir, content: 'Content in subdirectory' });

    const directoryExists = await fs
        .stat(subDir)
        .then(() => true)
        .catch(() => false);
    const fileExists = await fs
        .readFile(testFileInSubDir, 'utf8')
        .then(() => true)
        .catch(() => false);

    await fs.rm(subDir, { recursive: true, force: true });

    t.true(directoryExists, 'Subdirectory should be created by writeFile');
    t.true(fileExists, 'File in subdirectory should be created with content');
});
