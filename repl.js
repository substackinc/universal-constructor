import readline from 'readline';
import {createThread, sendMessageAndGetReply} from './assistant.js';

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

displayPrompt();

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
        const reply = await sendMessageAndGetReply(threadId, input);
        console.log(`# Computer\n${reply}`);
    } catch (error) {
        console.error('oops!');
        console.error(error);
    }

}

initializeAssistant();