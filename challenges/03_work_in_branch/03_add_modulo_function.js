// Challenge Step: Add 'modulo' Function to Calculator and Update Tests

/**
 * Instructions:
 * - Update the file `output/calculator.js` to include a 'modulo' function that accepts two arguments and returns their remainder.
 * - Update the file `output/calculator.test.js` with additional unit tests for the 'modulo' function.
 * - Ensure both files are properly formatted.
 * - Review the updated code and tests to confirm they work as expected.
 * - Once the updates are verified and tests pass, commit the changes with a meaningful commit message.
 *
 * Check:
 * - The check will verify if the updated `output/calculator.js` file includes the 'modulo' function.
 * - Verify if `output/calculator.test.js` file includes tests for the 'modulo' function.
 * - Run tests to ensure they pass including new tests for the 'modulo' function.
 * - Count the number of commits made on this branch to ensure progress is recorded properly in version control.
 * - Verify if the updates have been committed to git.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { searchFile } from './src/tools/searchFile.js';
const execPromise = promisify(exec);

async function checkModuloFunctionStep() {
  // Check if the updated calculator.js file includes the 'modulo' function
  const calculatorContentCheck = await searchFile({ filepath: 'challenges/03_work_in_branch/output/calculator.js', search: 'modulo' });
  if (calculatorContentCheck.matchCount === 0) {
    console.error('Error: The `calculator.js` file does not include a modulo function.');
    process.exit(1);
  }

  // Placeholder for additional checks on test file

  // Run tests to ensure they pass
  try {
    const { stdout: testStdout } = await execPromise('npm test -- challenges/03_work_in_branch/output/calculator.test.js');
    console.log(testStdout);
  } catch (error) {
    console.error('Error running tests:', error.message);
    process.exit(1);
  }

  // Count the number of commits made on this branch
  try {
    const { stdout: commitCount } = await execPromise('git rev-list --count HEAD');
    console.log(`Number of commits on this branch: ${commitCount.trim()}`);
  } catch (error) {
    console.error('Error counting commits:', error.message);
    process.exit(1);
  }

  // Verify if the updates have been committed to git
  try {
    const { stdout: gitStatusStdout } = await execPromise('git status --porcelain');
    const changesExist = gitStatusStdout.includes('output/calculator.js') || gitStatusStdout.includes('output/calculator.test.js');
    if (changesExist) {
      console.error('Error: Updates have not been committed.');
      process.exit(1);
    } else {
      console.log('All updates have been committed successfully.');
    }
  } catch (error) {
    console.error('Error checking git status for updates:', error.message);
    process.exit(1);
  }
}

await checkModuloFunctionStep();