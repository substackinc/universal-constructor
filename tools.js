// tools.js
import { promisify } from "util";
import { exec } from "child_process";
import { promises as fs, constants } from 'fs';
import { resolve } from 'path';
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
                },
                "placeholder": {
                    "type": "string",
                    "description": "A unique string or comment used as a marker where the content should be inserted"
                }
            },
            "required": ["filepath", "content"]
        }
    }
};

async function write_file({ filepath, content, placeholder = '' }) {
    try {
        const fullPath = resolve(workingDirectory, filepath);
        let existingContent = '';

        try {
            await fs.access(fullPath, constants.F_OK);
            existingContent = await fs.readFile(fullPath, 'utf8');
        } catch (err) {
            if (err.code !== 'ENOENT') throw err; // If the error is not file not found, throw it
        }

        if (placeholder && existingContent.includes(placeholder)) {
            content = existingContent.replace(placeholder, content);

            console.log("Writing to", filepath, 'replacing:');
            console.log(placeholder);
            console.log("with");
            console.log(newContent)
        } else if (existingContent.length > 0) {
            console.log("Writing to", filepath, 'appending:');
            console.log("content");
            content = existingContent + '\n' + content;
        }

        await fs.writeFile(fullPath, content, 'utf8');
        return {
            success: true,
            oldContent: existingContent,
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