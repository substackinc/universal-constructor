// repl.js
import readline from 'readline';
import {
    cancelOutstandingRuns,
    createThread,
    logNewMessages,
    sendMessageAndLogReply,
    updateAssistant
} from './assistant.js';
import fs from "fs";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

let inputBuffer = [];
let isNewInput = true;
let threadId = 'thread_GPUqnC19Ufur0g8gV0KcDeDq';

async function initializeAssistant() {
    if (!threadId) {
        const thread = await createThread();
        threadId = thread.id;
        console.log("Created new thread, id: ", threadId);
    } else {
        console.log("Reusing thread id:", threadId);
    }

    await cancelOutstandingRuns(threadId);

}

function displayPrompt(force = false) {
    if (isNewInput || force) {
        process.stdout.write('\n @ user:\n> ');
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
        await sendMessageAndLogReply(threadId, input);
    } catch (error) {
        console.error('oops!');
        console.error(error);
    }

}

function touchRestartFile() {
    fs.writeFileSync('.restart', `${new Date()}`);
}


// The main function that you want to execute only if the file is run standalone
async function main() {
    console.log("Updating assistant...")
    let a = await updateAssistant();
    console.log(a.instructions);

    await initializeAssistant();
    await logNewMessages(threadId);
    displayPrompt();
}

let ctrlCPressed = false;
process.on('SIGINT', () => {
    if (ctrlCPressed) {
        console.log('Second Ctrl-C detected, exiting.');
        process.exit(1); // Exit immediately.
    } else {
        console.log('Ctrl-C pressed, cancelling current operation...');
        cancelOutstandingRuns(threadId);

        ctrlCPressed = true;

        // Optionally, use a timer to reset the flag after some time has passed.
        setTimeout(() => ctrlCPressed = false, 2000); // 2 seconds to press again to exit
    }
});

main(); // Running the main function if this script is executed directly


