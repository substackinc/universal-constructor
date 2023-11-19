import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

let inputBuffer = [];
let isNewInput = true;

function displayPrompt(force = false) {
    if (isNewInput || force) {
        process.stdout.write('\n# Human\n> ');
        isNewInput = false;
    }
}

displayPrompt();

rl.on('line', (line) => {
    if (line.trim() === '') {
        // User pressed enter on an empty line
        if (inputBuffer.length > 0) {
            // Two enters in a row - process the input
            processInput(inputBuffer.join('\n'));
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

function processInput(input) {
    console.log(`# Computer\nYou entered:\n${input}`);
    // Placeholder for further input processing logic
}
