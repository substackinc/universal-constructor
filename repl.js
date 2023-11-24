// repl.js
import readline from 'readline';
import {
    cancelOutstandingRuns,
    createThread, fetchMessages,
    sendMessageAndLogReply,
    updateAssistant
} from './assistant.js';
import fs from "fs";
import chalk from 'chalk';
import { messageEventEmitter, name } from './assistant.js';

// Event Listener for messages
messageEventEmitter.on('message', ({ role, content }) => {
    if (role === 'user') {
        console.log(chalk.cyan(`\n@${process.env.USER}:`), `\n${content}`);
    } else {
        console.log(chalk.green(`\n@${name}:`), `\n${content}`);
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

let inputBuffer = [];
let isNewInput = true;
let threadId;

let processingInput = false;
let lastKillTime = +new Date();

async function initializeAssistant() {
    try {
        threadId = fs.readFileSync('.thread', 'utf8').trim();
    } catch (error) {
        if (error.code === 'ENOENT') console.log('.thread file does not exist.'); // File not found
        else console.error('Error reading .thread file:', error);
    }
    if (!threadId) {
        const thread = await createThread();
        threadId = thread.id;
        fs.writeFileSync('.thread', threadId);
        console.log("\nThis is the start of a brand new thread!")
    } else {
        console.log("\n...continuing from previous thread")
    }

    await cancelOutstandingRuns(threadId);
    await fetchMessages(threadId, 2);
}

function displayPrompt(force = false) {
    if (isNewInput || force) {
        process.stdout.write(chalk.cyan(`\n@${process.env.USER}:`) + `\n> `);
        isNewInput = false;
    }
}

function printWelcome() {
    console.log('\n');
    console.log("╔═════════════════════════════════════════╗")
    console.log("║ Welcome to the Universal Constructor!   ║")
    console.log("║ ‾‾‾‾‾‾‾                                 ║")
    console.log("║ /rs restarts the repl                   ║")
    console.log("║ /cancel cancels any outstanding runs    ║")
    console.log("║ ctrl-c does both (hit it twice to quit) ║")
    console.log("║                                         ║")
    console.log("║ have fun <3                             ║")
    console.log("╚═════════════════════════════════════════╝")
}

rl.on('line', async (line) => {
    if (line.trim() === '') {
        // User pressed enter on an empty line
        if (inputBuffer.length > 0) {
            // Two enters in a row - process the input
            await processInput(inputBuffer.join('\n'));
            inputBuffer = [];
            isNewInput = true;
            displayPrompt();
        } else {
            displayPrompt(true); // User pressed enter on an empty line twice, redisplay prompt
        }
    } else if (line === '/rs' || line === '/restart') {
        process.exit(0);
    } else if (line === '/cancel') {
        await cancelOutstandingRuns(threadId);
        displayPrompt();
    } else {
        // Add non-empty line to the buffer
        inputBuffer.push(line);
    }
}).on('close', () => {
    console.log('REPL closed.');
    process.exit(0);
});

async function processInput(input) {
    try {
        processingInput = true;
        await sendMessageAndLogReply(threadId, input);
    } catch (error) {
        console.error('oops!');
        console.error(error);
    } finally {
        processingInput = false;
    }
}

// The main function that you want to execute only if the file is run standalone
async function main() {
    printWelcome();
    console.log('Updating assistant...')
    await updateAssistant();
    await initializeAssistant();
    displayPrompt();
}

process.on('SIGINT', async () => {
    let t = +new Date();
    if (t-lastKillTime < 1500) {
        // twice in rapid succession. Let's die for real.
        console.log("Quitting");
        process.exit(1);
    }
    lastKillTime = t;
    if (processingInput) {
        // we're in the middle of a run. Let's cancel it.
        await cancelOutstandingRuns(threadId);
    } else {
        // otherwise lets exit cleanly so we can be restarted if appropriate
        process.exit(0);
    }
});

main(); // Running the main function if this script is executed directly
