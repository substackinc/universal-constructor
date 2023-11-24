import Dialog from "./Dialog.js";
import dotenv from 'dotenv';
import readline from "readline";
dotenv.config();
let dialog;
let rl;

async function main() {

    dialog = new Dialog()

    dialog.on('message', handleMessage);
    dialog.on('thinking', handleThinking);
    dialog.on('done_thinking', handleDoneThinking);

    await dialog.setup();

    rl = await setupReadline({
        '/rs': () => process.exit(0),
        '/cancel': async () => await dialog.cancelOutstanding()
    });

    rl.prompt();
}

function setupReadline(commands) {
    let inputBuffer = [];
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
        terminal: true
    })

    async function submit() {
        let input = inputBuffer.join('\n');
        inputBuffer = [];
        rl.pause();
        await handleInput(input);
    }

    rl.on('line', async (line) => {
        if (line === '') {
            // two enters in a row
            await submit();
        } else if (line.endsWith('go')) {
            inputBuffer.push(line.slice(0, line.length-2));
            await submit();
        }
        else if (commands[line]) {
            await commands[line]();
        } else {
            inputBuffer.push(line)
            rl.prompt();
        }
    })

    rl.on('close', () => {
        console.log('Quitting.');
        process.exit(1);
    })

    return rl;
}

async function handleInput(input) {
    await dialog.processMessage(input);
    rl.prompt();
}

function handleMessage({role, content}) {
    console.log(`\n@${role}: ${content}`)
}

function handleThinking() {
    process.stdout.write('.');
}

function handleDoneThinking() {
    process.stdout.write('\n');
}

// run the main function
await main();
