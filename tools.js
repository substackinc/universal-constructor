// tools.js
import {promisify} from "util";
import {exec} from "child_process";
import {promises as fs, existsSync} from 'fs';
import {resolve} from 'path';

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
            "required": ["filepath", "content"]
        }
    }
};

async function write_file(args) {
    console.log("CBTEST write file", args)
    let {filepath, content} = args;
    let oldContent = '';
    // Check if the file exists and reads the old content
    const fullPath = resolve(workingDirectory, filepath);
    if (existsSync(fullPath)) {
        oldContent = await fs.readFile(fullPath, 'utf8');
    }

    try {
        // Prevent writing files outside of the working directory
        const fullPath = resolve(workingDirectory, filepath);
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

const update_file_spec = {
    "type": "function",
    "function": {
        "name": "update_file",
        "description": "Updates lines in a specified file with multiple changes, targeting lines by their exact content.",
        "parameters": {
            "type": "object",
            "properties": {
                "filepath": {
                    "type": "string",
                    "description": "The path to the file within the working directory"
                },
                "changes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The content to write or insert"
                            },
                            "targetLines": {
                                "type": "string",
                                "description": "Exact content of the target lines for modification"
                            },
                            "action": {
                                "type": "string",
                                "enum": ["before", "after", "replace"],
                                "description": "Operation to perform relative to the target lines: insert before, insert after, or replace"
                            }
                        },
                        "required": ["content", "targetLines", "action"]
                    }
                }
            },
            "required": ["filepath", "changes"]
        }
    }
};

function findSubsequences(array, subsequence) {
    let subsequences = [];
    for (let i = 0; i <= array.length - subsequence.length; i++) {
        let foundMatch = true;
        for (let j = 0; j < subsequence.length; j++) {
            if (array[i + j] !== subsequence[j]) {
                foundMatch = false;
                break;
            }
        }
        if (foundMatch) {
            subsequences.push(i) // Return the starting index of the run
        }
    }
    return subsequences;
}

async function update_file(args) {
    console.log("Updating", filepath);
    console.log("CBTEST", args);
    const {filepath, changes} = args;
    const fullPath = resolve(workingDirectory, filepath);
    let fileContents = await fs.readFile(fullPath, 'utf8');
    let fileLines = fileContents.split('\n');

    for (const change of changes) {
        const {content, targetLines, action} = change;
        const lines = targetLines.split('\n')
        const foundAt = findSubsequences(fileLines, lines)

        if (foundAt.length === 0) {
            console.error(`Could not find target: ${targetLines}`)
            return {
                success: false,
                message: `Could not find target: ${targetLines}`
            }
        } else if (foundAt.length > 1) {
            console.error(`Found multiple ${foundAt.length} instances of: ${targetLines}`);
            return {
                success: false,
                message: `Found multiple ${foundAt.length} instances of: ${targetLines}`
            }
        }

        const [targetIndex] = foundAt;
        const replacementLines = content.split('\n');

        switch (action) {
            case 'before':
                fileLines.splice(targetIndex, 0, ...replacementLines);
                break;
            case 'after':
                fileLines.splice(targetIndex + 1, 0, ...replacementLines);
                break;
            case 'replace':
                fileLines.splice(targetIndex, replacementLines.length, ...replacementLines);
                break;
            default:
                console.error(`Unknown action specified: ${action}`);
                throw new Error(`Action not supported: ${action}`);
        }
    }

    await fs.writeFile(fullPath, fileLines.join('\n'), 'utf8');

    return {
        success: true,
        message: "Successfully applied changes to the file.",
        newContents: fileLines.join('\n')
    };
}


// Function to retrieve the full content of a file and an array of its lines with content and line numbers.
const read_file_spec = {
    "type": "function",
    function: {
        "name": "read_file",
        "description": "Retrieves the full content of the file and an array of its lines with their line numbers.",
        "parameters": {
            "type": "object",
            "properties": {
                "filepath": {
                    "type": "string",
                    "description": "The path to the file within the working directory."
                }
            },
            "required": ["filepath"]
        }
    }
};

async function read_file({filepath}) {
    console.log("Reading", filepath);
    const fullPath = resolve(workingDirectory, filepath);
    const content = await fs.readFile(fullPath, 'utf8');
    const lines = content.split('\n').map((lineContent, index) => ({
        content: lineContent,
        lineNumber: index + 1
    }));

    return {content, lines};
}

// don't make any chances below here
const tools = [{"type": "retrieval"}, exec_shell_spec, write_file_spec, update_file_spec, read_file_spec];
const toolsDict = {exec_shell, write_file, update_file, read_file};

export {tools, toolsDict};
