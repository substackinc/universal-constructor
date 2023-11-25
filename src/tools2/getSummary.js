// src/tools2/getSummary.js

getSummary.spec = {
    name: 'get_summary',
    description: 'Gives an overall summary of the current situation',
    // parameters not needed for getSummary
};

export default async function getSummary() {
    // Mocking the log function
    const log = console.log;

    log('\n Getting summary...');
    // Rather than calling exec_multi directly, we'll use the promises API for child_process to parallelize
    const util = require('util');
    const exec = util.promisify(require('child_process').exec);

    // Use object pattern for clearer calls
    const shellResults = {
        'cat priorities.md': await exec('cat priorities.md'),
        'git ls-files': await exec('git ls-files'),
        'git status': await exec('git status'),
        'git log -n 5': await exec('git log -n 5'),
        'cat package.json': await exec('cat package.json'),
        'prettier -c .': await exec('prettier -c .'),
    };

    return {
        advice: [
            'This project is YOU. It is the code I am using to talk to you, and the functions you run.',
            'You have the OpenAI docs in your myfiles_browser',
            'You should usually replaceInFile to make changes.',
        ],
        //available_tools: ['exec_shell', 'write_file', 'show_file', 'get_summary', 'search_file', 'replaceInFile', 'restart_interface'],
        shell_results: shellResults,
    };
}
