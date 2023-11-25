// tools.js
import { exec } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import { resolve } from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import chalk from 'chalk';

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
        info: await exec_multi(`git diff ${filepath}`, `git log -n 5 ${filepath}`, `prettier -c ${filepath}`),
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
    return {
        advice: [
            'This project is YOU. It is the code I am using to talk to you, and the functions you run.',
            'You have the openAI docs in your myfiles_browser',
            'You should usually replaceInFile to make changes.',
        ],
        available_tools: Object.keys(toolsDict),
        shell_results: await exec_multi(
            `cat priorities.md`,
            'git ls-files',
            'git status',
            'git log -n 5',
            'cat package.json',
            'prettier -c .'
        ),
    };
}

function log(...args) {
    console.log(...args);
}

// Tool for searching within a file and providing matches with contexyest
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
                    description: 'The search string to find in the file. Can be multiple lines.',
                },
                contextBefore: {
                    type: 'integer',
                    description: 'Lines of context to return before the match. (Default 5)',
                },
                contextAfter: {
                    type: 'integer',
                    description: 'Lines of context to return after the match. (Default 5)',
                },
            },
            required: ['filepath', 'search'],
        },
    },
};

async function search_file({ filepath, search, contextBefore = 5, contextAfter = 5 }) {
    log(`search_file: Searching for '${search}' in file ${filepath}`);
    const fileContent = await fs.readFile(filepath, 'utf8');
    const searchRegex = new RegExp(
        `(?:.*\\n){0,${contextBefore}}(.*${escapeStringRegexp(search)}.*)(?:\\n.*){0,${contextAfter}}`,
        'gi'
    );
    console.log('CBTEST REGEX', searchRegex);

    let matches = [];
    let match;
    while ((match = searchRegex.exec(fileContent)) !== null) {
        let [context, line] = match;
        // this is goofy but it helps it.
        line = line.replace(search, chalk.bold(search));
        log('CBTEST MATCH', { line, context });
        matches.push({ line, context });
    }

    log(`search_file: Found ${matches.length} matches for '${search}'`);
    return {
        success: true,
        filepath,
        search,
        matches,
    };
}

const replaceInFile_spec = {
    type: 'function',
    function: {
        name: 'replaceInFile',
        description:
            'Replaces a specific substring within a given search context in a file, ensuring that the context appears only once.',
        parameters: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The relative path to the file where the replacement should occur.',
                },
                searchContext: {
                    type: 'string',
                    description:
                        'The surrounding context where the target substring is located. This should appear exactly once in the file.',
                },
                targetSubstring: {
                    type: 'string',
                    description: 'The exact substring within the search context that needs to be replaced.',
                },
                replacement: { type: 'string', description: 'The text that should replace the target substring.' },
            },
            required: ['filepath', 'searchContext', 'targetSubstring', 'replacement'],
        },
    },
};

async function replaceInFile({ filepath, searchContext, targetSubstring, replacement }) {
    log(`Replacing in "${filepath}`);
    log('searchContext\n', searchContext);
    log('targetSubstring\n', targetSubstring);
    log('replacement\n', replacement);
    const fullPath = resolve(workingDirectory, filepath);
    const fileContents = await fs.readFile(fullPath, 'utf8');

    // Ensure the searchContext appears only once in the fileContents.
    const occurrences = fileContents.match(new RegExp(escapeStringRegexp(searchContext), 'g')) || [];
    if (occurrences.length !== 1) {
        throw new Error('The search context must appear exactly once in the file, but found ' + occurrences.length);
    }

    // Replace targetSubstring with replacement within the searchContext.
    const updatedContext = searchContext.replace(targetSubstring, replacement);

    // Replace the old searchContext with the updatedContext in the fileContents.
    const updatedFileContents = fileContents.replace(searchContext, updatedContext);

    // Write the updated contents back to the file.
    await fs.writeFile(fullPath, updatedFileContents, 'utf8');

    return {
        success: true,
        filepath,
        searchContext,
        updatedContext,
        advice: `Check the updatedContext carefully and make sure it's exactly what we want, including formatting`,
    };
}

const restart_interface_spec = {
    type: 'function',
    function: {
        name: 'restart_interface',
        description: 'Restarts the interface, using the current state of tools and configurations.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
};

async function restart_interface() {
    console.log('UC called restart_interface()');
    process.exit(0);
}

// Exported tools and their corresponding functions
const tools = [
    { type: 'retrieval' },
    exec_shell_spec,
    write_file_spec,
    show_file_spec,
    get_summary_spec,
    search_file_spec,
    replaceInFile_spec,
    restart_interface_spec,
];

const toolsDict = { exec_shell, write_file, replaceInFile, show_file, get_summary, search_file, restart_interface };

export { tools, toolsDict };
