import test from 'ava';
import searchFile from '../../src/tools2/searchFile.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'searchFileTests');
const testFilePath = path.join(testDir, 'testSearchFile.tmp.txt');
const testContent =
    'First line\nSecond line with Search term\nThird line with Search term\nFourth line\nFifth line with Search term';

// Create a temporary test directory and file before the tests
test.before(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFilePath, testContent, 'utf8');
});

// Cleanup test directory and file after the tests
test.after.always(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});

test('searchFile finds and returns all matches with search term', async (t) => {
    const { matches } = await searchFile({
        filepath: testFilePath,
        search: 'Search term',
    });
    t.is(matches.length, 3, 'Should find three lines with the search term');

    for (const match of matches) {
        t.true(match.found.includes('earch term'), 'found should include the search term');
        t.true(match.context.length > 0, 'There should be some context for each match');
    }
});

test('searchFile returns no matches when search term is not present', async (t) => {
    const { matches } = await searchFile({
        filepath: testFilePath,
        search: 'nonexistent',
    });
    t.is(matches.length, 0, 'Should not find matches with a nonexistent search term');
});
