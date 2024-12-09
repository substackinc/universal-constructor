import test from 'ava';
import editFileByLines from '../../src/tools/editFileByLines.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'editFileTests');
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

test('editFileByLines replaces lines within a file', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'First line\nSecond line\nThird line\nFourth line', 'utf8');
    await editFileByLines({
        filepath: testFile,
        range: '2-3',
        replacement: 'Line number two\nLine number three',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, 'First line\nLine number two\nLine number three\nFourth line', 'Lines should be replaced correctly');
});
