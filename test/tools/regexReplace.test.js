import test from 'ava';
import { regexReplace } from '../../src/tools/index.js';
import { promises as fsPromises } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const { writeFile, readFile } = fsPromises;

let i = 0;
const testDir = path.join(os.tmpdir(), 'replaceInFileTests');
const content = 'Hello World! Hello People! Hello Universe!';

async function setup() {
    let testFile = path.join(testDir, `test_regex_replace.tmp${i++}.txt`);
    await writeFile(testFile, content);
    return { testFile };
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
    const { testFile } = await setup();
    const result = await regexReplace({
        regex: '/Hello/g',
        filepath: testFile,
        replacement: 'Hi',
        dryRun: false,
    });

    const updatedContent = await readFile(testFile, 'utf-8');

    t.true(result.success);
    t.is(result.matchCount, 3);
    t.is(updatedContent, 'Hi World! Hi People! Hi Universe!');
});

test('regexReplace - dryRun should not change the file content', async (t) => {
    const { testFile } = await setup();
    const result = await regexReplace({
        regex: '/Hello/g',
        filepath: testFile,
        replacement: 'Hi',
        dryRun: true,
    });

    const unchangedContent = await readFile(testFile, 'utf-8');

    t.true(result.success);
    t.is(result.matchCount, 3);
    t.is(result.originalContent, content);
    t.is(unchangedContent, content);
    t.is(result.updatedContent, 'Hi World! Hi People! Hi Universe!', 'dry run lets me see what it would have done');
    t.falsy(result.fileUpdated);
});

test('regexReplace - case sensitivity with replacement', async (t) => {
    const { testFile } = await setup();
    await regexReplace({
        regex: '/hello/g',
        filepath: testFile,
        replacement: 'Hi',
    });

    const caseSensitiveContent = await readFile(testFile, 'utf-8');
    t.is(caseSensitiveContent, content, 'lowercase hello should not replace anything');

    await regexReplace({
        regex: '/Hello/gi',
        filepath: testFile,
        replacement: 'Hi',
    });

    const caseInsensitiveContent = await readFile(testFile, 'utf-8');
    t.is(caseInsensitiveContent, 'Hi World! Hi People! Hi Universe!', 'case insensitive replacement should succeed');
});

test('regexReplace - special characters in regex pattern', async (t) => {
    const { testFile } = await setup();
    await regexReplace({
        regex: '/o Wo(.*)!/g',
        filepath: testFile,
        replacement: 'o Earth!',
    });

    const specialCharactersContent = await readFile(testFile, 'utf-8');
    t.is(
        specialCharactersContent,
        'Hello Earth!',
        'special characters should be interpreted correctly, matching from first "o World!" to the last "!", due to greedy matching'
    );
});

test('regexReplace - multiline replacement', async (t) => {
    const multiLineContent = 'Hello World!\nHello People!\nHello Universe!';
    const testFile = path.join(testDir, `test_multiline.tmp${i++}.txt`);
    await writeFile(testFile, multiLineContent);

    await regexReplace({
        regex: '/Hello/gm',
        filepath: testFile,
        replacement: 'Hi',
    });

    const updatedMultiLineContent = await readFile(testFile, 'utf-8');
    t.is(
        updatedMultiLineContent,
        'Hi World!\nHi People!\nHi Universe!',
        'multiline flag should allow for replacement on multiple lines'
    );
});

test('regexReplace - no matches found', async (t) => {
    const { testFile } = await setup();
    const result = await regexReplace({
        regex: '/Goodbye/g',
        filepath: testFile,
        replacement: 'Farewell',
    });

    t.true(result.success);
    t.is(result.matchCount, 0, 'should not find any matches for Goodbye');
});
