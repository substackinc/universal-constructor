// tools.js
import { promisify } from "util";
import { exec } from "child_process";
import { promises as fs, existsSync } from 'fs';
import { join, resolve } from 'path';
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
    console.log(`RUNNING SHELL COMMAND: $${command}`);
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

const write_file_spec = {
    "type": "function",
    "function": {
        "name": "write_file",
        "description": "Writes content to a specified file, replacing its contents, within the working directory",
        "parameters": {
            "type": "object",
            "properties": {
                "filepath": {
                    "type": "string",
                    "description": "The relative path to the file within the working directory"
                },
                "content": {
                    "type": "string",
                    "description": "The content to write to the file"
                }
            },
            "required": [
                "filepath", "content"
            ]
        }
    }
};

async function write_file({ filepath, content }) {
    let oldContent = '';
    // Check if the file exists and reads the old content
    const fullPath = resolve(workingDirectory, filepath);
    if (existsSync(fullPath)) {
        oldContent = await fs.readFile(fullPath, 'utf8');
    }

    try {
        // Prevent writing files outside of the working directory
        if (!fullPath.startsWith(workingDirectory)) {
            throw new Error('Cannot write outside of the working directory');
        }
        console.log(oldContent ? 'Overwriting' : 'Writing', filepath);
        await fs.writeFile(fullPath, content, 'utf8');
        return {
            success: true,
            oldContent: oldContent,
            newContent: content
        };
    } catch (error) {
        console.error(`Error writing file: ${error}`);
        return {
            success: false,
            error: error.message
        };
    }
}

const tools = [{ "type": "retrieval" }, exec_shell_spec, write_file_spec];
const toolsDict = { exec_shell, write_file };

export { tools, toolsDict };