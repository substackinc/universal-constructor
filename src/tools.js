// tools.js
import { exec } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import { resolve } from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import chalk from 'chalk';
import * as util from 'util';

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

async function exec_shell(args, logOutput) {
    const { command } = args;
    log(`\nRUNNING SHELL COMMAND: $ ${command}`);

    return new Promise((resolve) => {
        let exitCode;
        exec(command, (error, stdout, stderr) => {
            if (exitCode !== 0) {
                log(`Error, exit code: ${exitCode}`);
            }
            if (logOutput && stdout) log(stdout);
            if (logOutput && stderr) log(stderr);
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
    let oldContent = '';
    // Check if the file exists and reads the old content
    const fullPath = resolve(workingDirectory, filepath);
    if (existsSync(fullPath)) {
        oldContent = await fs.readFile(fullPath, 'utf8');
    }

    try {
        log(oldContent ? 'Overwriting' : 'Writing', filepath);
        await fs.writeFile(fullPath, content, 'utf8');
        return {
            success: true,
            oldContent: oldContent,
            newContent: content,
        };
    } catch (error) {
        log(`Error writing file: ${error}`);
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
        description:
            'Updates a specified target portion of a file. Can handle direct character range updates or target-based updates with an optional index for multiple matches.',
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
                            range: {
                                type: 'string',
                                description:
                                    'The character range to replace, expressed as "start:end". Exclusive of the end index.',
                                pattern: '^[0-9]+:[0-9]+$',
                            },
                            target: {
                                type: 'string',
                                description:
                                    'Exact content of the target section for modification when not using range. Can be multiple lines.',
                            },
                            action: {
                                type: 'string',
                                enum: ['before', 'after', 'replace'],
                                description:
                                    'Operation to perform relative to the target or range: insert before, insert after, or replace',
                            },
                            targetInstanceNumber: {
                                type: 'integer',
                                description:
                                    'The 0-based index of the target instance to replace when there are multiple matches. Omit if only one match exists or when using range.',
                            },
                        },
                        required: ['content', 'action'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['filepath', 'changes'],
        },
    },
};

async function update_file({ filepath, changes }) {
    log(`Updating ${filepath}`)
    const fullPath = resolve(workingDirectory, filepath);
    let fileContents = await fs.readFile(fullPath, 'utf8');

    for (const change of changes) {
        log(change);
        const { content, range, target, action, targetInstanceNumber } = change;

        if (range) {
            // If a range is specified, use it directly for string manipulation
            const [start, end] = range.split(':').map(Number);
            switch (action) {
                case 'before':
                    fileContents = fileContents.substring(0, start) + content + fileContents.substring(start);
                    break;
                case 'after':
                    fileContents = fileContents.substring(0, end) + content + fileContents.substring(end);
                    break;
                case 'replace':
                    fileContents = fileContents.substring(0, start) + content + fileContents.substring(end);
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }
        } else if (target !== undefined) {
            // If a target is specified, find it in the file to determine the range
            let startIndex = fileContents.indexOf(target);
            if (startIndex === -1) {
                throw new Error(`Target not found: ${target}`);
            }
            if (targetInstanceNumber) {
                // Skip the specified number of occurrences to find the nth instance
                for (let i = 0; i < targetInstanceNumber; i++) {
                    startIndex = fileContents.indexOf(target, startIndex + 1);
                    if (startIndex === -1) {
                        throw new Error(
                            `Target instance number ${targetInstanceNumber} not found for target: ${target}`
                        );
                    }
                }
            }
            const endIndex = startIndex + target.length;
            switch (action) {
                case 'before':
                    fileContents = fileContents.substring(0, startIndex) + content + fileContents.substring(startIndex);
                    break;
                case 'after':
                    fileContents = fileContents.substring(0, endIndex) + content + fileContents.substring(endIndex);
                    break;
                case 'replace':
                    fileContents = fileContents.substring(0, startIndex) + content + fileContents.substring(endIndex);
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }
        } else {
            throw new Error('Update change requires either a range or a target.');
        }
    }

    await fs.writeFile(fullPath, fileContents);
    return { success: true, newContents: fileContents };
}

// Function to retrieve the full content of a file and some relevant info.
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
        results[command] = await exec_shell({ command }, false);
    }
    return results;
}

async function show_file({ filepath }) {
    log('\nReading', filepath);
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
    log('\n Getting summary...');
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

function log(...args) {
    console.log(...args.map((a) => chalk.gray(typeof a === 'object' ? util.inspect(a) : a)));
}

// Tool for searching within a file and providing matches with context
const search_file_spec = {
    type: 'function',
    function: {
        name: 'search_file',
        description: 'Searches for a string in a file and returns all matches with context.',
        parameters: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The path to the file within the working directory.',
                },
                search: {
                    type: 'string',
                    description: 'The search string to find in the file.',
                },
            },
            required: ['filepath', 'search'],
        },
    },
};

async function search_file({ filepath, search }) {
    log(`Searching for ${search}`);
    const fileContent = await fs.readFile(filepath, 'utf8');
    const matches = [];
    const searchRegex = new RegExp(`(?:^|\n)([^\n]*${escapeStringRegexp(search)}[^\n]*\n[^\n]*)`, 'gi');
    let match;
    while ((match = searchRegex.exec(fileContent)) !== null) {
        const contextStartIndex = Math.max(match.index - 1, 0);
        const contextEndIndex = searchRegex.lastIndex;
        const range = `${match.index}-${searchRegex.lastIndex - 1}`;
        matches.push({
            range,
            context: fileContent.substring(contextStartIndex, contextEndIndex),
        });
    }
    log(matches);
    return matches;
}

// Exported tools and their corresponding functions
const tools = [
    { type: 'retrieval' },
    exec_shell_spec,
    write_file_spec,
    update_file_spec,
    show_file_spec,
    get_summary_spec,
    search_file_spec,
    { name: 'log', function: log },
];

const toolsDict = { exec_shell, write_file, update_file, show_file, get_summary, search_file };

export { tools, toolsDict };
