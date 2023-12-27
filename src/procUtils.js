import { exec, spawn } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

export function spawnAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(command, args, options);

        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        childProcess.on('error', (error) => {
            error.stdout = stdout;
            error.stderr = stderr;
            reject(error);
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const error = new Error(`Command failed with exit code ${code}`);
                error.code = code;
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
            }
        });
    });
}