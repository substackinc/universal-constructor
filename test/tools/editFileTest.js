import test from 'ava';
import editFile from '../../src/tools/editFile.js';
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

test('editFile replaces a string within a file', async (t) => {
    const { testFile } = setup();
    await fs.writeFile(testFile, 'Hello World, Hello Universe', 'utf8');
    await editFile({
        filepath: testFile,
        uniqueContext: 'Hello World, Hello Universe',
        exactTarget: 'Universe',
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
            uniqueContext: 'Hello World',
            exactTarget: 'World',
            replacement: 'AVA',
        });
        t.fail('editFile should throw an error if the search context appears more than once.');
    } catch (error) {
        t.pass('editFile should throw an error if the search context appears more than once.');
    }
});

test('editFile works on a file with many lines', async (t) => {
    const { testFile } = setup();
    const multilineContent = `First line\nSecond line target\nThird line`;
    await fs.writeFile(testFile, multilineContent);
    await editFile({
        filepath: testFile,
        uniqueContext: '\nSecond line target\n',
        exactTarget: 'target',
        replacement: 'replacement',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, `First line\nSecond line replacement\nThird line`, 'Content should be replaced correctly in a multi-line file.');
});

test('editFile uniqueContext lets you specify a given replacement among many', async (t) => {
    const { testFile } = setup();
    const multiTargetContent = `Target line one\nUseless line\nTarget line two\nTarget line one`;
    await fs.writeFile(testFile, multiTargetContent);
    await editFile({
        filepath: testFile,
        uniqueContext: 'Target line two',
        exactTarget: 'Target',
        replacement: 'Selected',
    });
    const content = await fs.readFile(testFile, 'utf8');
    t.is(content, `Target line one\nUseless line\nSelected line two\nTarget line one`, 'Only the target within the specified unique context should be replaced.');
});
