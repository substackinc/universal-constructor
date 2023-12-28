// src/tools/setWorkingDirectory.js
import fs from 'fs';
import path from 'path';
import { chdir } from '../dirUtils.js';

/**
 * Sets the working directory for the process.
 *
 * @hoisted true
 */
setWorkingDirectory.spec = {
  name: 'setWorkingDirectory',
  description: 'Sets the working directory for all subsequent tool operations.',
  parameters: {
    type: 'object',
    properties: {
      dir: {
        type: 'string',
        description: 'The path to the directory to use as the working directory.',
      },
    },
    required: ['dir'],
  },
};

/**
 * Sets the working directory for all subsequent tool operations.
 *
 * @param {object} options - The options for setting the working directory.
 * @param {string} options.dir - The path to the directory to use as the working directory.
 * @returns {void}
 */
export default async function setWorkingDirectory({ dir }) {
  if (!dir || typeof dir !== 'string') {
    throw new Error('You must provide a directory path as a string.');
  }

  if (!path.isAbsolute(dir)) {
    dir = path.join(process.cwd(), dir);
  }

  if (!fs.existsSync(dir)) {
    throw new Error('The specified directory does not exist.');
  }

  await chdir(dir);
  console.log("Changed directory to: ", process.cwd())
  return {
    success: true,
    cwd: process.cwd()
  }
}
