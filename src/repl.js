import Dialog from './dialog.js';
import dotenv from 'dotenv';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { unlinkSync } from 'fs';
import cliSpinners from 'cli-spinners';

marked.use(
    markedTerminal({
        width: process.stdout.columns - 1,
        reflowText: true,
        tab: 2,
    })
);

const chalk1 = chalk.cyan.bold
const chalk2 = chalk.hex('#fcad01').bold;

dotenv.config();
let dialog;
let rl;

async function main() {
    printWelcome();

    dialog = new Dialog();

    dialog.on('message', handleMessage);
    dialog.on('start_thinking', handleStartThinking);
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
    let markedContent = marked(content).trimEnd();
    console.log(roleString + markedContent);
}

let cancelSpinner;

function handleStartThinking() {
    let s = cliSpinners.dots3;
    let i = 0;
    let spinnerStart = +new Date();
    process.stdout.write('\n');
    let interval = setInterval(() => {
        process.stdout.write(chalk2(`\r ${s.frames[i++ % s.frames.length]} `));
    }, s.interval);

    cancelSpinner = () => {
        clearInterval(interval);
        let t = ((+new Date() - spinnerStart) / 1000).toFixed(0);
        process.stdout.write(`\r ${s.frames[i++ % s.frames.length]} ${t}s\n`);
    };
}

function handleDoneThinking() {
    cancelSpinner && cancelSpinner();
}

function printWelcome() {
    console.log('\n');
    console.log('╔═════════════════════════════════════════╗');
    console.log('║ Welcome to the Universal Constructor!   ║');
    console.log('║ ‾‾‾‾‾‾‾                                 ║');
    console.log('║ /rs restarts the repl                   ║');
    console.log('║ /cancel cancels any outstanding runs    ║');
    console.log('║ /reset gets you a fresh thread          ║');
    console.log('║ you gotta hit enter twice               ║');
    console.log('║                                         ║');
    console.log('║ have fun <3                             ║');
    console.log('╚═════════════════════════════════════════╝');
}

// run the main function
await main();
