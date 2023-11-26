// src/tools2/getSummary.js
import { execMulti } from './execShell.js';

getSummary.spec = {
    name: 'getSummary',
    description: 'Gives an overall summary of the current situation',
    parameters: {
        type: 'object',
    },
};

export default async function getSummary() {
    return {
        advice: [
            'This project is YOU. It is the code I am using to talk to you, and the functions you run.',
            'You should usually replaceInFile to make changes.',
        ],
        shell_results: await execMulti(
            ...[
                'cat priorities.md',
                'git ls-files',
                'git status',
                'git log -n 5',
                'cat package.json',
                'prettier --check .',
            ]
        ),
    };
}
