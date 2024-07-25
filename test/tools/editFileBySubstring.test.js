import test from 'ava';
import editFileBySubstring from '../../src/tools/editFileBySubstring.js';
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

test('editFileBySubstring replaces a string within a file', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World, Hello Universe', 'utf8');
    await editFileBySubstring({
        filepath: testFile,
        uniqueContext: 'Hello World, Hello Universe',
        exactTarget: 'Universe',
        replacement: 'AVA',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, 'Hello World, Hello AVA', 'Content should be replaced correctly');
});

test('editFileBySubstring fails with multiple instances of the search context', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World. Hello World.', 'utf8');
    try {
        await editFileBySubstring({
            filepath: testFile,
            uniqueContext: 'Hello World',
            exactTarget: 'World',
            replacement: 'AVA',
        });
        t.fail('editFileBySubstring should throw an error if the search context appears more than once.');
    } catch (error) {
        t.pass('editFileBySubstring should throw an error if the search context appears more than once.');
    }
});

test('editFileBySubstring works on a file with many lines', async (t) => {
    const { testFile } = setup();
    const multilineContent = `First line\nSecond line target\nThird line`;
    await fs.writeFile(testFile, multilineContent);
    await editFileBySubstring({
        filepath: testFile,
        uniqueContext: '\nSecond line target\n',
        exactTarget: 'target',
        replacement: 'replacement',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(
        content,
        `First line\nSecond line replacement\nThird line`,
        'Content should be replaced correctly in a multi-line file.'
    );
});

test('editFileBySubstring uniqueContext lets you specify a given replacement among many', async (t) => {
    const { testFile } = setup();
    const multiTargetContent = `Target line one\nUseless line\nTarget line two\nTarget line one`;
    await fs.writeFile(testFile, multiTargetContent);
    await editFileBySubstring({
        filepath: testFile,
        uniqueContext: 'Target line two',
        exactTarget: 'Target',
        replacement: 'Selected',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(
        content,
        `Target line one\nUseless line\nSelected line two\nTarget line one`,
        'Only the target within the specified unique context should be replaced.'
    );
});
