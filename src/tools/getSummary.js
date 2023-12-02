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
            'This project the Universal Constructor (UC for short) which is me, the AI assistant reading this. It is the code that my human user users to talk to me, and it has the functions that give me ability to interact with the local system.',
            'You should usually editFile to make changes.',
            `You can run tests with 'npm test' or 'npm test [file]'`,
        ],
        shell_results: await execMulti(
            ...['cat priorities.md', 'git ls-files', 'git status -u', 'git log -n 5', 'cat package.json', 'pwd']
        ),
    };
}
