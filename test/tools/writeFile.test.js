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
