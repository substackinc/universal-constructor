// src/tools2/execShell.js

execShell.spec = {
    name: 'exec_shell',
    description: 'Run a command in a bash shell',
    parameters: {
        command: {
            type: 'string',
            description: 'The shell command to run',
        },
    },
};

export default async function execShell({ command }) {
    const { exec } = require('child_process');
    console.log(`\nRUNNING SHELL COMMAND: $ ${command}`);
    let exitCode;
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    success: false,
                    exitCode: error.code,
                    stdout,
                    stderr,
                });
            }
            resolve({
                success: true,
                exitCode,
                stdout,
                stderr,
            });
        }).on('exit', (code) => {
            exitCode = code;
        });
    });
}
