import Dialog from './dialog.js';
import dotenv from 'dotenv';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { unlinkSync } from 'fs';

marked.use(
    markedTerminal(
        {},
        {
            theme: 'tomorrow-night',
        }
    )
);

const chalk1 = chalk.cyan.bold;
const chalk2 = chalk.cyan.bold;

dotenv.config();
let dialog;
let rl;

async function main() {
    printWelcome();

    dialog = new Dialog();

    dialog.on('message', handleMessage);
    dialog.on('thinking', handleThinking);
    dialog.on('done_thinking', handleDoneThinking);

    await dialog.setup();

    rl = await setupReadline({
        '/quit': () => process.exit(1),
        '/reset': async () => {
            console.log('Resetting');
            unlinkSync('.thread');
            process.exit(0);
        },
        '/rs': () => process.exit(0),
        '/cancel': async () => await dialog.cancelOutstanding(),
    });

    prompt();
}

function setupReadline(commands) {
    let inputBuffer = [];
    let working = false;
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        terminal: true,
    });

    async function submit() {
        let input = inputBuffer.join('\n');
        inputBuffer = [];
        try {
            working = true;
            await handleInput(input);
        } finally {
            working = false;
        }
    }

    rl.on('line', async (line) => {
        if (line === '') {
            // two enters in a row
            await submit();
        } else if (line.endsWith('go')) {
            inputBuffer.push(line.slice(0, line.length - 2));
            await submit();
        } else if (commands[line]) {
            await commands[line]();
        } else {
            inputBuffer.push(line);
            rl.prompt();
        }
    });

    rl.on('close', () => {
        console.log('Quitting. (rl close)');
        process.exit(1);
    });

    let lastKillTime = +new Date();
    rl.on('SIGINT', async () => {
        let t = +new Date();
        if (t - lastKillTime < 1000) {
            // twice in rapid succession. Let's die for real.
            rl.close();
        } else {
            lastKillTime = t;
            if (working) {
                // we're in the middle of a run. Let's cancel it.
                console.log('\nCancelling... (ctrl-d quits)');
                await dialog.cancelOutstanding();
            } else {
                // otherwise lets exit cleanly so we can be restarted if appropriate
                console.log('\nRestarting... (ctrl-d quits)');
                process.exit(0);
            }
        }
    });

    return rl;
}

function prompt() {
    console.log(chalk1(`\n@${process.env.USER}:`));
    rl.prompt(true);
}

async function handleInput(input) {
    await dialog.processMessage(input);
    prompt();
}

function handleMessage({ role, content }) {
    let roleString;
    if (role === 'user') {
        roleString = chalk1(`\n@${process.env.USER}:`) + '\n';
    } else {
        roleString = chalk2(`\n@${dialog.assistant.name}:`) + '\n';
    }
    console.log(roleString + marked(content.trim()));
}

function handleThinking() {
    process.stdout.write('.');
}

function handleDoneThinking() {
    process.stdout.write('\n');
}

function printWelcome() {
    console.log('\n');
    console.log('╔═════════════════════════════════════════╗');
    console.log('║ Welcome to the Universal Constructor!   ║');
    console.log('║ ‾‾‾‾‾‾‾                                 ║');
    console.log('║ /rs restarts the repl                   ║');
    console.log('║ /cancel cancels any outstanding runs    ║');
    console.log('║ ctrl-c does both (hit it twice to quit) ║');
    console.log('║                                         ║');
    console.log('║ have fun <3                             ║');
    console.log('╚═════════════════════════════════════════╝');
}

// run the main function
await main();
