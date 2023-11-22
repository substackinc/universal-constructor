// tools.js
import { promisify } from "util";
import { exec } from "child_process";
const pexec = promisify(exec);
const workingDirectory = "/Users/chrisbest/src/gpts-testing";

const exec_shell_spec = {
    "type": "function",
    "function": {
        "name": "exec_shell",
        "description": "Run a command in a bash shell",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The zsh shell command to run"
                }
            },
            "required": [
                "command"
            ]
        }
    }
};

async function exec_shell(args) {
    const {command} = args;
    console.log(`RUNNING SHELL COMMAND: \$ ${command}`);
    try {
        const {stdout, stderr} = await pexec(command, {cwd: workingDirectory});

        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return {
                success: false,
                stderr: stderr
            };
        }

        console.log(`Output: ${stdout}`);
        return {
            success: true,
            stdout: stdout
        };
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

export { exec_shell, exec_shell_spec };

