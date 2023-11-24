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
    console.log(`${chalk.green(`\n @ ${role === 'user' ? process.env.USER : name}:`)}\n\n${content}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

let inputBuffer = [];
let isNewInput = true;
//let threadId = 'thread_GPUqnC19Ufur0g8gV0KcDeDq'; // Original
let threadId = 'thread_1F38P2VUG2fOZwqlSGeekcUh'; // Nov 23
let processingInput = false;
let lastKillTime = +new Date();

async function initializeAssistant() {
    if (!threadId) {
        const thread = await createThread();
        threadId = thread.id;
        console.log("Created new thread, id: ", threadId);
    } else {
        console.log("Reusing thread id:", threadId);
    }

    await cancelOutstandingRuns(threadId);
    await fetchMessages(threadId);
}

function displayPrompt(force = false) {
    if (isNewInput || force) {
        process.stdout.write(`${chalk.cyan(`\n @ ${process.env.USER}:\n> `)}`);
        isNewInput = false;
    }
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
    } else if (line === 'rs' || line === 'restart') {
        touchRestartFile();
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

function touchRestartFile() {
    fs.writeFileSync('.restart', `${new Date()}`);
}


// The main function that you want to execute only if the file is run standalone
async function main() {
    console.log('\x1b[32mUpdating assistant...\x1b[0m')
    let a = await updateAssistant();
    console.log(a.instructions);

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
