// Challenge 03 - Work in a Branch

/**
 * The Universal Constructor (UC) will learn to manage version control with git efficiently, using branches
 * to encapsulate changes. This is vital for working on complex changes while keeping the main branch stable.
 *
 * Goal:
 * Embrace an iterative development process using git. Each step in the workflow (create a branch, commit changes,
 * review diffs, run tests, handle merges/rollbacks) should be well understood and practiced.
 *
 * Instructions:
 * Your task is to create a new branch with a 'uc-' prefix from the main branch.
 *
 * When this file is executed, it should verify that we are currently on the correct branch.
 * If not, it should output a message with instructions on how to create the branch, reminding the user to read the instructions in this file, and exit with non-zero status.
 * If yes, it should confirm that the UC is on the correct branch.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function checkBranch() {
  try {
    const { stdout } = await execPromise('git branch --show-current');
    const currentBranch = stdout.trim();
    const isUcBranch = currentBranch.startsWith('uc-');
    if (isUcBranch) {
      console.log(`On correct UC branch: ${currentBranch}`);
    } else {
      console.error('Not on a UC prefixed branch. Please read the instructions in this file and create a new branch: git checkout -b uc-<branch-name> from the main branch.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error executing git command:', error.message, '\nPlease read the instructions in this file for guidance.');
    process.exit(1);
  }
}

await checkBranch();