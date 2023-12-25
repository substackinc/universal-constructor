// src/tools/getSummary.js
import { execMulti } from './execShell.js';

getSummary.spec = {
    name: 'getSummary',
    description: 'Gives an overall summary of the current situation',
    parameters: {
        type: 'object',
        properties: {},
    },
};

export default async function getSummary() {
    console.log('getting summary');
    return {
        advice: [],
        current_working_directory: process.cwd(),
        shell_results: await execMulti(
            ...[
                'cat *.md',
                'git ls-files',
                'git status -u',
                'git log -n 5',
                'git rev-parse --show-toplevel',
                'cat package.json'],
        ),
    };
}
