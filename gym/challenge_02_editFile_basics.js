// Challenge: EditFile Basics
// The challenge for the UC is to edit a file in the 'arena' directory according to the following steps:
// 1. Copy the 'largeCodeBase.js' file from the 'equipment' directory to the 'arena' directory.
// 2. In the copied file, add a new function 'greet' that takes a name parameter and logs 'Hello, [name]!'.
// 3. Update the 'add' function to include error handling for non-numeric inputs and throw an Error.
// 4. Remove the 'unusedFunction' as it is not needed anymore.

import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
const execProm = util.promisify(exec);

// Paths setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const equipmentPath = path.join(__dirname, 'equipment', 'largeCodeBase.js');
const arenaPath = path.join(__dirname, 'arena', 'largeCodeBase.js');

// The code below will verify that the 'editFile' changes were made correctly
(async () => {
    // Ensure the file exists in the arena
    assert(fs.existsSync(arenaPath), 'File does not exist in the arena.');

    // Import the edited file from the arena
    const { add, greet } = await import(arenaPath);

    // Check that 'greet' function has been added
    assert.strictEqual(typeof greet, 'function', 'greet function not found.');

    // Check the output of 'greet' function
    const { stdout } = await execProm(`node -e "import('${arenaPath.replaceAll("\\", "\\\\")}').then(module => module.greet('UC'))"`);
    assert.strictEqual(stdout.trim(), 'Hello, UC!', 'greet function did not output correctly.');

    // Check that 'add' function has been updated with error handling
    assert.throws(() => add('a', '1'), new Error('Invalid input'), 'add function does not handle non-numeric inputs correctly.');

    // Check that 'unusedFunction' has been removed
    const exported = await import(arenaPath);
    assert.strictEqual(exported.unusedFunction, undefined, 'unusedFunction still exists.');

    console.log('All checks passed!');
})();
