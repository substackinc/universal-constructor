// repl.js
import readline from 'readline';
import {createThread, sendMessageAndLogReply, updateAssistant} from './assistant.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

let inputBuffer = [];
let isNewInput = true;
let threadId;

async function initializeAssistant() {
    const thread = await createThread();
    threadId = thread.id;
}

function displayPrompt(force = false) {
    if (isNewInput || force) {
        process.stdout.write('\n# Human\n> ');
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


// The main function that you want to execute only if the file is run standalone
async function main() {
    console.log("Updating assistant...")
    let a = await updateAssistant();
    console.log(a.instructions);

    displayPrompt();
    initializeAssistant();
}

main(); // Running the main function if this script is executed directly

let ctrlCPressed = false;

process.on('SIGINT', () => {
    if (ctrlCPressed) {
        console.log('Second Ctrl-C detected, exiting.');
        process.exit(1); // Exit immediately.
    } else {
        console.log('Ctrl-C pressed, interrupting current operation...');
        // Place logic here to interrupt ongoing operations, such as aborting a request
        ctrlCPressed = true;

        // Optionally, use a timer to reset the flag after some time has passed.
        setTimeout(() => ctrlCPressed = false, 2000); // 2 seconds to press again to exit
    }
});
