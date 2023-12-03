// Challenge Step: Revert the Addition of 'Modulo' Function

/**
 * Instructions:
 * Through the process of iterative development, it's been decided that the 'modulo' function will not be included
 * in the calculator feature set. The goal now is to revert the project to the state just before the 'modulo' function was added.
 *
 * - Use `git log` to identify the commit just before where the 'modulo' function was added to `output/calculator.js`.
 * - Check out that commit by running `git checkout <commit-hash>`.
 * - Create a new sequential branch from this point for a fresh attempt. For example, if your last attempt was `uc-feature-002`,
 *   you would now create `uc-feature-003`.
 * - Verify that on this branch the 'add' function and other previous functionality work correctly.
 * - Confirm that all tests pass on this new branch.
 * - Commit any new changes with a meaningful message on the new attempt branch.
 *
 * Check:
 * - Ensure you're currently on a new attempt branch with proper sequential naming.
 * - Confirm the `output/calculator.js` no longer includes the 'modulo' function.
 * - Confirm that `output/calculator.test.js` no longer contains tests for 'modulo', in accordance with the project's updated direction.
 * - Verify that all tests related to existing functionality pass as expected.
 * - Count the commits to ensure this is the latest commit on the new branch.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

async function checkRevertAndBranchStep() {
  // Verify the current branch is the correct new attempt branch with sequential naming
  try {
    const { stdout: currentBranch } = await execPromise('git rev-parse --abbrev-ref HEAD');
    if (!/uc-feature-\d{3}/.test(currentBranch.trim())) {
      console.error(`Error: You are not on the proper new attempt branch. Detected branch is: ${currentBranch.trim()}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error verifying current branch:', error.message);
    process.exit(1);
  }

  // Check if the 'modulo' function and tests for 'modulo' have been removed
  try {
    const { stdout: calculatorContent } = await execPromise('git show HEAD:output/calculator.js');
    if (calculatorContent.includes('modulo')) {
      throw new Error('The `calculator.js` file still includes the modulo function.');
    }
    const { stdout: testContent } = await execPromise('git show HEAD:output/calculator.test.js');
    if (testContent.includes('modulo')) {
      throw new Error('The `calculator.test.js` file still includes tests for the modulo function.');
    }
  } catch (error) {
    console.error('Error checking for removal of modulo function and tests:', error.message);
    process.exit(1);
  }

  // Run tests to ensure they pass
  try {
    const { stdout: testOutput } = await execPromise('npm test -- output/calculator.test.js');
    console.log(testOutput);
  } catch (error) {
    console.error('Error running tests after revert:', error.message);
    process.exit(1);
  }
}

await checkRevertAndBranchStep();