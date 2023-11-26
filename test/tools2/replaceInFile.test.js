import test from 'ava';
import replaceInFile from '../../src/tools2/replaceInFile.js';
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

test('replaceInFile replaces a string within a file', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World, Hello Universe', 'utf8');
    let contents = await fs.readFile(testFile, 'utf8');
    console.log('CBTEST', testFile, contents);
    await replaceInFile({
        filepath: testFile,
        searchContext: 'Hello World, Hello Universe',
        targetSubstring: 'Universe',
        replacement: 'AVA',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, 'Hello World, Hello AVA', 'Content should be replaced correctly');
});

test('replaceInFile fails with multiple instances of the search context', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World. Hello World.', 'utf8');
    try {
        await replaceInFile({
            filepath: testFile,
            searchContext: 'Hello World',
            targetSubstring: 'World',
            replacement: 'AVA',
        });
        t.fail('replaceInFile should throw an error if the search context appears more than once.');
    } catch (error) {
        t.pass('replaceInFile should throw an error if the search context appears more than once.');
    }
});
