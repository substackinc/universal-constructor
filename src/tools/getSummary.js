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
        advice: [
            'This project is YOU, the Universal Constructor (UC for short). It is the code I am using to talk to you, and the functions you run.',
            'You should usually editFile to make changes.',
            `You can run tests with 'npm test' or 'npm test [file]'`,
        ],
        shell_results: await execMulti(
            ...[
                'cat priorities.md',
                'git ls-files',
                'git status',
                'git log -n 5',
                'cat package.json',
            ],
        ),
    };
}
