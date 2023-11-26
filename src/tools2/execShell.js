// src/tools2/execShell.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
    try {
        const { stdout, stderr } = await execPromise(command);
        return {
            success: true,
            stdout,
            stderr,
            exitCode: 0,
        };
    } catch (error) {
        return {
            success: false,
            stdout: error.stdout,
            stderr: error.stderr,
            exitCode: error.code,
        };
    }
}
export async function execMulti(...commands) {
    let results = {};
    for (const command of commands) {
        results[command] = await execShell({ command });
    }
    return results;
}