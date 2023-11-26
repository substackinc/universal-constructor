import test from 'ava';
import editFile from '../../src/tools/editFile.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'replaceInFileTests');
let i = 1;

function setup() {
    return {
        testFile: path.join(testDir, `testReplaceInFile.tmp${i++}.txt`),
    };
}

// Creating a temporary test file before the tests
test.before(async () => {
    await fs.mkdir(testDir, { recursive: true });
});

// Cleanup: remove the temporary file and directory after the tests
test.after.always(async () => {
    await fs.rm(testDir, { force: true, recursive: true });
});

test('editFile replaces a string within a file', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World, Hello Universe', 'utf8');
    await editFile({
        filepath: testFile,
        searchContext: 'Hello World, Hello Universe',
        targetSubstring: 'Universe',
        replacement: 'AVA',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, 'Hello World, Hello AVA', 'Content should be replaced correctly');
});

test('editFile fails with multiple instances of the search context', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World. Hello World.', 'utf8');
    try {
        await editFile({
            filepath: testFile,
            searchContext: 'Hello World',
            targetSubstring: 'World',
            replacement: 'AVA',
        });
        t.fail('editFile should throw an error if the search context appears more than once.');
    } catch (error) {
        t.pass('editFile should throw an error if the search context appears more than once.');
    }
});
