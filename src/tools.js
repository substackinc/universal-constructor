// tools.js
import { exec } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import { resolve } from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import chalk from "chalk";

const workingDirectory = '/Users/chrisbest/src/gpts-testing';

const exec_shell_spec = {
    type: 'function',
    function: {
        name: 'exec_shell',
        description: 'Run a command in a bash shell',
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The shell command to run',
                },
            },
            required: ['command'],
        },
    },
};

async function exec_shell(args) {
    const { command } = args;
    console.log(chalk.gray(`RUNNING SHELL COMMAND: $ ${command}`));

    return new Promise((resolve) => {
        let exitCode;
        exec(command, (error, stdout, stderr) => {
            if (exitCode !== 0) {
                console.log(chalk.gray(`Error, exit code: ${exitCode}`));
            }
            if (stdout) console.log(chalk.gray(stdout));
            if (stderr) console.log(chalk.gray(stderr));
            resolve({
                success: exitCode === 0,
                exitCode,
                stdout,
                stderr,
            });
        }).on('exit', (code) => {
            exitCode = code;
        });
    });
}

const write_file_spec = {
    type: 'function',
    function: {
        name: 'write_file',
        description: 'Writes content to a specified file, replacing its contents, within the working directory',
        parameters: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The relative path to the file within the working directory',
                },
                content: {
                    type: 'string',
                    description: 'The content to write to the file',
                },
            },
            required: ['filepath', 'content'],
        },
    },
};

async function write_file(args) {
    let { filepath, content } = args;
    // console.log("CBTEST write file", args)
    let oldContent = '';
    // Check if the file exists and reads the old content
    const fullPath = resolve(workingDirectory, filepath);
    if (existsSync(fullPath)) {
        oldContent = await fs.readFile(fullPath, 'utf8');
    }

    try {
        console.log(oldContent ? 'Overwriting' : 'Writing', filepath);
        await fs.writeFile(fullPath, content, 'utf8');
        return {
            success: true,
            oldContent: oldContent,
            newContent: content,
        };
    } catch (error) {
        console.error(`Error writing file: ${error}`);
        return {
            success: false,
            error: error.message,
        };
    }
}

const update_file_spec = {
    type: 'function',
    function: {
        name: 'update_file',
        description: 'Updates a specified target portion of a file. Can make multiple changes at once.',
        parameters: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The path to the file within the working directory',
                },
                changes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            content: {
                                type: 'string',
                                description: 'The content to write or insert',
                            },
                            target: {
                                type: 'string',
                                description:
                                    'Exact content of the target section for modification. Can be multiple lines',
                            },
                            action: {
                                type: 'string',
                                enum: ['before', 'after', 'replace'],
                                description:
                                    'Operation to perform relative to the target lines: insert before, insert after, or replace',
                            },
                            targetInstanceNumber: {
                                type: 'integer',
                                description:
                                    'The 0-based index of which instance of the target to replace, if there' +
                                    ' are multiple. Can be omitted if there is exactly one match.',
                            },
                        },
                        required: ['content', 'target', 'action'],
                    },
                },
            },
            required: ['filepath', 'changes'],
        },
    },
};

async function update_file(args) {
    const { filepath, changes } = args;
    console.log('Updating', filepath);
    const fullPath = resolve(workingDirectory, filepath);
    let newContents = await fs.readFile(fullPath, 'utf8');
    let errors = [];
    let successes = [];

    for (const change of changes) {
        console.log(change);
        const { content, target, action, targetInstanceNumber } = change;
        const foundAt = [...newContents.matchAll(new RegExp(escapeStringRegexp(target), 'g'))];

        if (foundAt.length === 0) {
            let message = `Could not find any instances in ${filepath} of target: ${target}`;
            console.error(message);
            errors.push({
                message,
                change,
            });
        } else if (foundAt.length > 1 && targetInstanceNumber === undefined) {
            const message =
                `Expecting exactly one instance of target in ${filepath},` +
                ` but found ${foundAt.length} instances of: ${target}` +
                `\nSpecify a targetInstanceNumber, or, use more context in the target parameter`;
            console.error(message);
            errors.push({
                message,
                change,
            });
        } else if (targetInstanceNumber >= foundAt.length) {
            const message =
                `You specified targetInstanceNumber ${targetInstanceNumber}, but there are only` +
                ` ${foundAt.length} matches, so it must be between 0 and ${foundAt.length - 1}`;
            console.error(message);
            errors.push({
                message,
                change,
            });
        }

        const targetMatch = foundAt[targetInstanceNumber || 0];
        const index = targetMatch.index;
        const len = targetMatch[0].length;

        switch (action) {
            case 'before':
                newContents = newContents.slice(0, index) + content + newContents.slice(index);
                break;
            case 'after':
                newContents = newContents.slice(0, index + len) + content + newContents.slice(index + len);
                break;
            case 'replace':
                newContents = newContents.slice(0, index) + content + newContents.slice(index + len);
                break;
            default:
                console.error(`Unknown action specified: ${action}`);
                throw new Error(`Action not supported: ${action}`);
        }
        successes.push({ change });
    }

    await fs.writeFile(fullPath, newContents, 'utf8');

    return {
        success: errors.length === 0,
        errors,
        successes,
        newContents,
    };
}

// Function to retrieve the full content of a file and an array of its lines with content and line numbers.
const show_file_spec = {
    type: 'function',
    function: {
        name: 'show_file',
        description: 'Retrieves the full content of the file and some relevent info.',
        parameters: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The path to the file within the working directory.',
                },
            },
            required: ['filepath'],
        },
    },
};

async function exec_multi(...commands) {
    let results = {};
    for (const command of commands) {
        results[command] = await exec_shell({ command });
    }
    return results;
}

async function show_file({ filepath }) {
    console.log('\nReading', filepath);
    return {
        content: await fs.readFile(filepath, 'utf8'),
        info: await exec_multi(`sh file_info.sh ${filepath}`, `prettier -c ${filepath}`),
    };
}

// Tool specification for get_summary
const get_summary_spec = {
    type: 'function',
    function: {
        name: 'get_summary',
        description: 'Gives an overall summary of the current situation',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
};

// The get_summary tool function
async function get_summary() {
    console.log('\n Getting summary...');
    return exec_multi(
        'echo "This project is YOU. It is the code I am using to talk to you, and the functions you run."',
        'echo "You have the openAI docs in your myfiles_browser"',
        'git ls-files',
        'git status',
        'git log -n 5',
        'cat package.json',
        'prettier -c .'
    );
}

// don't make any chances below here
const tools = [
    { type: 'retrieval' },
    exec_shell_spec,
    write_file_spec,
    update_file_spec,
    show_file_spec,
    get_summary_spec,
];
const toolsDict = { exec_shell, write_file, update_file, show_file, get_summary };

export { tools, toolsDict };
