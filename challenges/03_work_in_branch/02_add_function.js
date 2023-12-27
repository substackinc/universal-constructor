// Challenge Step: Add Calculator 'add' function and write tests

/**
 * Instructions:
 * - Create a file `output/calculator.js` with an 'add' function that accepts two arguments and returns their sum.
 * - Create a file `output/calculator.test.js` with unit tests for the 'add' function using the suggested framework.
 * - Both files should be properly formatted.
 * - Review the code and tests to ensure everything is working as expected.
 * - Once you're confident the code is correct and the tests are passing, commit the changes with a meaningful commit message.
 *
 * Check:
 * - The check will verify if `output/calculator.js` and `output/calculator.test.js` files exist.
 * - Ensure the files follow coding and formatting standards.
 * - Run tests in `output/calculator.test.js` to ensure they pass.
 * - Verify if the changes have been committed to git.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile } from './src/tools/history.js';
import { searchFile } from './src/tools/searchFile.js';
const execPromise = promisify(exec);

async function checkAddFunctionStep() {
  // Check if the files exist
  if (!existsSync('challenges/03_work_in_branch/output/calculator.js') ||
      !existsSync('challenges/03_work_in_branch/output/calculator.test.js')) {
    console.error('Error: The required files do not exist.');
    process.exit(1);
  }

  // Check if files are properly formatted (placeholder for actual formatting check)

  // Check if tests pass
  try {
    const { stdout: testStdout } = await execPromise('npm test -- challenges/03_work_in_branch/output/calculator.test.js');
    console.log(testStdout);
  } catch (error) {
    console.error('Error running tests:', error.message);
    process.exit(1);
  }

  // Verify if the changes have been committed to git
  try {
    const { stdout: gitStatusStdout } = await execPromise('git status --porcelain');
    const changesExist = gitStatusStdout.includes('output/calculator.js') || gitStatusStdout.includes('output/calculator.test.js');
    if (changesExist) {
      console.error('Error: Changes have not been committed.');
      process.exit(1);
    } else {
      console.log('All changes have been committed successfully.');
    }
  } catch (error) {
    console.error('Error checking git status:', error.message);
    process.exit(1);
  }
}

await checkAddFunctionStep();